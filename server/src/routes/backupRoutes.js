import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  getBackupsSummary,
  triggerBackup,
  getLatestBackup,
  downloadBackup,
  restoreFromLocalBackup,
  restoreFromPayload,
  deleteBackup,
} from '../controllers/backupController.js';

const router = express.Router();

// All backup routes require authenticated admin access
router.get('/', requireAuth, getBackupsSummary);
router.post('/trigger', requireAuth, triggerBackup);
router.get('/latest-data', requireAuth, getLatestBackup);
router.get('/download/:filename', requireAuth, downloadBackup);
router.post('/restore/:filename', requireAuth, restoreFromLocalBackup);
router.post('/restore-data', requireAuth, restoreFromPayload);
router.delete('/:filename', requireAuth, deleteBackup);

export default router;
