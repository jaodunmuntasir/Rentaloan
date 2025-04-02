import express, { Request, Response } from 'express';
import { Op } from 'sequelize';
import { authenticate } from '../middleware/auth';
import { User } from '../models/user.model';
import { RentalAgreement } from '../models/rental-agreement.model';
import { LoanRequest } from '../models/loan-request.model';
import { LoanOffer } from '../models/loan-offer.model';
import { LoanAgreement } from '../models/loan-agreement.model';
import { Payment } from '../models/payment.model';

const router = express.Router();

// Get current user profile
// @ts-ignore
router.get('/profile', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return user data without sensitive information
    res.json({
      id: user.id,
      email: user.email,
      name: user.get('name') || '',
      role: user.role,
      walletAddress: user.walletAddress,
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      message: 'Failed to fetch user profile',
      error: (error as Error).message
    });
  }
});

// Update user profile
// @ts-ignore
router.put('/profile', authenticate, async (req: Request, res: Response) => {
  try {
    const { name, walletAddress } = req.body;
    
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Only allow updating certain fields
    const updates: { [key: string]: string } = {};
    
    if (name) updates.name = name;
    if (walletAddress) updates.walletAddress = walletAddress;
    
    await user.update(updates);
    
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.get('name') || '',
        role: user.role,
        walletAddress: user.walletAddress,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      message: 'Failed to update user profile',
      error: (error as Error).message
    });
  }
});

// Get user dashboard data
// @ts-ignore
router.get('/dashboard', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    let rentalAgreements: any[] = [];
    let loanAgreements: any[] = [];
    let payments: any[] = [];
    
    // Get different data based on user role
    if (user.role === 'landlord') {
      // Get rental agreements where user is landlord
      rentalAgreements = await RentalAgreement.findAll({
        where: { landlordId: user.id },
        include: [
          { model: User, as: 'renter', attributes: ['id', 'email', 'walletAddress'] }
        ],
        order: [['createdDate', 'DESC']]
      });
      
      // Get payments received
      payments = await Payment.findAll({
        where: { recipientId: user.id },
        include: [
          { model: User, as: 'payer', attributes: ['id', 'email', 'walletAddress'] },
          { model: RentalAgreement, required: false },
          { model: LoanAgreement, required: false }
        ],
        order: [['paymentDate', 'DESC']],
        limit: 20
      });
    } else if (user.role === 'renter') {
      // Get rental agreements where user is renter
      rentalAgreements = await RentalAgreement.findAll({
        where: { renterId: user.id },
        include: [
          { model: User, as: 'landlord', attributes: ['id', 'email', 'walletAddress'] }
        ],
        order: [['createdDate', 'DESC']]
      });
      
      // Get loan requests made by user
      const loanRequests = await LoanRequest.findAll({
        where: { requesterId: user.id },
        include: [
          { model: RentalAgreement }
        ],
        order: [['createdAt', 'DESC']]
      });
      
      // Get loan agreements where user is borrower
      loanAgreements = await LoanAgreement.findAll({
        where: { borrowerId: user.id },
        include: [
          { model: User, as: 'lender', attributes: ['id', 'email', 'walletAddress'] }
        ],
        order: [['createdDate', 'DESC']]
      });
      
      // Get payments made
      payments = await Payment.findAll({
        where: { payerId: user.id },
        include: [
          { model: User, as: 'recipient', attributes: ['id', 'email', 'walletAddress'] },
          { model: RentalAgreement, required: false },
          { model: LoanAgreement, required: false }
        ],
        order: [['paymentDate', 'DESC']],
        limit: 20
      });
    } else if (user.role === 'lender') {
      // Get loan offers made by user
      const loanOffers = await LoanOffer.findAll({
        where: { lenderId: user.id },
        include: [
          { 
            model: LoanRequest,
            include: [
              { model: RentalAgreement },
              { model: User, as: 'requester', attributes: ['id', 'email', 'walletAddress'] }
            ]
          }
        ],
        order: [['createdAt', 'DESC']]
      });
      
      // Get loan agreements where user is lender
      loanAgreements = await LoanAgreement.findAll({
        where: { lenderId: user.id },
        include: [
          { model: User, as: 'borrower', attributes: ['id', 'email', 'walletAddress'] }
        ],
        order: [['createdDate', 'DESC']]
      });
      
      // Get loan payments received
      payments = await Payment.findAll({
        where: { recipientId: user.id, loanAgreementId: { [Op.ne]: null } },
        include: [
          { model: User, as: 'payer', attributes: ['id', 'email', 'walletAddress'] },
          { model: LoanAgreement }
        ],
        order: [['paymentDate', 'DESC']],
        limit: 20
      });
    }
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.get('name') || '',
        role: user.role,
        walletAddress: user.walletAddress
      },
      rentalAgreements,
      loanAgreements,
      payments
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      message: 'Failed to fetch dashboard data',
      error: (error as Error).message
    });
  }
});

// Get user payment history
// @ts-ignore
router.get('/payments', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await User.findOne({ where: { firebaseId: req.user?.uid } });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    let paymentQuery: any = {
      limit,
      offset,
      order: [['paymentDate', 'DESC']],
      include: [
        { model: RentalAgreement, required: false },
        { model: LoanAgreement, required: false }
      ]
    };
    
    // Filter payments based on type
    if (req.query.type === 'received') {
      paymentQuery.where = { recipientId: user.id };
      paymentQuery.include.push({ model: User, as: 'payer', attributes: ['id', 'email', 'walletAddress'] });
    } else {
      paymentQuery.where = { payerId: user.id };
      paymentQuery.include.push({ model: User, as: 'recipient', attributes: ['id', 'email', 'walletAddress'] });
    }
    
    // Additional filters
    if (req.query.agreement_type === 'rental') {
      paymentQuery.where.rentalAgreementId = { [Op.ne]: null };
      paymentQuery.where.loanAgreementId = null;
    } else if (req.query.agreement_type === 'loan') {
      paymentQuery.where.loanAgreementId = { [Op.ne]: null };
      paymentQuery.where.rentalAgreementId = null;
    }
    
    // Get total count for pagination
    const totalCount = await Payment.count({
      where: paymentQuery.where
    });
    
    // Get the payments
    const payments = await Payment.findAll(paymentQuery);
    
    res.json({
      payments,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({
      message: 'Failed to fetch payment history',
      error: (error as Error).message
    });
  }
});

export default router; 