import express from 'express';
import {
  getPatterns,
  createPattern,
  updatePattern,
  deletePattern,
  togglePatternStatus,
} from '../controllers/patternController.js';
import { requireAuth, requireTenant } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireTenant);

router.get('/', getPatterns);
router.post('/', createPattern);
router.patch('/:id/status', togglePatternStatus);
router.patch('/:id', updatePattern);
router.put('/:id', updatePattern);
router.delete('/:id', deletePattern);

export default router;
