import express from 'express';
import { login, ownerLogin, getMe, logout, changePassword } from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', login);
router.post('/owner-login', ownerLogin);
router.get('/me', requireAuth, getMe);
router.post('/change-password', requireAuth, changePassword);
router.post('/logout', requireAuth, logout);

export default router;
