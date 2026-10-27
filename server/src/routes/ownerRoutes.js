import express from 'express';
import { requireAuth, requireOwner } from '../middleware/authMiddleware.js';
import {
  getPlatformStats,
  getTenants,
  getTenantById,
  createTenant,
  updateTenant,
  activateTenant,
  deactivateTenant,
  archiveTenant,
  restoreTenant,
  deleteTenant,
  getActivityLogs,
} from '../controllers/ownerController.js';

const router = express.Router();

// Enforce authentication and platform owner authorization on all owner endpoints
router.use(requireAuth);
router.use(requireOwner);

router.get('/stats', getPlatformStats);
router.get('/tenants', getTenants);
router.post('/tenants', createTenant);
router.get('/tenants/:id', getTenantById);
router.patch('/tenants/:id', updateTenant);
router.post('/tenants/:id/activate', activateTenant);
router.post('/tenants/:id/deactivate', deactivateTenant);
router.post('/tenants/:id/archive', archiveTenant);
router.delete('/tenants/:id', deleteTenant);
router.post('/tenants/:id/restore', restoreTenant);
router.get('/activity-logs', getActivityLogs);

export default router;
