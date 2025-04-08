import express from 'express';
import requestRoutes from './request';
import offerRoutes from './offer';
import agreementRoutes from './agreement';

const router = express.Router();

// Mount the request routes
router.use('/request', requestRoutes);
router.use('/requests', requestRoutes);

// Mount the offer routes
router.use('/offer', offerRoutes);

// Mount the agreement routes
router.use('/agreement', agreementRoutes);
router.use('/agreements', agreementRoutes);

// Direct paths for specific routes that don't fit the pattern
router.use('/myrequests', (req, res, next) => {
  req.url = '/my'; // Rewrite URL
  requestRoutes(req, res, next);
});

router.use('/myoffers', (req, res, next) => {
  req.url = '/my'; // Rewrite URL
  offerRoutes(req, res, next);
});

export default router; 