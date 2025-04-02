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

// Middleware to check if user is renter
const isRenter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!user || user.role !== 'renter') {
      res.status(403).json({ message: 'Only renters can perform this action' });
      return;
    }
    next();
  } catch (error) {
    console.error('Error checking role:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Middleware to check if user is lender
const isLender = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!user || user.role !== 'lender') {
      res.status(403).json({ message: 'Only lenders can perform this action' });
      return;
    }
    next();
  } catch (error) {
    console.error('Error checking role:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create loan request
// @ts-ignore
router.post('/request', authenticate, isRenter, async (req: Request, res: Response) => {
  try {
    const { rentalAgreementAddress, amount, duration } = req.body;
    
    if (!rentalAgreementAddress || !amount || !duration) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Find the requester (renter)
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

// Get all loan requests (for lenders)
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

// Create loan offer (lender)
// @ts-ignore
router.post('/offer', authenticate, isLender, async (req: Request, res: Response) => {
  try {
    const { loanRequestId, interestRate, duration, graceMonths } = req.body;
    
    if (!loanRequestId || !interestRate || !duration || !graceMonths) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Find the lender
    const lender = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!lender) {
      return res.status(404).json({ message: 'Lender not found' });
    }
    
    // Find the loan request
    const loanRequest = await LoanRequest.findByPk(loanRequestId, {
      include: [{ model: RentalAgreement }]
    });
    
    if (!loanRequest) {
      return res.status(404).json({ message: 'Loan request not found' });
    }
    
    // Check if the loan request is open
    if (loanRequest.status !== LoanRequestStatus.OPEN) {
      return res.status(400).json({ message: 'Loan request is not open' });
    }
    
    // Create the loan offer in the database
    const loanOffer = await LoanOffer.create({
      loanRequestId: loanRequest.id,
      lenderId: lender.id,
      interestRate,
      duration,
      graceMonths,
      status: LoanOfferStatus.PENDING
    });
    
    res.status(201).json({
      message: 'Loan offer created successfully',
      loanOffer: {
        id: loanOffer.id,
        loanRequestId: loanOffer.loanRequestId,
        interestRate: loanOffer.interestRate,
        duration: loanOffer.duration,
        graceMonths: loanOffer.graceMonths,
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

// Get all loan offers for the user
// @ts-ignore
router.get('/offers', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    let loanOffers;
    
    if (user.role === 'lender') {
      // Get all offers made by this lender
      loanOffers = await LoanOffer.findAll({
        where: { lenderId: user.id },
        include: [
          { 
            model: LoanRequest,
            include: [
              { model: RentalAgreement },
              { model: User, as: 'requester', attributes: ['id', 'email', 'walletAddress'] }
            ]
          }
        ]
      });
    } else if (user.role === 'renter') {
      // Get all offers for loan requests made by this renter
      const loanRequests = await LoanRequest.findAll({
        where: { requesterId: user.id }
      });
      
      const requestIds = loanRequests.map(request => request.id);
      
      loanOffers = await LoanOffer.findAll({
        where: { loanRequestId: requestIds },
        include: [
          { 
            model: LoanRequest,
            include: [
              { model: RentalAgreement },
              { model: User, as: 'requester', attributes: ['id', 'email', 'walletAddress'] }
            ]
          },
          { model: User, as: 'lender', attributes: ['id', 'email', 'walletAddress'] }
        ]
      });
    } else {
      return res.status(403).json({ message: 'Only lenders and renters can view loan offers' });
    }
    
    res.json({ loanOffers });
  } catch (error) {
    console.error('Error retrieving loan offers:', error);
    res.status(500).json({
      message: 'Failed to retrieve loan offers',
      error: (error as Error).message
    });
  }
});

// Accept loan offer (renter)
// @ts-ignore
router.post('/offer/:id/accept', authenticate, isRenter, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
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
            { model: User, as: 'requester', attributes: ['id', 'email', 'walletAddress'] }
          ]
        },
        { model: User, as: 'lender', attributes: ['id', 'email', 'walletAddress'] }
      ]
    });
    
    if (!loanOffer) {
      return res.status(404).json({ message: 'Loan offer not found' });
    }
    
    // Check if the user is the requester for this loan request
    if (loanOffer.loanRequest.requesterId !== user.id) {
      return res.status(403).json({ message: 'Only the requester can accept this loan offer' });
    }
    
    // Check if the loan offer is pending
    if (loanOffer.status !== LoanOfferStatus.PENDING) {
      return res.status(400).json({ message: 'Loan offer is not pending' });
    }
    
    // Check if the loan request is still open
    if (loanOffer.loanRequest.status !== LoanRequestStatus.OPEN) {
      return res.status(400).json({ message: 'Loan request is no longer open' });
    }
    
    // Create the loan agreement on the blockchain
    const result = await blockchainService.createLoanAgreement(
      loanOffer.lender.walletAddress,
      user.walletAddress,
      loanOffer.loanRequest.rentalAgreement.contractAddress,
      loanOffer.loanRequest.amount.toString(),
      loanOffer.interestRate,
      loanOffer.duration,
      loanOffer.graceMonths
    );
    
    // Create the loan agreement in the database
    const loanAgreement = await LoanAgreement.create({
      contractAddress: result.contractAddress,
      loanRequestId: loanOffer.loanRequest.id,
      borrowerId: user.id,
      lenderId: loanOffer.lenderId,
      amount: loanOffer.loanRequest.amount,
      interestRate: loanOffer.interestRate,
      duration: loanOffer.duration,
      graceMonths: loanOffer.graceMonths,
      status: LoanAgreementStatus.CREATED,
      startDate: null
    });
    
    // Update the loan offer status
    await loanOffer.update({ status: LoanOfferStatus.ACCEPTED });
    
    // Update the loan request status
    await loanOffer.loanRequest.update({ status: LoanRequestStatus.MATCHED });
    
    // Reject all other offers for this loan request
    await LoanOffer.update(
      { status: LoanOfferStatus.REJECTED },
      { 
        where: { 
          loanRequestId: loanOffer.loanRequest.id,
          id: { [Op.ne]: loanOffer.id } // Op.ne -> not equal
        }
      }
    );
    
    res.json({
      message: 'Loan offer accepted and loan agreement created successfully',
      loanAgreement: {
        id: loanAgreement.id,
        contractAddress: loanAgreement.contractAddress,
        status: loanAgreement.status,
        transactionHash: result.transactionHash
      }
    });
  } catch (error) {
    console.error('Error accepting loan offer:', error);
    res.status(500).json({
      message: 'Failed to accept loan offer',
      error: (error as Error).message
    });
  }
});

// Withdraw loan offer
// @ts-ignore
router.post('/offer/:id/withdraw', authenticate, isLender, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find the loan offer
    const loanOffer = await LoanOffer.findByPk(id, {
      include: [
        { model: LoanRequest },
        { model: User, as: 'lender', attributes: ['id', 'email', 'walletAddress'] }
      ]
    });
    
    if (!loanOffer) {
      return res.status(404).json({ message: 'Loan offer not found' });
    }
    
    // Check if the user is the lender for this offer
    if (loanOffer.lenderId !== user.id) {
      return res.status(403).json({ message: 'Only the lender can withdraw this offer' });
    }
    
    // Check if the offer is in a state that allows withdrawal
    if (loanOffer.status === LoanOfferStatus.ACCEPTED) {
      return res.status(400).json({ message: 'Cannot withdraw an accepted offer' });
    }
    
    if (loanOffer.status === LoanOfferStatus.WITHDRAWN) {
      return res.status(400).json({ message: 'Offer is already withdrawn' });
    }
    
    // Update the offer status to withdrawn
    await loanOffer.update({ status: LoanOfferStatus.WITHDRAWN });
    
    res.json({
      message: 'Loan offer withdrawn successfully',
      offerId: loanOffer.id,
      status: loanOffer.status
    });
  } catch (error) {
    console.error('Error withdrawing loan offer:', error);
    res.status(500).json({
      message: 'Failed to withdraw loan offer',
      error: (error as Error).message
    });
  }
});

// Get loan agreement details
// @ts-ignore
router.get('/:address', authenticate, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find the loan agreement in the database
    const loanAgreement = await LoanAgreement.findOne({
      where: { contractAddress: address },
      include: [
        { 
          model: LoanRequest,
          include: [
            { model: RentalAgreement }
          ]
        },
        { model: User, as: 'borrower', attributes: ['id', 'email', 'walletAddress'] },
        { model: User, as: 'lender', attributes: ['id', 'email', 'walletAddress'] }
      ]
    });
    
    if (!loanAgreement) {
      return res.status(404).json({ message: 'Loan agreement not found' });
    }
    
    // Check if the user is associated with this agreement
    if (loanAgreement.borrowerId !== user.id && loanAgreement.lenderId !== user.id) {
      return res.status(403).json({ message: 'You are not authorized to view this agreement' });
    }
    
    // Get on-chain data
    const onChainDetails = await blockchainService.getLoanAgreementDetails(address);
    
    // Get repayment schedule
    const repaymentSchedule = await blockchainService.getRepaymentSchedule(address);
    
    // Get payment history
    const payments = await Payment.findAll({
      where: { loanAgreementId: loanAgreement.id },
      include: [
        { model: User, as: 'payer', attributes: ['id', 'email', 'walletAddress'] },
        { model: User, as: 'recipient', attributes: ['id', 'email', 'walletAddress'] }
      ],
      order: [['paymentDate', 'DESC']]
    });
    
    res.json({
      loanAgreement: {
        ...loanAgreement.toJSON(),
        onChain: onChainDetails
      },
      repaymentSchedule,
      payments
    });
  } catch (error) {
    console.error('Error retrieving loan agreement:', error);
    res.status(500).json({
      message: 'Failed to retrieve loan agreement',
      error: (error as Error).message
    });
  }
});

// Initialize loan (lender transfers funds to borrower)
// @ts-ignore
router.post('/:address/initialize', authenticate, isLender, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { amount } = req.body;
    
    if (!amount) {
      return res.status(400).json({ message: 'Loan amount is required' });
    }
    
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find the loan agreement
    const loanAgreement = await LoanAgreement.findOne({
      where: { contractAddress: address },
      include: [
        { 
          model: User, 
          as: 'borrower', 
          attributes: ['id', 'email', 'walletAddress'] 
        },
        { 
          model: User, 
          as: 'lender', 
          attributes: ['id', 'email', 'walletAddress'] 
        }
      ]
    });
    
    if (!loanAgreement) {
      return res.status(404).json({ message: 'Loan agreement not found' });
    }
    
    // Check if the user is the lender for this agreement
    if (loanAgreement.lenderId !== user.id) {
      return res.status(403).json({ message: 'Only the lender can initialize this loan' });
    }
    
    // Check if the loan agreement is in CREATED state
    if (loanAgreement.status !== LoanAgreementStatus.CREATED) {
      return res.status(400).json({ message: 'Loan agreement is not in the correct state for initialization' });
    }
    
    // Verify the amount matches the loan agreement
    if (parseFloat(loanAgreement.amount.toString()) !== parseFloat(amount)) {
      return res.status(400).json({ 
        message: 'Amount does not match the loan agreement',
        expected: loanAgreement.amount,
        provided: amount
      });
    }
    
    // Initialize the loan on the blockchain (transfer funds to borrower)
    const result = await blockchainService.initializeLoan(
      address,
      user.walletAddress,
      amount.toString()
    );
    
    // Update loan agreement status
    await loanAgreement.update({ 
      status: LoanAgreementStatus.ACTIVE,
      startDate: new Date()
    });
    
    // Record the payment
    await Payment.create({
      loanAgreementId: loanAgreement.id,
      payerId: user.id,
      recipientId: loanAgreement.borrowerId,
      amount,
      txHash: result.transactionHash,
      type: PaymentType.LOAN_INITIALIZATION,
      paymentDate: new Date()
    });
    
    res.json({
      message: 'Loan initialized successfully',
      transactionHash: result.transactionHash,
      status: loanAgreement.status
    });
  } catch (error) {
    console.error('Error initializing loan:', error);
    res.status(500).json({
      message: 'Failed to initialize loan',
      error: (error as Error).message
    });
  }
});

// Make a loan repayment
// @ts-ignore
router.post('/:address/repay', authenticate, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { amount, month } = req.body;
    
    if (!amount) {
      return res.status(400).json({ message: 'Repayment amount is required' });
    }
    
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find the loan agreement
    const loanAgreement = await LoanAgreement.findOne({
      where: { contractAddress: address },
      include: [
        { 
          model: User, 
          as: 'borrower', 
          attributes: ['id', 'email', 'walletAddress'] 
        },
        { 
          model: User, 
          as: 'lender', 
          attributes: ['id', 'email', 'walletAddress'] 
        }
      ]
    });
    
    if (!loanAgreement) {
      return res.status(404).json({ message: 'Loan agreement not found' });
    }
    
    // Check if the user is the borrower for this agreement
    if (loanAgreement.borrowerId !== user.id) {
      return res.status(403).json({ message: 'Only the borrower can make repayments on this loan' });
    }
    
    // Check if the loan agreement is in ACTIVE state
    if (loanAgreement.status !== LoanAgreementStatus.ACTIVE) {
      return res.status(400).json({ message: 'Cannot make repayment - loan is not active' });
    }
    
    // Get on-chain loan details to verify payment amount and month
    const onChainDetails = await blockchainService.getLoanAgreementDetails(address);
    
    // For monthly payments, verify the month and amount
    let paymentMonth = null;
    if (month !== undefined) {
      paymentMonth = parseInt(month);
      
      // Verify the month is valid
      const lastPaidMonth = parseInt(onChainDetails.lastPaidMonth.toString());
      if (paymentMonth <= lastPaidMonth) {
        return res.status(400).json({ 
          message: 'Cannot make payment for a month that is already paid',
          lastPaidMonth
        });
      }
      
      if (paymentMonth > lastPaidMonth + 1) {
        return res.status(400).json({ 
          message: 'Cannot make payment for a future month',
          currentMonth: lastPaidMonth + 1
        });
      }
      
      // Check if the amount matches the monthly installment
      if (parseFloat(amount) !== parseFloat(onChainDetails.monthlyPayment)) {
        return res.status(400).json({ 
          message: 'Amount does not match the monthly installment',
          expected: onChainDetails.monthlyPayment,
          provided: amount
        });
      }
    } else {
      // Full or partial repayment - calculate remaining balance
      const totalDue = calculateRemainingBalance(onChainDetails);
      
      if (parseFloat(amount) > totalDue) {
        return res.status(400).json({ 
          message: 'Amount exceeds the remaining balance',
          remainingBalance: totalDue,
          provided: amount
        });
      }
    }
    
    // Make the repayment on the blockchain
    const result = await blockchainService.makeRepayment(
      address,
      user.walletAddress,
      paymentMonth !== null ? paymentMonth : 0,
      amount.toString()
    );
    
    // Record the payment
    const payment = await Payment.create({
      loanAgreementId: loanAgreement.id,
      payerId: user.id,
      recipientId: loanAgreement.lenderId,
      amount,
      txHash: result.transactionHash,
      type: PaymentType.LOAN_REPAYMENT,
      month: paymentMonth,
      paymentDate: new Date()
    });
    
    // Check if the loan is now fully paid
    const updatedDetails = await blockchainService.getLoanAgreementDetails(address);
    const isFullyPaid = parseInt(updatedDetails.lastPaidMonth.toString()) >= parseInt(updatedDetails.duration.toString()) - 1;
    
    if (isFullyPaid) {
      await loanAgreement.update({ 
        status: LoanAgreementStatus.CLOSED
      });
    }
    
    res.json({
      message: 'Loan repayment successful',
      payment: {
        id: payment.id,
        amount: payment.amount,
        month: payment.month,
        transactionHash: payment.txHash
      },
      loanStatus: loanAgreement.status
    });
  } catch (error) {
    console.error('Error making loan repayment:', error);
    res.status(500).json({
      message: 'Failed to make loan repayment',
      error: (error as Error).message
    });
  }
});

// Helper function to calculate remaining balance
function calculateRemainingBalance(loanDetails: any): number {
  const loanAmount = parseFloat(loanDetails.loanAmount);
  const monthlyPayment = parseFloat(loanDetails.monthlyPayment);
  const duration = parseInt(loanDetails.duration.toString());
  const lastPaidMonth = parseInt(loanDetails.lastPaidMonth.toString());
  
  const remainingMonths = duration - lastPaidMonth - 1;
  return monthlyPayment * remainingMonths;
}

export default router; 