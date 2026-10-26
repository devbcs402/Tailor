import express from 'express';
import {
  getPatterns,
  createPattern,
  updatePattern,
  deletePattern,
} from '../controllers/patternController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', getPatterns);
router.post('/', createPattern);
router.patch('/:id', updatePattern);
router.put('/:id', updatePattern);
router.delete('/:id', deletePattern);

export default router;
