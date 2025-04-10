import express, { Request, Response } from 'express';
import { Op } from 'sequelize';
import { authenticate } from '../../middleware/auth';
import { User } from '../../models/user.model';
import { RentalAgreement } from '../../models/rental-agreement.model';
import { LoanRequest, LoanRequestStatus } from '../../models/loan-request.model';
import { LoanOffer, LoanOfferStatus } from '../../models/loan-offer.model';
import { LoanAgreement, LoanAgreementStatus } from '../../models/loan-agreement.model';
import { Payment, PaymentType } from '../../models/payment.model';
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
      graceMonths: 1, // Default to 1 for grace months since we're not implementing this feature now
      status: LoanAgreementStatus.INITIALIZED,
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

    res.json({ 
      success: true,
      loanAgreement
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
    const { transactionHash } = req.body; // Now client provides txHash
    console.log(`POST /loan/agreement/${address}/initialize - Request received from user:`, req.user?.uid);
    
    // Validate address parameter
    if (!address || !address.startsWith('0x')) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid loan agreement address' 
      });
    }
    
    // Validate transaction hash
    if (!transactionHash || !transactionHash.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        message: 'Valid transaction hash is required'
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
    
    // Check if loan is in INITIALIZED status
    if (loanAgreement.status !== LoanAgreementStatus.INITIALIZED) {
      return res.status(400).json({ 
        success: false, 
        message: "Loan agreement is not initialized" 
      });
    }
    
    try {
      // Update loan status directly - blockchain state is already updated by client
      await loanAgreement.update({ status: LoanAgreementStatus.ACTIVE });
      
      // Record payment
      await Payment.create({
        loanAgreementId: loanAgreement.id,
        payerId: user.id,
        recipientId: loanAgreement.borrowerId,
        amount: loanAgreement.amount,
        txHash: transactionHash,
        type: PaymentType.LOAN_INITIALIZATION,
        paymentDate: new Date()
      });
      
      res.json({
        success: true,
        message: "Loan initialization recorded successfully",
        transactionHash: transactionHash
      });
    } catch (error) {
      console.error("Error recording loan initialization:", error);
      res.status(400).json({ 
        success: false, 
        message: "Failed to record loan initialization", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  } catch (error) {
    console.error("Error processing loan initialization:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to process loan initialization", 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Make loan repayment
// @ts-ignore
router.post('/:address/repay', authenticate, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { month, amount, transactionHash } = req.body;
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
    
    // Validate transaction hash
    if (!transactionHash || !transactionHash.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        message: 'Valid transaction hash is required'
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
    
    // Check if loan is in ACTIVE or PAID status
    if (loanAgreement.status !== LoanAgreementStatus.ACTIVE && 
        loanAgreement.status !== LoanAgreementStatus.PAID) {
      return res.status(400).json({ 
        success: false, 
        message: "Loan agreement is not active or paid" 
      });
    }
    
    try {
      // Record payment from client-side transaction
      await Payment.create({
        loanAgreementId: loanAgreement.id,
        payerId: user.id,
        recipientId: loanAgreement.lenderId,
        amount: amount,
        txHash: transactionHash,
        type: PaymentType.LOAN_REPAYMENT,
        month: parseInt(month),
        paymentDate: new Date()
      });
      
      // Mark as complete if client reports final payment
      const isComplete = req.body.isComplete === true;
      if (isComplete) {
        await loanAgreement.update({ status: LoanAgreementStatus.COMPLETED });
      }
      
      res.json({
        success: true,
        message: "Loan repayment recorded successfully",
        transactionHash: transactionHash
      });
    } catch (error) {
      console.error("Error recording loan repayment:", error);
      res.status(400).json({ 
        success: false, 
        message: "Failed to record loan repayment", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  } catch (error) {
    console.error("Error processing loan repayment:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to process loan repayment", 
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

// Get payment history for a loan agreement
// @ts-ignore
router.get('/:address/payments', authenticate, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    console.log(`GET /loan/agreement/${address}/payments - Request received from user:`, req.user?.uid);
    
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
    
    // Find loan agreement to confirm existence and relationship to user
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
    
    // Security check: User must be either the borrower or lender
    if (loanAgreement.borrowerId !== user.id && loanAgreement.lenderId !== user.id) {
      return res.status(403).json({ 
        success: false, 
        message: "You don't have permission to view this loan's payment history" 
      });
    }
    
    // Get all payments for this loan agreement
    const payments = await Payment.findAll({
      where: { loanAgreementId: loanAgreement.id },
      include: [
        { model: User, as: 'payer', attributes: ['id', 'email', 'walletAddress'] },
        { model: User, as: 'recipient', attributes: ['id', 'email', 'walletAddress'] }
      ],
      order: [['paymentDate', 'DESC']]
    });
    
    // Track total amount paid
    const totalPaid = payments.reduce((sum, payment) => {
      // Only count loan repayments toward the total paid amount
      if (payment.type === PaymentType.LOAN_REPAYMENT) {
        return sum + Number(payment.amount);
      }
      return sum;
    }, 0);
    
    res.json({
      success: true,
      payments,
      meta: {
        totalPaid: totalPaid,
        totalPayments: payments.length,
        repaymentCount: payments.filter(p => p.type === PaymentType.LOAN_REPAYMENT).length
      }
    });
  } catch (error) {
    console.error("Error retrieving loan payment history:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to retrieve loan payment history", 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Get loan agreement by contract address
// @ts-ignore
router.get('/address/:address', authenticate, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    console.log(`GET /loan/agreement/address/${address} - Request received from user:`, req.user?.uid);
    
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
        { model: User, as: 'lender', attributes: ['id', 'email', 'walletAddress', 'firebaseId'] }
      ]
    });
    
    if (!loanAgreement) {
      return res.status(404).json({ 
        success: false, 
        message: 'Loan agreement not found' 
      });
    }
    
    // Get payment summary
    const payments = await Payment.findAll({
      where: { loanAgreementId: loanAgreement.id }
    });
    
    const totalPaid = payments
      .filter(p => p.type === PaymentType.LOAN_REPAYMENT)
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
    
    const paymentsByMonth = payments
      .filter(p => p.type === PaymentType.LOAN_REPAYMENT && p.month !== null)
      .reduce((acc, payment) => {
        if (payment.month !== null) {
          acc[payment.month] = (acc[payment.month] || 0) + Number(payment.amount);
        }
        return acc;
      }, {} as Record<number, number>);
    
    res.json({
      success: true,
      loanAgreement: {
        ...loanAgreement.toJSON(),
        paymentSummary: {
          totalPaid,
          paymentsByMonth
        }
      }
    });
  } catch (error) {
    console.error("Error retrieving loan agreement by address:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to retrieve loan agreement", 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Record a transaction
// @ts-ignore
router.post('/:address/transaction', authenticate, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { 
      transactionHash, 
      type, 
      amount, 
      month, 
      newStatus, 
      isComplete
    } = req.body;
    
    // Validate parameters
    if (!address || !address.startsWith('0x')) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid loan agreement address' 
      });
    }
    
    if (!transactionHash || !transactionHash.startsWith('0x')) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid transaction hash is required' 
      });
    }
    
    if (!type) {
      return res.status(400).json({ 
        success: false, 
        message: 'Transaction type is required' 
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
    
    // Map transaction type to payment type
    let paymentType: PaymentType;
    let payerId = user.id;
    let recipientId: number;
    
    switch (type) {
      case 'fund':
        paymentType = PaymentType.LOAN_INITIALIZATION;
        payerId = loanAgreement.lenderId;
        recipientId = loanAgreement.borrowerId;
        break;
      case 'repay':
        paymentType = PaymentType.LOAN_REPAYMENT;
        payerId = loanAgreement.borrowerId;
        recipientId = loanAgreement.lenderId;
        break;
      case 'withdraw':
      case 'complete':
      case 'default':
        // These are status changes, not direct payments
        // We'll still record them for transaction history
        paymentType = PaymentType.LOAN_REPAYMENT;
        payerId = user.id;
        recipientId = user.id === loanAgreement.borrowerId 
          ? loanAgreement.lenderId 
          : loanAgreement.borrowerId;
        break;
      default:
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid transaction type' 
        });
    }
    
    // Record the transaction
    const transaction = await Payment.create({
      loanAgreementId: loanAgreement.id,
      payerId,
      recipientId,
      amount: amount || 0,
      txHash: transactionHash,
      type: paymentType,
      month: month || null,
      paymentDate: new Date()
    });
    
    // Update loan status if needed
    if (newStatus !== undefined) {
      await loanAgreement.update({ status: newStatus });
    } else if (isComplete) {
      await loanAgreement.update({ status: LoanAgreementStatus.COMPLETED });
    }
    
    res.status(201).json({
      success: true,
      message: "Transaction recorded successfully",
      transaction
    });
  } catch (error) {
    console.error("Error recording transaction:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to record transaction", 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Fund a loan (record the funding transaction)
// @ts-ignore
router.post('/:address/fund', authenticate, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { amount, transactionHash } = req.body;
    
    // Validate parameters
    if (!address || !address.startsWith('0x')) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid loan agreement address' 
      });
    }
    
    if (!transactionHash || !transactionHash.startsWith('0x')) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid transaction hash is required' 
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
    
    // Check if user is the lender
    if (loanAgreement.lenderId !== user.id) {
      return res.status(403).json({ 
        success: false, 
        message: "Only the lender can fund this loan" 
      });
    }
    
    // Record the funding payment
    const payment = await Payment.create({
      loanAgreementId: loanAgreement.id,
      payerId: loanAgreement.lenderId,
      recipientId: loanAgreement.borrowerId,
      amount: amount || loanAgreement.amount,
      txHash: transactionHash,
      type: PaymentType.LOAN_INITIALIZATION,
      paymentDate: new Date()
    });
    
    // Update the loan status to READY
    await loanAgreement.update({ status: LoanAgreementStatus.READY });
    
    res.status(201).json({
      success: true,
      message: "Loan funding recorded successfully",
      payment
    });
  } catch (error) {
    console.error("Error recording loan funding:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to record loan funding", 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Get loan status details
// @ts-ignore
router.get('/:address/status', authenticate, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    console.log(`GET /loan/agreement/${address}/status - Request received from user:`, req.user?.uid);
    
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
    
    // Security check: User must be either the borrower or lender
    if (loanAgreement.borrowerId !== user.id && loanAgreement.lenderId !== user.id) {
      return res.status(403).json({ 
        success: false, 
        message: "You don't have permission to view this loan's status details" 
      });
    }
    
    // Get loan progress
    const progress = await loanAgreement.getLoanProgress();
    
    // Get next payment due
    const nextPayment = await loanAgreement.getNextPaymentDue();
    
    // Get status history from payment records
    const statusHistory = await Payment.findAll({
      where: { 
        loanAgreementId: loanAgreement.id,
      },
      attributes: ['paymentDate', 'type', 'txHash'],
      order: [['paymentDate', 'ASC']]
    });
    
    // Map payment types to status changes
    const statusChanges = statusHistory.map(payment => {
      let statusChange = '';
      
      switch (payment.type) {
        case PaymentType.CONTRACT_CREATION:
          statusChange = 'Contract Created';
          break;
        case PaymentType.LOAN_INITIALIZATION:
          statusChange = 'Loan Funded';
          break;
        case PaymentType.LOAN_REPAYMENT:
          statusChange = 'Repayment Made';
          break;
        default:
          statusChange = payment.type;
      }
      
      return {
        date: payment.paymentDate,
        change: statusChange,
        txHash: payment.txHash
      };
    });
    
    res.json({
      success: true,
      status: {
        current: loanAgreement.status,
        description: getStatusDescription(loanAgreement.status),
        progress: progress.progress,
        nextPayment: nextPayment,
        history: statusChanges,
        totalPaid: progress.totalPaid,
        totalRepayment: progress.totalRepayment,
        remainingAmount: progress.remainingAmount
      }
    });
  } catch (error) {
    console.error("Error retrieving loan status details:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to retrieve loan status details", 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Get repayment schedule
// @ts-ignore
router.get('/:address/schedule', authenticate, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    console.log(`GET /loan/agreement/${address}/schedule - Request received from user:`, req.user?.uid);
    
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
      where: { contractAddress: address }
    });
    
    if (!loanAgreement) {
      return res.status(404).json({ 
        success: false, 
        message: 'Loan agreement not found' 
      });
    }
    
    // Security check: User must be either the borrower or lender
    if (loanAgreement.borrowerId !== user.id && loanAgreement.lenderId !== user.id) {
      return res.status(403).json({ 
        success: false, 
        message: "You don't have permission to view this loan's repayment schedule" 
      });
    }
    
    // Get payment summary
    const paymentSummary = await loanAgreement.getRepaymentsSummary();
    
    // Calculate monthly payment
    const monthlyPayment = loanAgreement.calculateMonthlyPayment();
    
    // Generate repayment schedule
    const repaymentSchedule = [];
    let startDate = loanAgreement.startDate || new Date();
    
    for (let month = 1; month <= loanAgreement.duration; month++) {
      // Calculate due date (add months to start date)
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + month);
      
      // Check if payment was made
      const paid = paymentSummary.paymentsByMonth[month] > 0;
      
      repaymentSchedule.push({
        month,
        amount: monthlyPayment,
        dueDate,
        paid,
        paidAmount: paymentSummary.paymentsByMonth[month] || 0,
        status: paid ? 'Paid' : (paymentSummary.nextPaymentDue !== null && month < paymentSummary.nextPaymentDue ? 'Overdue' : 'Upcoming')
      });
    }
    
    res.json({
      success: true,
      schedule: {
        monthlyPayment,
        totalRepayment: loanAgreement.calculateTotalRepayment(),
        totalPaid: paymentSummary.totalPaid,
        remainingAmount: paymentSummary.totalRemaining,
        progress: paymentSummary.progress,
        nextPaymentDue: paymentSummary.nextPaymentDue,
        paymentsCompleted: paymentSummary.paymentsCompleted,
        paymentsRemaining: paymentSummary.paymentsRemaining,
        repayments: repaymentSchedule
      }
    });
  } catch (error) {
    console.error("Error retrieving repayment schedule:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to retrieve repayment schedule", 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Helper function to get status description
function getStatusDescription(status: LoanAgreementStatus): string {
  switch (status) {
    case LoanAgreementStatus.INITIALIZED:
      return 'The loan agreement has been initialized but not yet funded by the lender.';
    case LoanAgreementStatus.READY:
      return 'The loan has been funded by the lender and is ready to be activated.';
    case LoanAgreementStatus.ACTIVE:
      return 'The loan is active with collateral withdrawn.';
    case LoanAgreementStatus.PAID:
      return 'The loan is active and repayments are being made.';
    case LoanAgreementStatus.COMPLETED:
      return 'The loan has been fully repaid and completed successfully.';
    case LoanAgreementStatus.DEFAULTED:
      return 'The loan has been defaulted. Collateral has been forfeited.';
    default:
      return 'Unknown status';
  }
}

export default router; 