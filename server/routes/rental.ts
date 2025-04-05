import express, { Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { User } from '../models/user.model';
import { RentalAgreement, RentalAgreementStatus } from '../models/rental-agreement.model';
import { Payment } from '../models/payment.model';
import { PaymentType } from '../models/payment.model';
import blockchainService from '../services/blockchain.service';
import sequelize from '../models';
import { Op } from 'sequelize';

const router = express.Router();

// Helper function to convert BigInt values to strings for JSON serialization
const convertBigIntToString = (obj: any, seen = new WeakSet()): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  // Handle circular references
  if (typeof obj === 'object') {
    if (seen.has(obj)) {
      return obj; // Return the object without further processing to avoid recursion
    }
    seen.add(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => convertBigIntToString(item, seen));
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = convertBigIntToString(obj[key], seen);
      }
    }
    return result;
  }
  
  return obj;
};

// Create rental agreement
// @ts-ignore
router.post('/create', authenticate, async (req: Request, res: Response) => {
  try {
    const { renterEmail, duration, securityDeposit, baseRent, name, contractAddress, transactionHash } = req.body;
    
    if (!renterEmail || !duration || !securityDeposit || !baseRent || !name || !contractAddress) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Find the landlord (the user creating the agreement)
    const landlord = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!landlord) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find the renter by email
    const renter = await User.findOne({ where: { email: renterEmail } });
    if (!renter) {
      return res.status(404).json({ message: 'Renter not found' });
    }
    
    // Calculate grace period (securityDeposit / baseRent)
    // Convert string values to proper numbers for calculation
    const securityDepositNum = parseFloat(securityDeposit);
    const baseRentNum = parseFloat(baseRent);
    const gracePeriod = Math.floor(securityDepositNum / baseRentNum);
    
    // Ensure grace period is within contract requirements (less than duration/2)
    const maxGracePeriod = Math.floor(duration / 2);
    const finalGracePeriod = Math.min(gracePeriod, maxGracePeriod);
    
    // Store the rental agreement in the database
    const rentalAgreement = await RentalAgreement.create({
      contractAddress,
      landlordId: landlord.id,
      renterId: renter.id,
      name,
      status: RentalAgreementStatus.INITIALIZED,
      duration,
      securityDeposit,
      baseRent,
      gracePeriod: finalGracePeriod
    });
    
    // If a transaction hash is provided, record the payment
    if (transactionHash) {
      await Payment.create({
        rentalAgreementId: rentalAgreement.id,
        payerId: landlord.id,
        recipientId: renter.id,
        amount: 0, // No actual payment for creation
        txHash: transactionHash,
        type: PaymentType.CONTRACT_CREATION,
        paymentDate: new Date()
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Rental agreement created successfully',
      agreement: {
        id: rentalAgreement.id,
        contractAddress: rentalAgreement.contractAddress,
        name: rentalAgreement.name,
        status: rentalAgreement.status,
        transactionHash
      }
    });
  } catch (error) {
    console.error('Error creating rental agreement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create rental agreement',
      error: (error as Error).message
    });
  }
});

// Get all rental agreements for the user
// @ts-ignore
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get agreements where the user is either the landlord or the renter
    const agreements = await RentalAgreement.findAll({
      where: {
        [Op.or]: [
          { landlordId: user.id },
          { renterId: user.id }
        ]
      },
      include: [
        { model: User, as: 'landlord', attributes: ['id', 'email', 'walletAddress'] },
        { model: User, as: 'renter', attributes: ['id', 'email', 'walletAddress'] }
      ]
    });
    
    // Add a userRole field to each agreement to indicate the user's role in this specific agreement
    const agreementsWithRole = agreements.map(agreement => {
      const agreementJson = agreement.toJSON();
      agreementJson.userRole = agreement.landlordId === user.id ? 'landlord' : 'renter';
      return agreementJson;
    });
    
    res.json({ agreements: agreementsWithRole });
  } catch (error) {
    console.error('Error retrieving rental agreements:', error);
    res.status(500).json({
      message: 'Failed to retrieve rental agreements',
      error: (error as Error).message
    });
  }
});

// Get a specific rental agreement
// @ts-ignore
router.get('/:address', authenticate, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find the rental agreement in the database
    const agreement = await RentalAgreement.findOne({
      where: { contractAddress: address },
      include: [
        { model: User, as: 'landlord', attributes: ['id', 'email', 'walletAddress'] },
        { model: User, as: 'renter', attributes: ['id', 'email', 'walletAddress'] }
      ]
    });
    
    if (!agreement) {
      return res.status(404).json({ message: 'Rental agreement not found' });
    }
    
    // Check if the user is associated with this agreement
    if (agreement.landlordId !== user.id && agreement.renterId !== user.id) {
      return res.status(403).json({ message: 'You are not authorized to view this agreement' });
    }
    
    // Get payment history
    const payments = await Payment.findAll({
      where: { rentalAgreementId: agreement.id },
      include: [
        { model: User, as: 'payer', attributes: ['id', 'email', 'walletAddress'] },
        { model: User, as: 'recipient', attributes: ['id', 'email', 'walletAddress'] }
      ],
      order: [['paymentDate', 'DESC']]
    });
    
    // Convert payments to plain objects to avoid circular references
    const paymentsPlain = payments.map(payment => {
      const plain = payment.get({ plain: true });
      return plain;
    });
    
    // Add user's role in this specific agreement
    const agreementJson = agreement.toJSON();
    agreementJson.userRole = agreement.landlordId === user.id ? 'landlord' : 'renter';
    
    // Try to get on-chain data, but don't fail if it's not available
    let onChainDetails = null;
    try {
      onChainDetails = await blockchainService.getRentalAgreementDetails(address);
      // Convert any BigInt values to strings for JSON serialization
      onChainDetails = convertBigIntToString(onChainDetails);
    } catch (error) {
      console.warn(`Could not fetch on-chain data for rental agreement ${address}:`, error);
    }
    
    // Convert any BigInt values in the response data to strings
    const responseData = {
      success: true,
      agreement: {
        ...agreementJson,
        onChain: onChainDetails
      },
      payments: convertBigIntToString(paymentsPlain)
    };
    
    res.json(responseData);
  } catch (error) {
    console.error('Error retrieving rental agreement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve rental agreement',
      error: (error as Error).message
    });
  }
});

// Pay security deposit
// @ts-ignore
router.post('/:address/pay-deposit', authenticate, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { transactionHash } = req.body;
    
    if (!transactionHash) {
      return res.status(400).json({ message: 'Transaction hash is required' });
    }
    
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find the rental agreement in the database
    const agreement = await RentalAgreement.findOne({
      where: { contractAddress: address },
      include: [
        { model: User, as: 'landlord' },
        { model: User, as: 'renter' }
      ]
    });
    
    if (!agreement) {
      return res.status(404).json({ message: 'Rental agreement not found' });
    }
    
    // Check if the user is the renter for this agreement
    if (agreement.renterId !== user.id) {
      return res.status(403).json({ message: 'Only the renter can pay the security deposit' });
    }
    
    // Check if the agreement is in INITIALIZED state
    if (agreement.status !== RentalAgreementStatus.INITIALIZED) {
      return res.status(400).json({ message: 'Security deposit already paid or contract closed' });
    }
    
    // Update the rental agreement status in the database
    await agreement.update({ status: RentalAgreementStatus.ACTIVE });
    
    // Record the payment in the database
    const payment = await Payment.create({
      rentalAgreementId: agreement.id,
      payerId: user.id,
      recipientId: agreement.landlordId,
      amount: agreement.securityDeposit,
      txHash: transactionHash,
      type: PaymentType.SECURITY_DEPOSIT,
      month: null,
      paymentDate: new Date()
    });
    
    res.json(convertBigIntToString({
      message: 'Security deposit paid successfully',
      payment: {
        id: payment.id,
        amount: payment.amount,
        type: payment.type,
        transactionHash: payment.txHash
      }
    }));
  } catch (error) {
    console.error('Error recording security deposit payment:', error);
    res.status(500).json({
      message: 'Failed to record security deposit payment',
      error: (error as Error).message
    });
  }
});

// Pay rent
// @ts-ignore
router.post('/:address/pay-rent', authenticate, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { amount, transactionHash, month } = req.body;
    
    if (!amount || !transactionHash || !month) {
      return res.status(400).json({ message: 'Amount, transaction hash, and month are required' });
    }
    
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find the rental agreement in the database
    const agreement = await RentalAgreement.findOne({
      where: { contractAddress: address },
      include: [
        { model: User, as: 'landlord' },
        { model: User, as: 'renter' }
      ]
    });
    
    if (!agreement) {
      return res.status(404).json({ message: 'Rental agreement not found' });
    }
    
    // Check if the user is the renter for this agreement
    if (agreement.renterId !== user.id) {
      return res.status(403).json({ message: 'Only the renter can pay rent' });
    }
    
    // Check if the agreement is in ACTIVE state
    if (agreement.status !== RentalAgreementStatus.ACTIVE) {
      return res.status(400).json({ message: 'Rental agreement is not active' });
    }
    
    // Record the payment in the database
    const payment = await Payment.create({
      rentalAgreementId: agreement.id,
      payerId: user.id,
      recipientId: agreement.landlordId,
      amount: parseFloat(amount),
      txHash: transactionHash,
      type: PaymentType.RENT,
      month: month,
      paymentDate: new Date()
    });
    
    res.json(convertBigIntToString({
      message: 'Rent payment recorded successfully',
      payment: {
        id: payment.id,
        amount: payment.amount,
        type: payment.type,
        month: payment.month,
        transactionHash: payment.txHash
      }
    }));
  } catch (error) {
    console.error('Error recording rent payment:', error);
    res.status(500).json({
      message: 'Failed to record rent payment',
      error: (error as Error).message
    });
  }
});

// Skip rent
// @ts-ignore
router.post('/:address/skip-rent', authenticate, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { month, transactionHash } = req.body;
    
    if (!month || !transactionHash) {
      return res.status(400).json({ message: 'Month and transaction hash are required' });
    }
    
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find the rental agreement in the database
    const agreement = await RentalAgreement.findOne({
      where: { contractAddress: address },
      include: [
        { model: User, as: 'landlord' },
        { model: User, as: 'renter' }
      ]
    });
    
    if (!agreement) {
      return res.status(404).json({ message: 'Rental agreement not found' });
    }
    
    // Check if the user is the renter for this agreement
    if (agreement.renterId !== user.id) {
      return res.status(403).json({ message: 'Only the renter can skip rent' });
    }
    
    // Check if the agreement is in ACTIVE state
    if (agreement.status !== RentalAgreementStatus.ACTIVE) {
      return res.status(400).json({ message: 'Rental agreement is not active' });
    }
    
    // Record the payment in the database
    const payment = await Payment.create({
      rentalAgreementId: agreement.id,
      payerId: user.id,
      recipientId: agreement.landlordId,
      amount: agreement.baseRent,
      txHash: transactionHash,
      type: PaymentType.RENT_SKIPPED,
      month: month,
      paymentDate: new Date()
    });
    
    res.json(convertBigIntToString({
      message: 'Rent skip recorded successfully',
      payment: {
        id: payment.id,
        amount: agreement.baseRent,
        type: payment.type,
        month: payment.month,
        transactionHash: payment.txHash
      }
    }));
  } catch (error) {
    console.error('Error recording skipped rent:', error);
    res.status(500).json({
      message: 'Failed to record skipped rent',
      error: (error as Error).message
    });
  }
});

// Extend rental agreement
// @ts-ignore
router.post('/:address/extend', authenticate, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { additionalMonths, transactionHash } = req.body;
    
    if (!additionalMonths || additionalMonths <= 0 || !transactionHash) {
      return res.status(400).json({ 
        message: 'Additional months must be a positive number and transaction hash is required' 
      });
    }
    
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find the rental agreement
    const agreement = await RentalAgreement.findOne({
      where: { contractAddress: address },
      include: [
        { model: User, as: 'landlord', attributes: ['id', 'email', 'walletAddress'] },
        { model: User, as: 'renter', attributes: ['id', 'email', 'walletAddress'] }
      ]
    });
    
    if (!agreement) {
      return res.status(404).json({ message: 'Rental agreement not found' });
    }
    
    // Check if the user is associated with this agreement
    if (agreement.landlordId !== user.id && agreement.renterId !== user.id) {
      return res.status(403).json({ message: 'You are not authorized to extend this agreement' });
    }
    
    // Update the duration in the database
    await agreement.update({
      duration: agreement.duration + additionalMonths
    });
    
    // Record the extension transaction in the payment history
    const payment = await Payment.create({
      rentalAgreementId: agreement.id,
      payerId: user.id,
      recipientId: user.id === agreement.landlordId ? agreement.renterId : agreement.landlordId,
      amount: 0, // No payment amount for extension
      txHash: transactionHash,
      type: PaymentType.CONTRACT_CREATION, // Use for extension since no specific type
      month: null,
      paymentDate: new Date()
    });
    
    res.json(convertBigIntToString({
      message: 'Rental agreement extension recorded successfully',
      newDuration: agreement.duration,
      payment: {
        id: payment.id,
        type: payment.type,
        transactionHash: payment.txHash
      }
    }));
  } catch (error) {
    console.error('Error recording rental agreement extension:', error);
    res.status(500).json({
      message: 'Failed to record rental agreement extension',
      error: (error as Error).message
    });
  }
});

// Update rental agreement status to CLOSED
// @ts-ignore
router.post('/:address/update-status-closed', authenticate, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find the rental agreement in the database
    const agreement = await RentalAgreement.findOne({
      where: { contractAddress: address }
    });
    
    if (!agreement) {
      return res.status(404).json({ message: 'Rental agreement not found' });
    }
    
    // Update the status to CLOSED
    await agreement.update({ status: RentalAgreementStatus.CLOSED });
    
    res.json({
      message: 'Rental agreement status updated to CLOSED successfully',
      status: RentalAgreementStatus.CLOSED
    });
  } catch (error) {
    console.error('Error updating rental agreement status:', error);
    res.status(500).json({
      message: 'Failed to update rental agreement status',
      error: (error as Error).message
    });
  }
});

export default router; 