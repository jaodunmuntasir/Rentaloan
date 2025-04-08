import express, { Request, Response } from 'express';
import { Op } from 'sequelize';
import { authenticate } from '../../middleware/auth';
import { User } from '../../models/user.model';
import { RentalAgreement } from '../../models/rental-agreement.model';
import { LoanRequest, LoanRequestStatus } from '../../models/loan-request.model';
import { LoanOffer, LoanOfferStatus } from '../../models/loan-offer.model';
import { LoanAgreement, LoanAgreementStatus } from '../../models/loan-agreement.model';
import { Payment, PaymentType } from '../../models/payment.model';
import * as BlockchainService from '../../services/blockchain.service';
import { convertBigIntToString } from './utils';

const router = express.Router();

// Register loan agreement
// @ts-ignore
router.post('/register', authenticate, async (req: Request, res: Response) => {
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
    console.log('POST /loan/agreement/register - Raw request body:', req.body);
    console.log('POST /loan/agreement/register - Request user:', req.user);
    console.log('----------------------');

    const { contractAddress, loanOfferId } = req.body;

    // Validate required parameters
    if (!contractAddress || !contractAddress.startsWith('0x')) {
      res.status(400).json({ 
        success: false, 
        message: "Valid contract address is required" 
      });
      return;
    }

    if (!loanOfferId) {
      res.status(400).json({ 
        success: false, 
        message: "Loan offer ID is required" 
      });
      return;
    }

    // Find user
    const user = await User.findOne({ where: { firebaseId: req.user.uid } });
    if (!user) {
      res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
      return;
    }

    // Find loan offer with related data
    const loanOffer = await LoanOffer.findByPk(loanOfferId, {
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

    // Check offer status
    if (loanOffer.status !== LoanOfferStatus.ACCEPTED) {
      res.status(400).json({ 
        success: false, 
        message: "Loan offer is not accepted" 
      });
      return;
    }

    // Check if loan agreement already exists
    const existingAgreement = await LoanAgreement.findOne({
      where: { contractAddress }
    });

    if (existingAgreement) {
      res.status(409).json({ 
        success: false, 
        message: "Loan agreement already registered with this address" 
      });
      return;
    }

    // Check contract details from the blockchain
    try {
      const loanContractDetails = await BlockchainService.getLoanAgreementDetails(contractAddress);
      console.log('Loan contract details from blockchain:', convertBigIntToString(loanContractDetails));

      // Create loan agreement record
      const loanAgreement = await LoanAgreement.create({
        contractAddress,
        loanRequestId: loanOffer.loanRequestId,
        loanOfferId: loanOffer.id,
        borrowerId: loanOffer.loanRequest.requesterId,
        lenderId: loanOffer.lenderId,
        amount: loanOffer.amount || loanOffer.loanRequest.amount, // Use offer amount if available, otherwise request amount
        interestRate: loanOffer.interestRate,
        duration: loanOffer.duration,
        status: LoanAgreementStatus.CREATED,
        startDate: new Date()
      });

      // Update loan request status
      await LoanRequest.update(
        { status: LoanRequestStatus.CLOSED },
        { where: { id: loanOffer.loanRequestId } }
      );

      // Fetch the created agreement with related data
      const completeAgreement = await LoanAgreement.findByPk(loanAgreement.id, {
        include: [
          { model: LoanRequest },
          { model: User, as: 'borrower' },
          { model: User, as: 'lender' }
        ]
      });

      console.log('Created loan agreement:', {
        id: loanAgreement.id,
        contractAddress: loanAgreement.contractAddress,
        borrowerId: loanAgreement.borrowerId,
        lenderId: loanAgreement.lenderId,
        status: loanAgreement.status
      });

      res.status(201).json({
        success: true,
        message: "Loan agreement registered successfully",
        loanAgreement: completeAgreement
      });
    } catch (error) {
      console.error("Error verifying blockchain contract:", error);
      res.status(400).json({ 
        success: false, 
        message: "Failed to verify blockchain contract", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  } catch (error) {
    console.error("Error registering loan agreement:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to register loan agreement", 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Get all loan agreements
// @ts-ignore
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    console.log('GET /loan/agreements - Authenticated user ID:', req.user?.uid);
    
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!user) {
      console.log('User not found with Firebase ID:', req.user?.uid);
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('Found user in database:', user.id, user.email);
    
    // Get loan agreements where user is either borrower or lender
    const loanAgreements = await LoanAgreement.findAll({
      where: {
        [Op.or]: [
          { borrowerId: user.id },
          { lenderId: user.id }
        ]
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
            }
          ]
        },
        { model: User, as: 'borrower', attributes: ['id', 'email', 'walletAddress', 'firebaseId'] },
        { model: User, as: 'lender', attributes: ['id', 'email', 'walletAddress', 'firebaseId'] }
      ]
    });
    
    console.log(`Found ${loanAgreements.length} loan agreements related to user`);
    
    res.json({ 
      success: true,
      loanAgreements 
    });
  } catch (error) {
    console.error('Error retrieving loan agreements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve loan agreements',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get specific loan agreement
// @ts-ignore
router.get('/:address', authenticate, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    console.log(`GET /loan/agreement/${address} - Request received from user:`, req.user?.uid);
    
    // Validate address parameter
    if (!address || !address.startsWith('0x')) {
      console.log(`Invalid loan agreement address:`, address);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid loan agreement address' 
      });
    }
    
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!user) {
      console.log(`User not found with Firebase ID:`, req.user?.uid);
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    console.log(`User found:`, user.id, user.email);
    
    // Find loan agreement with related data
    const loanAgreement = await LoanAgreement.findOne({
      where: { contractAddress: address },
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
            }
          ]
        },
        { model: User, as: 'borrower', attributes: ['id', 'email', 'walletAddress', 'firebaseId'] },
        { model: User, as: 'lender', attributes: ['id', 'email', 'walletAddress', 'firebaseId'] },
        { model: Payment }
      ]
    });
    
    if (!loanAgreement) {
      console.log(`Loan agreement not found with address:`, address);
      return res.status(404).json({ 
        success: false, 
        message: 'Loan agreement not found' 
      });
    }

    console.log('Found loan agreement:', {
      id: loanAgreement.id,
      contractAddress: loanAgreement.contractAddress,
      borrowerId: loanAgreement.borrowerId,
      lenderId: loanAgreement.lenderId,
      status: loanAgreement.status
    });

    // Get blockchain data
    let blockchainDetails;
    try {
      blockchainDetails = await BlockchainService.getLoanAgreementDetails(address);
      console.log('Blockchain details retrieved successfully');
    } catch (error) {
      console.error('Error retrieving blockchain details:', error);
      blockchainDetails = null;
    }

    // Get repayment schedule from blockchain
    let repaymentSchedule;
    try {
      repaymentSchedule = await BlockchainService.getRepaymentSchedule(address);
      console.log('Repayment schedule retrieved successfully');
    } catch (error) {
      console.error('Error retrieving repayment schedule:', error);
      repaymentSchedule = null;
    }
    
    res.json({ 
      success: true,
      loanAgreement,
      blockchainDetails: blockchainDetails ? convertBigIntToString(blockchainDetails) : null,
      repaymentSchedule: repaymentSchedule ? convertBigIntToString(repaymentSchedule) : null
    });
  } catch (error) {
    console.error('Error retrieving loan agreement details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve loan agreement details',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Initialize loan
// @ts-ignore
router.post('/:address/initialize', authenticate, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    console.log(`POST /loan/agreement/${address}/initialize - Request received from user:`, req.user?.uid);
    
    // Validate address parameter
    if (!address || !address.startsWith('0x')) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid loan agreement address' 
      });
    }
    
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Find loan agreement
    const loanAgreement = await LoanAgreement.findOne({
      where: { contractAddress: address },
      include: [
        { model: User, as: 'borrower' },
        { model: User, as: 'lender' }
      ]
    });
    
    if (!loanAgreement) {
      return res.status(404).json({ 
        success: false, 
        message: 'Loan agreement not found' 
      });
    }
    
    // Check if user is the lender
    if (loanAgreement.lenderId !== user.id) {
      return res.status(403).json({ 
        success: false, 
        message: "You don't have permission to initialize this loan" 
      });
    }
    
    // Check if loan is in CREATED status
    if (loanAgreement.status !== LoanAgreementStatus.CREATED) {
      return res.status(400).json({ 
        success: false, 
        message: "Loan agreement is not in CREATED status" 
      });
    }
    
    try {
      // Call blockchain service to initialize loan
      const tx = await BlockchainService.initializeLoan(
        address,
        user.walletAddress,
        loanAgreement.amount.toString()
      );
      
      // Update loan status
      await loanAgreement.update({ status: LoanAgreementStatus.ACTIVE });
      
      // Record payment
      await Payment.create({
        loanAgreementId: loanAgreement.id,
        payerId: user.id,
        recipientId: loanAgreement.borrowerId,
        amount: loanAgreement.amount,
        txHash: tx.transactionHash,
        type: PaymentType.LOAN_INITIALIZATION,
        paymentDate: new Date()
      });
      
      res.json({
        success: true,
        message: "Loan initialized successfully",
        transactionHash: tx.transactionHash
      });
    } catch (error) {
      console.error("Error initializing loan:", error);
      res.status(400).json({ 
        success: false, 
        message: "Failed to initialize loan", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  } catch (error) {
    console.error("Error initializing loan:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to initialize loan", 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Make loan repayment
// @ts-ignore
router.post('/:address/repay', authenticate, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { month, amount } = req.body;
    console.log(`POST /loan/agreement/${address}/repay - Request received from user:`, req.user?.uid);
    
    // Validate parameters
    if (!address || !address.startsWith('0x')) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid loan agreement address' 
      });
    }
    
    if (!month || isNaN(parseInt(month))) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid month is required' 
      });
    }
    
    if (!amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Amount is required' 
      });
    }
    
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Find loan agreement
    const loanAgreement = await LoanAgreement.findOne({
      where: { contractAddress: address },
      include: [
        { model: User, as: 'borrower' },
        { model: User, as: 'lender' }
      ]
    });
    
    if (!loanAgreement) {
      return res.status(404).json({ 
        success: false, 
        message: 'Loan agreement not found' 
      });
    }
    
    // Check if user is the borrower
    if (loanAgreement.borrowerId !== user.id) {
      return res.status(403).json({ 
        success: false, 
        message: "You don't have permission to repay this loan" 
      });
    }
    
    // Check if loan is in ACTIVE status
    if (loanAgreement.status !== LoanAgreementStatus.ACTIVE) {
      return res.status(400).json({ 
        success: false, 
        message: "Loan agreement is not active" 
      });
    }
    
    try {
      // Call blockchain service to make repayment
      const tx = await BlockchainService.makeRepayment(
        address,
        user.walletAddress,
        parseInt(month),
        amount
      );
      
      // Record payment
      await Payment.create({
        loanAgreementId: loanAgreement.id,
        payerId: user.id,
        recipientId: loanAgreement.lenderId,
        amount: amount,
        txHash: tx.transactionHash,
        type: PaymentType.LOAN_REPAYMENT,
        month: parseInt(month),
        paymentDate: new Date()
      });
      
      // Check if this was the final payment
      const details = await BlockchainService.getLoanAgreementDetails(address);
      if (details && details.status === 4) { // COMPLETED status
        await loanAgreement.update({ status: LoanAgreementStatus.COMPLETED });
      }
      
      res.json({
        success: true,
        message: "Loan repayment made successfully",
        transactionHash: tx.transactionHash
      });
    } catch (error) {
      console.error("Error making loan repayment:", error);
      res.status(400).json({ 
        success: false, 
        message: "Failed to make loan repayment", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  } catch (error) {
    console.error("Error making loan repayment:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to make loan repayment", 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Update loan agreement status
// @ts-ignore
router.post('/:address/update-status', authenticate, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { status } = req.body;
    console.log(`POST /loan/agreement/${address}/update-status - Request received from user:`, req.user?.uid);
    
    // Validate parameters
    if (!address || !address.startsWith('0x')) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid loan agreement address' 
      });
    }
    
    if (!status) {
      return res.status(400).json({ 
        success: false, 
        message: 'Status is required' 
      });
    }
    
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Find loan agreement
    const loanAgreement = await LoanAgreement.findOne({
      where: { contractAddress: address }
    });
    
    if (!loanAgreement) {
      return res.status(404).json({ 
        success: false, 
        message: 'Loan agreement not found' 
      });
    }
    
    // Update loan status
    await loanAgreement.update({ status });
    
    res.json({
      success: true,
      message: "Loan agreement status updated successfully"
    });
  } catch (error) {
    console.error("Error updating loan agreement status:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to update loan agreement status", 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Record loan payment
// @ts-ignore
router.post('/:address/payment', authenticate, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { 
      payerId,
      recipientId,
      amount,
      txHash,
      type,
      month,
      note
    } = req.body;
    
    // Validate parameters
    if (!address || !address.startsWith('0x')) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid loan agreement address' 
      });
    }
    
    if (!amount || !type) {
      return res.status(400).json({ 
        success: false, 
        message: 'Amount and type are required' 
      });
    }
    
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Find loan agreement
    const loanAgreement = await LoanAgreement.findOne({
      where: { contractAddress: address }
    });
    
    if (!loanAgreement) {
      return res.status(404).json({ 
        success: false, 
        message: 'Loan agreement not found' 
      });
    }
    
    // Create payment record
    const payment = await Payment.create({
      loanAgreementId: loanAgreement.id,
      payerId: payerId || user.id,
      recipientId: recipientId || (user.id === loanAgreement.borrowerId ? loanAgreement.lenderId : loanAgreement.borrowerId),
      amount,
      txHash,
      type,
      month,
      note,
      paymentDate: new Date()
    });
    
    res.status(201).json({
      success: true,
      message: "Payment recorded successfully",
      payment
    });
  } catch (error) {
    console.error("Error recording payment:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to record payment", 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

export default router; 