import express from 'express';
import agreementRoutes from './agreement';
import paymentRoutes from './payment';

const router = express.Router();

// Mount the agreement routes
router.use('/', agreementRoutes);

// Mount the payment routes
router.use('/', paymentRoutes);

export default router; 