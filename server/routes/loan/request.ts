import express, { Request, Response } from 'express';
import { Op } from 'sequelize';
import { authenticate } from '../../middleware/auth';
import { User } from '../../models/user.model';
import { RentalAgreement } from '../../models/rental-agreement.model';
import { LoanRequest, LoanRequestStatus } from '../../models/loan-request.model';

const router = express.Router();

// Create loan request
// @ts-ignore
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    // Ensure user is defined
    if (!req.user) {
      console.log('Unauthorized request - no user found');
      res.status(401).json({ 
        success: false, 
        message: "Unauthorized" 
      });
      return;
    }

    console.log('----------------------');
    console.log('POST /loan/request - Raw request body:', req.body);
    console.log('POST /loan/request - Request headers:', req.headers);
    console.log('POST /loan/request - Request user:', req.user);
    console.log('----------------------');

    // Destructure all possible parameter names
    const { 
      rentalAgreementAddress, 
      rentalAgreementId,
      requestedAmount, 
      amount,
      loanDuration, 
      duration,
      interestRate 
    } = req.body;

    // Use fallbacks for different parameter names
    const addressToUse = rentalAgreementAddress || rentalAgreementId;
    const amountToUse = requestedAmount || amount;
    const durationToUse = loanDuration || duration;

    console.log('Processed parameters:', {
      addressToUse,
      amountToUse,
      durationToUse,
      interestRate,
      requestedAmount,
      duration
    });

    // Validate required fields with detailed error messages
    if (!addressToUse) {
      console.log('Missing rental agreement address');
      res.status(400).json({ 
        success: false, 
        message: "Missing rental agreement address" 
      });
      return;
    }
    
    if (!amountToUse) {
      console.log('Missing amount');
      res.status(400).json({ 
        success: false, 
        message: "Missing amount" 
      });
      return;
    }
    
    if (!durationToUse) {
      console.log('Missing duration');
      res.status(400).json({ 
        success: false, 
        message: "Missing duration" 
      });
      return;
    }
    
    if (!interestRate) {
      console.log('Missing interest rate');
      res.status(400).json({ 
        success: false, 
        message: "Missing interest rate" 
      });
      return;
    }

    // Validate amount format
    if (isNaN(parseFloat(amountToUse)) || parseFloat(amountToUse) <= 0) {
      res.status(400).json({ 
        success: false, 
        message: "Invalid amount format" 
      });
      return;
    }

    // Validate loan duration
    if (isNaN(durationToUse) || durationToUse < 1) {
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
      where: { contractAddress: addressToUse } 
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
      amount: amountToUse,
      duration: durationToUse,
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
router.get('/', authenticate, async (req: Request, res: Response) => {
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

// Get my loan requests
// @ts-ignore
router.get('/my', authenticate, async (req: Request, res: Response) => {
  try {
    console.log('GET /loan/myrequests - Authenticated user ID:', req.user?.uid);
    
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!user) {
      console.log('User not found with Firebase ID:', req.user?.uid);
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('Found user in database:', user.id, user.email);
    
    // Get all loan requests created by the current user
    const loanRequests = await LoanRequest.findAll({
      where: {
        requesterId: user.id
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
    
    res.json({ 
      success: true,
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
router.get('/:id', authenticate, async (req: Request, res: Response) => {
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
    
    // Step 1: Get just the loan request
    console.log('Step 1: Finding basic loan request');
    const loanRequest = await LoanRequest.findByPk(id);
    console.log('Basic loan request found:', loanRequest ? 'Yes' : 'No');
    
    if (!loanRequest) {
      console.log(`Loan request not found with ID:`, id);
      return res.status(404).json({ 
        success: false, 
        message: 'Loan request not found' 
      });
    }
    
    // Step 2: Get loan request with related data
    console.log('Step 2: Finding loan request with related data');
    const loanRequestWithData = await LoanRequest.findByPk(id, {
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
    console.log('Loan request with related data found:', loanRequestWithData ? 'Yes' : 'No');
    
    // Success response
    res.json({ 
      success: true,
      loanRequest: loanRequestWithData 
    });
  } catch (error) {
    console.error('Error retrieving loan request details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve loan request details',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router; 