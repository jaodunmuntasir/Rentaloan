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

// Create rental agreement
// @ts-ignore
router.post('/create', authenticate, async (req: Request, res: Response) => {
  try {
    const { renterEmail, duration, securityDeposit, baseRent, name, contractAddress } = req.body;
    
    if (!renterEmail || !duration || !securityDeposit || !baseRent || !name) {
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
    const gracePeriod = Math.floor(Number(securityDeposit) / Number(baseRent));
    
    // Contract creation result
    let result: { contractAddress: string, transactionHash?: string };
    
    if (contractAddress) {
      // If contract address is provided, skip blockchain contract creation
      console.log('Contract already created at address:', contractAddress);
      result = { contractAddress };
      
      // Validate the contract exists on the blockchain
      try {
        await blockchainService.getRentalAgreementDetails(contractAddress);
      } catch (error) {
        return res.status(400).json({ 
          message: 'Invalid contract address or contract not found on blockchain',
          error: (error as Error).message
        });
      }
    } else {
      // Create the rental agreement on the blockchain
      result = await blockchainService.createRentalAgreement(
        landlord.walletAddress,
        renter.walletAddress,
        duration,
        securityDeposit.toString(),
        baseRent.toString(),
        gracePeriod,
        name
      );
    }
    
    // Store the rental agreement in the database
    const rentalAgreement = await RentalAgreement.create({
      contractAddress: result.contractAddress,
      landlordId: landlord.id,
      renterId: renter.id,
      name,
      status: RentalAgreementStatus.INITIALIZED,
      duration,
      securityDeposit,
      baseRent,
      gracePeriod
    });
    
    res.status(201).json({
      message: 'Rental agreement created successfully',
      agreement: {
        id: rentalAgreement.id,
        contractAddress: rentalAgreement.contractAddress,
        name: rentalAgreement.name,
        status: rentalAgreement.status,
        transactionHash: result.transactionHash
      }
    });
  } catch (error) {
    console.error('Error creating rental agreement:', error);
    res.status(500).json({
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
    
    // Get on-chain data
    const onChainDetails = await blockchainService.getRentalAgreementDetails(address);
    
    // Get payment history
    const payments = await Payment.findAll({
      where: { rentalAgreementId: agreement.id },
      include: [
        { model: User, as: 'payer', attributes: ['id', 'email', 'walletAddress'] },
        { model: User, as: 'recipient', attributes: ['id', 'email', 'walletAddress'] }
      ],
      order: [['paymentDate', 'DESC']]
    });
    
    // Add user's role in this specific agreement
    const agreementJson = agreement.toJSON();
    agreementJson.userRole = agreement.landlordId === user.id ? 'landlord' : 'renter';
    
    res.json({
      agreement: {
        ...agreementJson,
        onChain: onChainDetails
      },
      payments
    });
  } catch (error) {
    console.error('Error retrieving rental agreement:', error);
    res.status(500).json({
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
    
    // Pay the security deposit on the blockchain
    const result = await blockchainService.paySecurityDeposit(
      address,
      user.walletAddress,
      agreement.securityDeposit.toString()
    );
    
    // Update the rental agreement status in the database
    await agreement.update({ status: RentalAgreementStatus.ACTIVE });
    
    // Record the payment in the database
    const payment = await Payment.create({
      rentalAgreementId: agreement.id,
      payerId: user.id,
      recipientId: agreement.landlordId,
      amount: agreement.securityDeposit,
      txHash: result.transactionHash,
      type: PaymentType.SECURITY_DEPOSIT,
      month: null,
      paymentDate: new Date()
    });
    
    res.json({
      message: 'Security deposit paid successfully',
      payment: {
        id: payment.id,
        amount: payment.amount,
        type: payment.type,
        transactionHash: payment.txHash
      }
    });
  } catch (error) {
    console.error('Error paying security deposit:', error);
    res.status(500).json({
      message: 'Failed to pay security deposit',
      error: (error as Error).message
    });
  }
});

// Pay rent
// @ts-ignore
router.post('/:address/pay-rent', authenticate, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { month } = req.body;
    
    if (!month) {
      return res.status(400).json({ message: 'Month is required' });
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
    
    // Get on-chain data to calculate due amount
    const onChainDetails = await blockchainService.getRentalAgreementDetails(address);
    const dueAmount = parseFloat(onChainDetails.dueAmount);
    const baseRent = parseFloat(onChainDetails.baseRent);
    const totalAmount = dueAmount + baseRent;
    
    // Pay the rent on the blockchain
    const result = await blockchainService.payRent(
      address,
      user.walletAddress,
      month,
      totalAmount.toString()
    );
    
    // Record the payment in the database
    const payment = await Payment.create({
      rentalAgreementId: agreement.id,
      payerId: user.id,
      recipientId: agreement.landlordId,
      amount: totalAmount,
      txHash: result.transactionHash,
      type: PaymentType.RENT,
      month: month,
      paymentDate: new Date()
    });
    
    res.json({
      message: 'Rent paid successfully',
      payment: {
        id: payment.id,
        amount: payment.amount,
        type: payment.type,
        month: payment.month,
        transactionHash: payment.txHash
      }
    });
  } catch (error) {
    console.error('Error paying rent:', error);
    res.status(500).json({
      message: 'Failed to pay rent',
      error: (error as Error).message
    });
  }
});

// Skip rent
// @ts-ignore
router.post('/:address/skip-rent', authenticate, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { month } = req.body;
    
    if (!month) {
      return res.status(400).json({ message: 'Month is required' });
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
    
    // Skip the rent on the blockchain
    const result = await blockchainService.skipRent(
      address,
      user.walletAddress,
      month
    );
    
    res.json({
      message: 'Rent skipped successfully',
      transactionHash: result.transactionHash
    });
  } catch (error) {
    console.error('Error skipping rent:', error);
    res.status(500).json({
      message: 'Failed to skip rent',
      error: (error as Error).message
    });
  }
});

// Extend rental agreement
// @ts-ignore
router.post('/:address/extend', authenticate, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { additionalMonths } = req.body;
    
    if (!additionalMonths || additionalMonths <= 0) {
      return res.status(400).json({ message: 'Additional months must be a positive number' });
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
    
    // Get on-chain details to verify current month
    const onChainDetails = await blockchainService.getRentalAgreementDetails(address);
    
    // Check if the agreement is in the last month of its term
    const monthsPassed = parseInt(onChainDetails.lastPaidMonth.toString());
    const duration = parseInt(onChainDetails.duration.toString());
    
    if (monthsPassed < duration - 1) { // 0-indexed months, so last month is duration-1
      return res.status(400).json({ 
        message: 'Rental agreement can only be extended in the last month of its term',
        currentMonth: monthsPassed + 1, // Convert to 1-indexed for response
        duration
      });
    }
    
    // Extend the agreement on the blockchain
    const result = await blockchainService.extendRentalAgreement(
      address,
      user.walletAddress,
      additionalMonths
    );
    
    // Update the duration in the database
    await agreement.update({
      duration: agreement.duration + additionalMonths
    });
    
    res.json({
      message: 'Rental agreement extended successfully',
      newDuration: agreement.duration,
      transactionHash: result.transactionHash
    });
  } catch (error) {
    console.error('Error extending rental agreement:', error);
    res.status(500).json({
      message: 'Failed to extend rental agreement',
      error: (error as Error).message
    });
  }
});

export default router; 