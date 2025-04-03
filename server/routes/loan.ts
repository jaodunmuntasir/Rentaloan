import express, { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { authenticate } from '../middleware/auth';
import { User } from '../models/user.model';
import { RentalAgreement, RentalAgreementStatus } from '../models/rental-agreement.model';
import { LoanRequest, LoanRequestStatus } from '../models/loan-request.model';
import { LoanOffer, LoanOfferStatus } from '../models/loan-offer.model';
import { LoanAgreement, LoanAgreementStatus } from '../models/loan-agreement.model';
import { Payment, PaymentType } from '../models/payment.model';
import blockchainService from '../services/blockchain.service';

const router = express.Router();

// Create loan request
// @ts-ignore
router.post('/request', authenticate, async (req: Request, res: Response) => {
  try {
    const { rentalAgreementAddress, amount, duration } = req.body;
    
    if (!rentalAgreementAddress || !amount || !duration) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Find the requester
    const requester = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!requester) {
      return res.status(404).json({ message: 'Requester not found' });
    }
    
    // Find the rental agreement
    const rentalAgreement = await RentalAgreement.findOne({ 
      where: { contractAddress: rentalAgreementAddress } 
    });
    
    if (!rentalAgreement) {
      return res.status(404).json({ message: 'Rental agreement not found' });
    }
    
    // Check if the requester is the renter for this agreement
    if (rentalAgreement.renterId !== requester.id) {
      return res.status(403).json({ message: 'Only the renter can request a loan for this agreement' });
    }
    
    // Check if the rental agreement is in ACTIVE state
    if (rentalAgreement.status !== RentalAgreementStatus.ACTIVE) {
      return res.status(400).json({ message: 'Rental agreement is not active' });
    }
    
    // Check if there's enough collateral available
    const availableCollateral = await blockchainService.getAvailableCollateral(rentalAgreementAddress);
    if (parseFloat(availableCollateral) < amount) {
      return res.status(400).json({ 
        message: 'Insufficient collateral available',
        available: availableCollateral,
        requested: amount
      });
    }
    
    // Create the loan request in the database
    const loanRequest = await LoanRequest.create({
      rentalAgreementId: rentalAgreement.id,
      requesterId: requester.id,
      amount,
      duration,
      status: LoanRequestStatus.OPEN
    });
    
    res.status(201).json({
      message: 'Loan request created successfully',
      loanRequest: {
        id: loanRequest.id,
        rentalAgreementId: loanRequest.rentalAgreementId,
        amount: loanRequest.amount,
        duration: loanRequest.duration,
        status: loanRequest.status
      }
    });
  } catch (error) {
    console.error('Error creating loan request:', error);
    res.status(500).json({
      message: 'Failed to create loan request',
      error: (error as Error).message
    });
  }
});

// Get all loan requests
// @ts-ignore
router.get('/requests', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get all open loan requests
    const loanRequests = await LoanRequest.findAll({
      where: { status: LoanRequestStatus.OPEN },
      include: [
        { 
          model: RentalAgreement,
          include: [
            { model: User, as: 'landlord', attributes: ['id', 'email', 'walletAddress'] },
            { model: User, as: 'renter', attributes: ['id', 'email', 'walletAddress'] }
          ]
        },
        { model: User, as: 'requester', attributes: ['id', 'email', 'walletAddress'] }
      ]
    });
    
    res.json({ loanRequests });
  } catch (error) {
    console.error('Error retrieving loan requests:', error);
    res.status(500).json({
      message: 'Failed to retrieve loan requests',
      error: (error as Error).message
    });
  }
});

// Get specific loan request
// @ts-ignore
router.get('/requests/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find the loan request
    const loanRequest = await LoanRequest.findByPk(id, {
      include: [
        { 
          model: RentalAgreement,
          include: [
            { model: User, as: 'landlord', attributes: ['id', 'email', 'walletAddress'] },
            { model: User, as: 'renter', attributes: ['id', 'email', 'walletAddress'] }
          ]
        },
        { model: User, as: 'requester', attributes: ['id', 'email', 'walletAddress'] }
      ]
    });
    
    if (!loanRequest) {
      return res.status(404).json({ message: 'Loan request not found' });
    }
    
    // Get loan offers for this request
    const loanOffers = await LoanOffer.findAll({
      where: { loanRequestId: loanRequest.id },
      include: [
        { model: User, as: 'lender', attributes: ['id', 'email', 'walletAddress'] }
      ]
    });
    
    // Get available collateral for the rental agreement
    const availableCollateral = await blockchainService.getAvailableCollateral(
      loanRequest.rentalAgreement.contractAddress
    );
    
    res.json({
      loanRequest,
      loanOffers,
      availableCollateral
    });
  } catch (error) {
    console.error('Error retrieving loan request:', error);
    res.status(500).json({
      message: 'Failed to retrieve loan request',
      error: (error as Error).message
    });
  }
});

// Create loan offer
// @ts-ignore
router.post('/offer', authenticate, async (req: Request, res: Response) => {
  try {
    const { loanRequestId, interestRate, expirationDays } = req.body;
    
    if (!loanRequestId || !interestRate || !expirationDays) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Find the lender
    const lender = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!lender) {
      return res.status(404).json({ message: 'Lender not found' });
    }
    
    // Find the loan request
    const loanRequest = await LoanRequest.findByPk(loanRequestId, {
      include: [
        { model: RentalAgreement },
        { model: User, as: 'requester' }
      ]
    });
    
    if (!loanRequest) {
      return res.status(404).json({ message: 'Loan request not found' });
    }
    
    // Check if the loan request is still open
    if (loanRequest.status !== LoanRequestStatus.OPEN) {
      return res.status(400).json({ message: 'Loan request is no longer open' });
    }
    
    // Calculate expiration date
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + expirationDays);
    
    // Create the loan offer
    const loanOffer = await LoanOffer.create({
      loanRequestId: loanRequest.id,
      lenderId: lender.id,
      interestRate,
      expirationDate,
      status: LoanOfferStatus.PENDING
    });
    
    res.status(201).json({
      message: 'Loan offer created successfully',
      loanOffer: {
        id: loanOffer.id,
        loanRequestId: loanOffer.loanRequestId,
        interestRate: loanOffer.interestRate,
        expirationDate: loanOffer.expirationDate,
        status: loanOffer.status
      }
    });
  } catch (error) {
    console.error('Error creating loan offer:', error);
    res.status(500).json({
      message: 'Failed to create loan offer',
      error: (error as Error).message
    });
  }
});

// Accept loan offer (only renter/requester can accept)
// @ts-ignore
router.post('/offer/:id/accept', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Find the user
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find the loan offer
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
      return res.status(404).json({ message: 'Loan offer not found' });
    }
    
    // Check if the user is the requester of the loan
    if (loanOffer.loanRequest.requesterId !== user.id) {
      return res.status(403).json({ message: 'Only the loan requester can accept this offer' });
    }
    
    // Check if the loan offer is still pending
    if (loanOffer.status !== LoanOfferStatus.PENDING) {
      return res.status(400).json({ message: 'Loan offer is no longer pending' });
    }
    
    // Check if the loan request is still open
    if (loanOffer.loanRequest.status !== LoanRequestStatus.OPEN) {
      return res.status(400).json({ message: 'Loan request is no longer open' });
    }
    
    // Check if the rental agreement is in ACTIVE state
    if (loanOffer.loanRequest.rentalAgreement.status !== RentalAgreementStatus.ACTIVE) {
      return res.status(400).json({ message: 'Rental agreement is no longer active' });
    }
    
    // Check if there's enough collateral available
    const availableCollateral = await blockchainService.getAvailableCollateral(
      loanOffer.loanRequest.rentalAgreement.contractAddress
    );
    
    if (parseFloat(availableCollateral) < loanOffer.loanRequest.amount) {
      return res.status(400).json({ 
        message: 'Insufficient collateral available',
        available: availableCollateral,
        requested: loanOffer.loanRequest.amount
      });
    }
    
    // Update loan request status to FULFILLED
    await loanOffer.loanRequest.update({ status: LoanRequestStatus.FULFILLED });
    
    // Update loan offer status to ACCEPTED
    await loanOffer.update({ status: LoanOfferStatus.ACCEPTED });
    
    // Reject all other offers for this request
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
    
    // Create loan agreement
    const loanAgreement = await LoanAgreement.create({
      loanRequestId: loanOffer.loanRequestId,
      loanOfferId: loanOffer.id,
      borrowerId: loanOffer.loanRequest.requesterId,
      lenderId: loanOffer.lenderId,
      rentalAgreementId: loanOffer.loanRequest.rentalAgreementId,
      amount: loanOffer.loanRequest.amount,
      interestRate: loanOffer.interestRate,
      duration: loanOffer.loanRequest.duration,
      createdDate: new Date(),
      status: LoanAgreementStatus.PENDING,
      remainingBalance: loanOffer.loanRequest.amount
    });
    
    // Create the loan on the blockchain
    try {
      const contractAddress = await blockchainService.createLoan(
        loanOffer.loanRequest.rentalAgreement.contractAddress,
        loanOffer.lender.walletAddress,
        loanOffer.loanRequest.amount,
        loanOffer.interestRate,
        loanOffer.loanRequest.duration
      );
      
      // Update loan agreement with contract address
      await loanAgreement.update({
        contractAddress,
        status: LoanAgreementStatus.ACTIVE
      });
      
      res.json({
        message: 'Loan offer accepted and agreement created',
        loanAgreement: {
          id: loanAgreement.id,
          contractAddress,
          amount: loanAgreement.amount,
          interestRate: loanAgreement.interestRate,
          duration: loanAgreement.duration,
          status: loanAgreement.status
        }
      });
    } catch (blockchainError) {
      // If blockchain operation fails, revert database changes
      await loanAgreement.update({ status: LoanAgreementStatus.FAILED });
      await loanOffer.update({ status: LoanOfferStatus.PENDING });
      await loanOffer.loanRequest.update({ status: LoanRequestStatus.OPEN });
      
      console.error('Blockchain error creating loan:', blockchainError);
      res.status(500).json({
        message: 'Failed to create loan on blockchain',
        error: (blockchainError as Error).message
      });
    }
  } catch (error) {
    console.error('Error accepting loan offer:', error);
    res.status(500).json({
      message: 'Failed to accept loan offer',
      error: (error as Error).message
    });
  }
});

export default router; 