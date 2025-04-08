import express, { Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import { User } from '../../models/user.model';
import { RentalAgreement, RentalAgreementStatus } from '../../models/rental-agreement.model';
import { Payment } from '../../models/payment.model';
import { PaymentType } from '../../models/payment.model';
import { convertBigIntToString } from './utils';

const router = express.Router();

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

export default router; 