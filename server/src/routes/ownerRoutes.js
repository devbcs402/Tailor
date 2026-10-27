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
  resetTenantAdminPassword,
  getActivityLogs,
  deleteActivityLogsByDate,
} from '../controllers/ownerController.js';
import { ownerLogin } from '../controllers/authController.js';

const router = express.Router();

// Public Platform Owner Login endpoint (unauthenticated)
router.post('/login', ownerLogin);

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
router.post('/tenants/:id/reset-password', resetTenantAdminPassword);
router.get('/activity-logs', getActivityLogs);
router.delete('/activity-logs', deleteActivityLogsByDate);
router.post('/activity-logs/delete-by-date', deleteActivityLogsByDate);

export default router;
