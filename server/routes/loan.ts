import express, { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { authenticate } from '../middleware/auth';
import { User } from '../models/user.model';
import { RentalAgreement, RentalAgreementStatus } from '../models/rental-agreement.model';
import { LoanRequest, LoanRequestStatus } from '../models/loan-request.model';
import { LoanOffer, LoanOfferStatus } from '../models/loan-offer.model';
import { LoanAgreement, LoanAgreementStatus } from '../models/loan-agreement.model';
import { Payment, PaymentType } from '../models/payment.model';

const router = express.Router();

// Helper function to convert BigInt values to strings for JSON serialization
const convertBigIntToString = (obj: any, processed = new WeakMap<object, any>()): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  // Handle circular references
  if (typeof obj === 'object') {
    // Return already processed objects to avoid infinite recursion
    if (processed.has(obj)) {
      return processed.get(obj);
    }
    
    if (Array.isArray(obj)) {
      const result: any[] = [];
      // Store the array in the WeakMap before processing its elements
      processed.set(obj, result);
      
      for (let i = 0; i < obj.length; i++) {
        result[i] = convertBigIntToString(obj[i], processed);
      }
      return result;
    } else {
      const result: any = {};
      // Store the object in the WeakMap before processing its properties
      processed.set(obj, result);
      
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          result[key] = convertBigIntToString(obj[key], processed);
        }
      }
      return result;
    }
  }
  
  return obj;
};

// Create loan request
// @ts-ignore
router.post('/request', authenticate, async (req: Request, res: Response) => {
  try {
    // Ensure user is defined
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        message: "Unauthorized" 
      });
      return;
    }

    // Destructure with renamed parameter
    const { rentalAgreementAddress, requestedAmount, loanDuration, interestRate } = req.body;

    // Validate required fields
    if (!rentalAgreementAddress || !requestedAmount || !loanDuration || !interestRate) {
      res.status(400).json({ 
        success: false, 
        message: "Missing required fields" 
      });
      return;
    }

    // Validate requestedAmount format
    if (isNaN(parseFloat(requestedAmount)) || parseFloat(requestedAmount) <= 0) {
      res.status(400).json({ 
        success: false, 
        message: "Invalid amount format" 
      });
      return;
    }

    // Validate loan duration
    if (isNaN(loanDuration) || loanDuration < 1) {
      res.status(400).json({
        success: false,
        message: "Loan duration must be at least 1 month"
      });
      return;
    }

    // Validate interest rate
    if (isNaN(interestRate) || interestRate < 1) {
      res.status(400).json({
        success: false,
        message: "Interest rate must be at least 1%"
      });
      return;
    }

    // Find the requester
    const requester = await User.findOne({ where: { firebaseId: req.user.uid } });
    if (!requester) {
      res.status(404).json({ 
        success: false, 
        message: 'Requester not found' 
      });
      return;
    }

    // Verify user has permission to create loan request for this rental agreement
    const rentalAgreement = await RentalAgreement.findOne({ 
      where: { contractAddress: rentalAgreementAddress } 
    });

    if (!rentalAgreement) {
      res.status(404).json({ 
        success: false, 
        message: "Rental agreement not found" 
      });
      return;
    }

    // Check if user is the tenant of the rental agreement
    if (rentalAgreement.renterId !== requester.id) {
      res.status(403).json({ 
        success: false, 
        message: "You don't have permission to create a loan request for this rental agreement" 
      });
      return;
    }

    // Create loan request record with the interest rate
    const loanRequest = await LoanRequest.create({
      rentalAgreementId: rentalAgreement.id,
      requesterId: requester.id,
      amount: requestedAmount,
      duration: loanDuration,
      interestRate: interestRate,
      status: LoanRequestStatus.OPEN
    });

    // Fetch the created loan request with associated data
    const completeRequest = await LoanRequest.findByPk(loanRequest.id, {
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
    });

    console.log('Created loan request:', {
      id: loanRequest.id,
      requesterId: loanRequest.requesterId,
      requesterFirebaseId: requester.firebaseId,
      status: loanRequest.status
    });

    // Return success response
    res.status(201).json({
      success: true,
      message: "Loan request created successfully",
      loanRequest: completeRequest
    });
  } catch (error) {
    console.error("Error creating loan request:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to create loan request", 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Get all loan requests (excluding the user's own requests, only OPEN status)
// @ts-ignore
router.get('/requests', authenticate, async (req: Request, res: Response) => {
  try {
    console.log('GET /requests - Authenticated user ID:', req.user?.uid);
    
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!user) {
      console.log('User not found with Firebase ID:', req.user?.uid);
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('Found user in database:', user.id, user.email);
    
    // Get all open loan requests NOT created by the current user
    const loanRequests = await LoanRequest.findAll({
      where: {
        requesterId: { [Op.ne]: user.id }, // exclude requests made by this user
        status: LoanRequestStatus.OPEN // only show OPEN requests
      },
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
    });
    
    console.log(`Found ${loanRequests.length} loan requests not created by user and with OPEN status`);
    
    // Add a simplified version of the requests for logging
    const simplifiedRequests = loanRequests.map(req => ({
      id: req.id,
      requesterId: req.requesterId,
      requesterEmail: req.requester?.email,
      requesterFirebaseId: req.requester?.firebaseId,
      status: req.status
    }));
    
    console.log('Simplified request data:', JSON.stringify(simplifiedRequests));
    
    res.json({ 
      success: true,
      currentUserId: user.id,
      currentUserFirebaseId: user.firebaseId,
      loanRequests 
    });
  } catch (error) {
    console.error('Error retrieving loan requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve loan requests',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get specific loan request
// @ts-ignore
router.get('/requests/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`GET /loan/requests/${id} - Request received from user:`, req.user?.uid);
    
    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      console.log(`Invalid loan request ID:`, id);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid loan request ID' 
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
    
    // More detailed step by step logging
    console.log(`Finding loan request with ID:`, id);
    console.log('Query parameters:', {
      id: id,
      includeRentalAgreement: true,
      includeRequester: true
    });
    
    try {
      // Find the loan request with nested includes in separate steps for better error tracking
      let loanRequest;
      
      // Step 1: Get just the loan request
      console.log('Step 1: Finding basic loan request');
      loanRequest = await LoanRequest.findByPk(id);
      console.log('Basic loan request found:', loanRequest ? 'Yes' : 'No');
      
      if (!loanRequest) {
        console.log(`Loan request not found with ID:`, id);
        return res.status(404).json({ 
          success: false, 
          message: 'Loan request not found' 
        });
      }
      
      // Step 2: Get the requester info
      console.log('Step 2: Finding requester');
      const requester = await User.findByPk(loanRequest.requesterId, {
        attributes: ['id', 'email', 'walletAddress']
      });
      console.log('Requester found:', requester ? 'Yes' : 'No');
      
      // Step 3: Get rental agreement
      console.log('Step 3: Finding rental agreement');
      const rentalAgreement = await RentalAgreement.findByPk(loanRequest.rentalAgreementId, {
        include: [
          { model: User, as: 'landlord', attributes: ['id', 'email', 'walletAddress'] },
          { model: User, as: 'renter', attributes: ['id', 'email', 'walletAddress'] }
        ]
      });
      console.log('Rental agreement found:', rentalAgreement ? 'Yes' : 'No');
      
      // Step 4: Add the associations manually
      loanRequest.setDataValue('requester', requester);
      loanRequest.setDataValue('rentalAgreement', rentalAgreement);
      
      // Step 5: Get loan offers
      console.log('Step 5: Finding loan offers');
      const loanOffers = await LoanOffer.findAll({
        where: { loanRequestId: loanRequest.id },
        include: [
          { model: User, as: 'lender', attributes: ['id', 'email', 'walletAddress'] }
        ]
      });
      console.log(`Found ${loanOffers.length} loan offers`);
      
      // Return database data only - no blockchain calls
      const responseData = {
        success: true,
        loanRequest: {
          id: loanRequest.id,
          amount: loanRequest.amount,
          duration: loanRequest.duration,
          interestRate: loanRequest.interestRate,
          status: loanRequest.status,
          createdAt: loanRequest.createdAt,
          updatedAt: loanRequest.updatedAt,
          requester: requester ? {
            id: requester.id,
            email: requester.email,
            walletAddress: requester.walletAddress
          } : null,
          rentalAgreement: rentalAgreement ? {
            id: rentalAgreement.id,
            contractAddress: rentalAgreement.contractAddress,
            name: rentalAgreement.name,
            status: rentalAgreement.status,
            duration: rentalAgreement.duration,
            securityDeposit: rentalAgreement.securityDeposit,
            baseRent: rentalAgreement.baseRent,
            gracePeriod: rentalAgreement.gracePeriod,
            landlord: rentalAgreement.landlord ? {
              id: rentalAgreement.landlord.id,
              email: rentalAgreement.landlord.email,
              walletAddress: rentalAgreement.landlord.walletAddress
            } : null,
            renter: rentalAgreement.renter ? {
              id: rentalAgreement.renter.id,
              email: rentalAgreement.renter.email,
              walletAddress: rentalAgreement.renter.walletAddress
            } : null
          } : null
        },
        loanOffers: loanOffers.map(offer => ({
          id: offer.id,
          interestRate: offer.interestRate,
          status: offer.status,
          createdAt: offer.createdAt,
          amount: offer.amount,
          duration: offer.duration,
          lender: offer.lender ? {
            id: offer.lender.id,
            email: offer.lender.email,
            walletAddress: offer.lender.walletAddress
          } : null
        }))
      };
      
      console.log(`Sending response for loan request:`, loanRequest.id);
      res.json(responseData);
    } catch (innerError) {
      console.error('Error in database queries:', innerError);
      throw innerError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error('Error retrieving loan request:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve loan request',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Create loan offer
// @ts-ignore
router.post('/offer', authenticate, async (req: Request, res: Response) => {
  try {
    const { loanRequestId, interestRate, offerAmount } = req.body;
    
    if (!loanRequestId || !interestRate || offerAmount === undefined) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields: loanRequestId, interestRate, and offerAmount are required' 
      });
    }
    
    // Find the lender
    const lender = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!lender) {
      return res.status(404).json({ 
        success: false,
        message: 'Lender not found' 
      });
    }
    
    // Find the loan request
    const loanRequest = await LoanRequest.findByPk(loanRequestId, {
      include: [
        { model: RentalAgreement },
        { model: User, as: 'requester' }
      ]
    });
    
    if (!loanRequest) {
      return res.status(404).json({ 
        success: false,
        message: 'Loan request not found' 
      });
    }
    
    // Check if the loan request is still open
    if (loanRequest.status !== LoanRequestStatus.OPEN) {
      return res.status(400).json({ 
        success: false,
        message: 'Loan request is no longer open' 
      });
    }
    
    // Validate offer amount (must be exactly equal to the requested amount)
    const requestAmount = parseFloat(loanRequest.amount.toString());
    const proposedAmount = parseFloat(offerAmount);
    
    if (proposedAmount !== requestAmount) {
      return res.status(400).json({
        success: false,
        message: `Offer amount must be exactly equal to the requested amount (${requestAmount} ETH)`
      });
    }
    
    // Use the loan request's duration (must match exactly)
    const duration = loanRequest.duration;
    
    // Create the loan offer
    const loanOffer = await LoanOffer.create({
      loanRequestId: loanRequest.id,
      lenderId: lender.id,
      interestRate,
      duration,
      amount: offerAmount,
      graceMonths: 0, // Always 0 for loans
      status: LoanOfferStatus.PENDING
    });
    
    res.status(201).json({
      success: true,
      message: 'Loan offer created successfully',
      loanOffer: {
        id: loanOffer.id,
        loanRequestId: loanOffer.loanRequestId,
        interestRate: loanOffer.interestRate,
        duration: loanOffer.duration,
        offerAmount: offerAmount,
        status: loanOffer.status
      }
    });
  } catch (error) {
    console.error('Error creating loan offer:', error);
    res.status(500).json({
      success: false,
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
    
    // Generate a contract address for database purposes only
    // In a real implementation, this would come from the blockchain
    const contractAddress = `0x${Math.random().toString(16).substr(2, 40)}`;
    
    // Create loan agreement in database only
    const loanAgreement = await LoanAgreement.create({
      contractAddress,
      loanRequestId: loanOffer.loanRequestId,
      loanOfferId: loanOffer.id,
      borrowerId: loanOffer.loanRequest.requesterId,
      lenderId: loanOffer.lenderId,
      rentalAgreementId: loanOffer.loanRequest.rentalAgreementId,
      amount: loanOffer.loanRequest.amount,
      interestRate: loanOffer.interestRate,
      duration: loanOffer.loanRequest.duration,
      createdDate: new Date(),
      status: LoanAgreementStatus.ACTIVE,
      remainingBalance: loanOffer.loanRequest.amount
    });
    
    res.json(convertBigIntToString({
      message: 'Loan offer accepted and agreement created',
      loanAgreement: {
        id: loanAgreement.id,
        contractAddress,
        amount: loanAgreement.amount,
        interestRate: loanAgreement.interestRate,
        duration: loanAgreement.duration,
        status: loanAgreement.status
      }
    }));
  } catch (error) {
    console.error('Error accepting loan offer:', error);
    res.status(500).json({
      message: 'Failed to accept loan offer',
      error: (error as Error).message
    });
  }
});

// Get all loan agreements for the current user
// @ts-ignore
router.get('/agreements', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find agreements where user is either borrower or lender
    const loanAgreements = await LoanAgreement.findAll({
      where: {
        [Op.or]: [
          { borrowerId: user.id },
          { lenderId: user.id }
        ]
      },
      include: [
        { 
          model: RentalAgreement,
          include: [
            { model: User, as: 'landlord', attributes: ['id', 'email', 'walletAddress'] },
            { model: User, as: 'renter', attributes: ['id', 'email', 'walletAddress'] }
          ]
        },
        { model: User, as: 'borrower', attributes: ['id', 'email', 'walletAddress'] },
        { model: User, as: 'lender', attributes: ['id', 'email', 'walletAddress'] },
        { model: LoanRequest },
        { model: LoanOffer }
      ]
    });
    
    res.json(convertBigIntToString({ loanAgreements }));
  } catch (error) {
    console.error('Error retrieving loan agreements:', error);
    res.status(500).json({
      message: 'Failed to retrieve loan agreements',
      error: (error as Error).message
    });
  }
});

// Get a specific loan agreement by contract address
// @ts-ignore
router.get('/agreement/:address', authenticate, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find the loan agreement
    const loanAgreement = await LoanAgreement.findOne({
      where: { contractAddress: address },
      include: [
        { 
          model: RentalAgreement,
          include: [
            { model: User, as: 'landlord', attributes: ['id', 'email', 'walletAddress'] },
            { model: User, as: 'renter', attributes: ['id', 'email', 'walletAddress'] }
          ]
        },
        { model: User, as: 'borrower', attributes: ['id', 'email', 'walletAddress'] },
        { model: User, as: 'lender', attributes: ['id', 'email', 'walletAddress'] },
        { model: LoanRequest },
        { model: LoanOffer }
      ]
    });
    
    if (!loanAgreement) {
      return res.status(404).json({ message: 'Loan agreement not found' });
    }
    
    // Check if user is either the borrower or lender
    if (loanAgreement.borrowerId !== user.id && loanAgreement.lenderId !== user.id) {
      return res.status(403).json({ message: 'You are not authorized to view this loan agreement' });
    }
    
    // Get payment history
    const payments = await Payment.findAll({
      where: {
        loanAgreementId: loanAgreement.id,
        type: PaymentType.LOAN_REPAYMENT
      },
      order: [['createdAt', 'DESC']]
    });
    
    res.json(convertBigIntToString({
      loanAgreement,
      payments
    }));
  } catch (error) {
    console.error('Error retrieving loan agreement:', error);
    res.status(500).json({
      message: 'Failed to retrieve loan agreement',
      error: (error as Error).message
    });
  }
});

// Initialize loan (only lender can initialize)
// @ts-ignore
router.post('/agreement/:address/initialize', authenticate, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { transactionHash } = req.body;
    
    if (!transactionHash) {
      return res.status(400).json({ message: 'Missing transaction hash' });
    }
    
    // Find the user
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find the loan agreement
    const loanAgreement = await LoanAgreement.findOne({
      where: { contractAddress: address },
      include: [
        { model: RentalAgreement },
        { model: User, as: 'borrower' },
        { model: User, as: 'lender' }
      ]
    });
    
    if (!loanAgreement) {
      return res.status(404).json({ message: 'Loan agreement not found' });
    }
    
    // Check if user is the lender
    if (loanAgreement.lenderId !== user.id) {
      return res.status(403).json({ message: 'Only the lender can initialize the loan' });
    }
    
    // Check if loan is already initialized
    if (loanAgreement.status !== LoanAgreementStatus.ACTIVE) {
      return res.status(400).json({ message: 'Loan is not in active state' });
    }
    
    // Update loan agreement status - no blockchain verification
    await loanAgreement.update({ status: LoanAgreementStatus.FUNDED });
    
    // Record the payment
    await Payment.create({
      loanAgreementId: loanAgreement.id,
      payerId: user.id,
      recipientId: loanAgreement.borrowerId,
      amount: loanAgreement.amount,
      txHash: transactionHash,
      type: PaymentType.LOAN_INITIALIZATION,
      paymentDate: new Date()
    });
    
    res.json(convertBigIntToString({
      message: 'Loan successfully initialized',
      status: loanAgreement.status
    }));
  } catch (error) {
    console.error('Error initializing loan:', error);
    res.status(500).json({
      message: 'Failed to initialize loan',
      error: (error as Error).message
    });
  }
});

// Make loan repayment (only borrower can repay)
// @ts-ignore
router.post('/agreement/:address/repay', authenticate, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { month, amount, transactionHash } = req.body;
    
    if (!month || !amount || !transactionHash) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Find the user
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find the loan agreement
    const loanAgreement = await LoanAgreement.findOne({
      where: { contractAddress: address },
      include: [
        { model: RentalAgreement },
        { model: User, as: 'borrower' },
        { model: User, as: 'lender' }
      ]
    });
    
    if (!loanAgreement) {
      return res.status(404).json({ message: 'Loan agreement not found' });
    }
    
    // Check if user is the borrower
    if (loanAgreement.borrowerId !== user.id) {
      return res.status(403).json({ message: 'Only the borrower can make repayments' });
    }
    
    // Check if loan is funded
    if (loanAgreement.status !== LoanAgreementStatus.FUNDED) {
      return res.status(400).json({ message: 'Loan is not in funded state' });
    }
    
    // Calculate remaining balance
    const remainingBalance = parseFloat(loanAgreement.remainingBalance) - parseFloat(amount);
    
    // Update loan agreement status and remaining balance
    await loanAgreement.update({ 
      remainingBalance: remainingBalance.toString(),
      status: remainingBalance <= 0 ? LoanAgreementStatus.COMPLETED : LoanAgreementStatus.FUNDED
    });
    
    // Record the payment
    await Payment.create({
      loanAgreementId: loanAgreement.id,
      payerId: user.id,
      recipientId: loanAgreement.lenderId,
      amount,
      txHash: transactionHash,
      type: PaymentType.LOAN_REPAYMENT,
      month,
      paymentDate: new Date()
    });
    
    res.json(convertBigIntToString({
      message: 'Loan repayment successful',
      remainingBalance,
      status: loanAgreement.status
    }));
  } catch (error) {
    console.error('Error making loan repayment:', error);
    res.status(500).json({
      message: 'Failed to make loan repayment',
      error: (error as Error).message
    });
  }
});

// Get all loan requests created by the current user
// @ts-ignore
router.get('/myrequests', authenticate, async (req: Request, res: Response) => {
  try {
    console.log('GET /myrequests - Authenticated user ID:', req.user?.uid);
    
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!user) {
      console.log('User not found with Firebase ID:', req.user?.uid);
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('Found user in database:', user.id, user.email);
    
    // Get all loan requests created by the current user
    const loanRequests = await LoanRequest.findAll({
      where: {
        requesterId: user.id // only requests made by this user
      },
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
    });
    
    console.log(`Found ${loanRequests.length} loan requests created by user`);
    
    res.json({ 
      success: true,
      loanRequests 
    });
  } catch (error) {
    console.error('Error retrieving user loan requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve your loan requests',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get all loan offers made by the current user
// @ts-ignore
router.get('/myoffers', authenticate, async (req: Request, res: Response) => {
  try {
    console.log('GET /myoffers - Authenticated user ID:', req.user?.uid);
    
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!user) {
      console.log('User not found with Firebase ID:', req.user?.uid);
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('Found user in database:', user.id, user.email);
    
    // Get all loan offers made by the current user
    const loanOffers = await LoanOffer.findAll({
      where: {
        lenderId: user.id // only offers made by this user
      },
      include: [
        { 
          model: LoanRequest,
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
        },
        { model: User, as: 'lender', attributes: ['id', 'email', 'walletAddress'] }
      ]
    });
    
    console.log(`Found ${loanOffers.length} loan offers made by user`);
    
    res.json({ 
      success: true,
      loanOffers 
    });
  } catch (error) {
    console.error('Error retrieving user loan offers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve your loan offers',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router; 