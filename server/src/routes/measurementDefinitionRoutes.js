import express from 'express';
import {
  getMeasurementDefinitions,
  createMeasurementDefinition,
  updateMeasurementDefinition,
  toggleMeasurementDefinitionStatus,
  reorderMeasurementDefinitions,
} from '../controllers/measurementDefinitionController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Strict tenant authentication required for all measurement definitions
router.use(requireAuth);

router.get('/', getMeasurementDefinitions);
router.post('/', createMeasurementDefinition);
router.put('/reorder', reorderMeasurementDefinitions);
router.put('/:id', updateMeasurementDefinition);
router.patch('/:id/status', toggleMeasurementDefinitionStatus);
router.patch('/:id', updateMeasurementDefinition);

export default router;
