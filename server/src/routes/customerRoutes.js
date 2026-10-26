import express from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  updateCustomerMeasurements,
  getCustomerOrders,
} from '../controllers/customerController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', getCustomers);
router.post('/', createCustomer);
router.get('/:id', getCustomerById);
router.patch('/:id', updateCustomer);
router.patch('/:id/measurements', updateCustomerMeasurements);
router.get('/:id/orders', getCustomerOrders);

export default router;
