import express from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  updateCustomerMeasurements,
  getCustomerOrders,
  deleteCustomer,
  archiveCustomer,
} from '../controllers/customerController.js';
import { requireAuth, requireTenant } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireTenant);

router.get('/', getCustomers);
router.post('/', createCustomer);
router.get('/:id', getCustomerById);
router.patch('/:id', updateCustomer);
router.put('/:id', updateCustomer);
router.patch('/:id/measurements', updateCustomerMeasurements);
router.get('/:id/orders', getCustomerOrders);
router.delete('/:id', deleteCustomer);
router.post('/:id/archive', archiveCustomer);

export default router;
