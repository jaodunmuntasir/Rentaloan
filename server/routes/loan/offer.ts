import express, { Request, Response } from 'express';
import { Op } from 'sequelize';
import { authenticate } from '../../middleware/auth';
import { User } from '../../models/user.model';
import { RentalAgreement } from '../../models/rental-agreement.model';
import { LoanRequest, LoanRequestStatus } from '../../models/loan-request.model';
import { LoanOffer, LoanOfferStatus } from '../../models/loan-offer.model';
import { LoanAgreement, LoanAgreementStatus } from '../../models/loan-agreement.model';
import { Payment, PaymentType } from '../../models/payment.model';

const router = express.Router();

// Create loan offer
// @ts-ignore
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    // Ensure user is defined
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        message: "Unauthorized" 
      });
      return;
    }

    console.log('----------------------');
    console.log('POST /loan/offer - Raw request body:', req.body);
    console.log('POST /loan/offer - Request user:', req.user);
    console.log('----------------------');

    const { loanRequestId, interestRate, duration, graceMonths, amount } = req.body;

    // Validate required parameters
    if (!loanRequestId) {
      res.status(400).json({ 
        success: false, 
        message: "Loan request ID is required" 
      });
      return;
    }

    if (!interestRate) {
      res.status(400).json({ 
        success: false, 
        message: "Interest rate is required" 
      });
      return;
    }

    if (!duration) {
      res.status(400).json({ 
        success: false, 
        message: "Duration is required" 
      });
      return;
    }

    if (!graceMonths) {
      res.status(400).json({ 
        success: false, 
        message: "Grace months is required" 
      });
      return;
    }

    // Find lender
    const lender = await User.findOne({ where: { firebaseId: req.user.uid } });
    if (!lender) {
      res.status(404).json({ 
        success: false, 
        message: "Lender not found" 
      });
      return;
    }

    // Find loan request
    const loanRequest = await LoanRequest.findByPk(loanRequestId, {
      include: [
        { model: RentalAgreement },
        { model: User, as: 'requester' }
      ]
    });

    if (!loanRequest) {
      res.status(404).json({ 
        success: false, 
        message: "Loan request not found" 
      });
      return;
    }

    // Check if loan request is still open
    if (loanRequest.status !== LoanRequestStatus.OPEN) {
      res.status(400).json({ 
        success: false, 
        message: "Loan request is no longer open" 
      });
      return;
    }

    // Create offer
    const loanOffer = await LoanOffer.create({
      loanRequestId: loanRequest.id,
      lenderId: lender.id,
      interestRate: interestRate,
      duration: duration,
      graceMonths: graceMonths,
      amount: amount || loanRequest.amount, // Use the provided amount or fall back to the request amount
      status: LoanOfferStatus.PENDING
    });

    const completeOffer = await LoanOffer.findByPk(loanOffer.id, {
      include: [
        { 
          model: LoanRequest,
          include: [
            { model: RentalAgreement },
            { model: User, as: 'requester' }
          ]
        },
        { model: User, as: 'lender' }
      ]
    });

    console.log('Created loan offer:', {
      id: loanOffer.id,
      lenderId: loanOffer.lenderId,
      lenderFirebaseId: lender.firebaseId,
      loanRequestId: loanOffer.loanRequestId,
      status: loanOffer.status
    });

    res.status(201).json({
      success: true,
      message: "Loan offer created successfully",
      loanOffer: completeOffer
    });
  } catch (error) {
    console.error("Error creating loan offer:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to create loan offer", 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Accept loan offer
// @ts-ignore
router.post('/:id/accept', authenticate, async (req: Request, res: Response) => {
  try {
    // Ensure user is defined
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        message: "Unauthorized" 
      });
      return;
    }

    const { id } = req.params;

    // Validate offer ID
    if (!id || isNaN(parseInt(id))) {
      res.status(400).json({ 
        success: false, 
        message: "Invalid offer ID" 
      });
      return;
    }

    // Find borrower
    const borrower = await User.findOne({ where: { firebaseId: req.user.uid } });
    if (!borrower) {
      res.status(404).json({ 
        success: false, 
        message: "Borrower not found" 
      });
      return;
    }

    // Find offer with related data
    const loanOffer = await LoanOffer.findByPk(id, {
      include: [
        { 
          model: LoanRequest,
          include: [
            { model: RentalAgreement },
            { model: User, as: 'requester' }
          ]
        },
        { model: User, as: 'lender' }
      ]
    });

    if (!loanOffer) {
      res.status(404).json({ 
        success: false, 
        message: "Loan offer not found" 
      });
      return;
    }

    // Check if offer is still pending
    if (loanOffer.status !== LoanOfferStatus.PENDING) {
      res.status(400).json({ 
        success: false, 
        message: "Loan offer is no longer pending" 
      });
      return;
    }

    // Check if user is the borrower
    if (loanOffer.loanRequest?.requesterId !== borrower.id) {
      res.status(403).json({ 
        success: false, 
        message: "You don't have permission to accept this offer" 
      });
      return;
    }

    // Update offer status
    await loanOffer.update({ status: LoanOfferStatus.ACCEPTED });

    // Update other offers for this request to REJECTED
    await LoanOffer.update(
      { status: LoanOfferStatus.REJECTED },
      { 
        where: { 
          loanRequestId: loanOffer.loanRequestId,
          id: { [Op.ne]: loanOffer.id },
          status: LoanOfferStatus.PENDING
        } 
      }
    );

    // Update loan request status
    await LoanRequest.update(
      { status: LoanRequestStatus.MATCHED },
      { where: { id: loanOffer.loanRequestId } }
    );

    // Get updated offer
    const updatedOffer = await LoanOffer.findByPk(id, {
      include: [
        { 
          model: LoanRequest,
          include: [
            { model: RentalAgreement },
            { model: User, as: 'requester' }
          ]
        },
        { model: User, as: 'lender' }
      ]
    });

    console.log('Accepted loan offer:', {
      id: loanOffer.id,
      loanRequestId: loanOffer.loanRequestId,
      lenderId: loanOffer.lenderId,
      borrowerId: borrower.id
    });

    res.json({
      success: true,
      message: "Loan offer accepted successfully",
      loanOffer: updatedOffer
    });
  } catch (error) {
    console.error("Error accepting loan offer:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to accept loan offer", 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Get my loan offers
// @ts-ignore
router.get('/my', authenticate, async (req: Request, res: Response) => {
  try {
    console.log('GET /loan/myoffers - Authenticated user ID:', req.user?.uid);
    
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!user) {
      console.log('User not found with Firebase ID:', req.user?.uid);
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('Found user in database:', user.id, user.email);
    
    // Get all loan offers created by the current user
    const loanOffers = await LoanOffer.findAll({
      where: {
        lenderId: user.id
      },
      include: [
        { 
          model: LoanRequest,
          include: [
            { 
              model: RentalAgreement,
              include: [
                { model: User, as: 'landlord', attributes: ['id', 'email', 'walletAddress', 'firebaseId'] },
                { model: User, as: 'renter', attributes: ['id', 'email', 'walletAddress', 'firebaseId'] }
              ]
            },
            { model: User, as: 'requester', attributes: ['id', 'email', 'walletAddress', 'firebaseId'] }
          ]
        },
        { model: User, as: 'lender', attributes: ['id', 'email', 'walletAddress', 'firebaseId'] }
      ]
    });
    
    res.json({ 
      success: true,
      loanOffers
    });
  } catch (error) {
    console.error('Error retrieving loan offers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve loan offers',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router; 