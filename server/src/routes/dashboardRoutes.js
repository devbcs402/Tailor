import express from 'express';
import { getDashboardSummary } from '../controllers/dashboardController.js';
import { requireAuth, requireTenant } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireTenant);

router.get('/summary', getDashboardSummary);

export default router;
