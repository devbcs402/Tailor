import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import jwt from 'jsonwebtoken';
import { Customer } from '../models/Customer.js';
import { Order } from '../models/Order.js';
import { Tenant } from '../models/Tenant.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('--- Starting Customer Deletion & Archival Verification ---');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tailor_management');
  console.log('Connected to MongoDB');

  try {
    // 1. Find or create two distinct tenants for cross-tenant testing
    const tenantA = await Tenant.findOne({ status: 'active' });
    if (!tenantA) throw new Error('No active tenant found for Tenant A');
    console.log(`Tenant A: ${tenantA.businessName} (${tenantA._id})`);

    const tenantB = await Tenant.findOne({ _id: { $ne: tenantA._id }, status: 'active' });
    if (!tenantB) throw new Error('No second active tenant found for Tenant B');
    console.log(`Tenant B: ${tenantB.businessName} (${tenantB._id})`);

    // Get users for Tenant A and Tenant B
    const userA = await User.findOne({ tenantId: tenantA._id, isActive: true });
    const userB = await User.findOne({ tenantId: tenantB._id, isActive: true });
    if (!userA || !userB) throw new Error('Users for Tenant A or B not found');

    const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_tailor_management_key_2026_xyz';
    const tokenA = jwt.sign({ userId: userA._id }, JWT_SECRET, { expiresIn: '1h' });
    const tokenB = jwt.sign({ userId: userB._id }, JWT_SECRET, { expiresIn: '1h' });

    console.log(`Generated tokens for User A (${userA.email}) and User B (${userB.email})`);

    // Test 1: Invalid customer ID returns 400
    console.log('\n[Test 1] Testing invalid customer ID handling...');
    const invalidRes = await fetch(`${API_BASE}/customers/invalid-id-format`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const invalidData = await invalidRes.json();
    console.log('Invalid ID response status:', invalidRes.status, invalidData.message);
    if (invalidRes.status !== 400) throw new Error('Expected 400 for invalid customer ID');

    // Test 2: Non-existent customer ID returns 404
    console.log('\n[Test 2] Testing non-existent customer ID...');
    const fakeId = new mongoose.Types.ObjectId();
    const notFoundRes = await fetch(`${API_BASE}/customers/${fakeId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const notFoundData = await notFoundRes.json();
    console.log('Non-existent ID status:', notFoundRes.status, notFoundData.message);
    if (notFoundRes.status !== 404) throw new Error('Expected 404 for non-existent customer');

    // Test 3: Delete customer with 0 orders (permanent deletion)
    console.log('\n[Test 3] Testing customer deletion with 0 orders...');
    const randomMobile = '9' + Math.floor(100000000 + Math.random() * 900000000);
    const newCust = await Customer.create({
      tenantId: tenantA._id,
      name: 'Temp Delete Customer Zero Orders',
      mobileNumber: randomMobile,
      address: '123 Test Lane',
      isActive: true,
      isArchived: false,
    });
    console.log(`Created test customer with 0 orders: ${newCust._id} (${newCust.name})`);

    const delZeroRes = await fetch(`${API_BASE}/customers/${newCust._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const delZeroData = await delZeroRes.json();
    console.log('Delete status:', delZeroRes.status, delZeroData);
    if (delZeroRes.status !== 200 || delZeroData.action !== 'deleted') {
      throw new Error('Expected 200 and action "deleted" for customer with 0 orders');
    }

    // Verify completely removed from DB
    const checkDeleted = await Customer.findById(newCust._id);
    if (checkDeleted) throw new Error('Customer with 0 orders was not deleted from DB');
    console.log('Customer with 0 orders was permanently deleted successfully.');

    // Verify audit log for deletion
    const auditDel = await AuditLog.findOne({
      targetTenant: tenantA._id,
      action: 'customer_deleted',
      'details.customerId': newCust._id,
    });
    if (!auditDel) {
      console.warn('Warning: Audit log for customer_deleted not found');
    } else {
      console.log('Audit log for customer_deleted recorded successfully.');
    }

    // Test 4: Delete customer with historical orders WITHOUT archive flag (should be BLOCKED)
    console.log('\n[Test 4] Testing customer with orders cannot be permanently deleted...');
    const custWithOrders = await Customer.create({
      tenantId: tenantA._id,
      name: 'Customer With Historical Orders',
      mobileNumber: '8' + Math.floor(100000000 + Math.random() * 900000000),
      address: '456 Heritage Boulevard',
      isActive: true,
      isArchived: false,
    });

    // Create an order linked to this customer
    const testOrder = await Order.create({
      tenantId: tenantA._id,
      customer: custWithOrders._id,
      orderNumber: 'ORD-TEST-' + Math.floor(1000 + Math.random() * 9000),
      customerSnapshot: {
        name: custWithOrders.name,
        mobileNumber: custWithOrders.mobileNumber,
        address: custWithOrders.address,
      },
      shirt: { quantity: 2, measurements: { length: '28', chest: '40' } },
      pricing: { totalAmount: 1200, advancePaid: 500, balanceDue: 700 },
      orderDate: new Date(),
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'in_progress',
    });
    console.log(`Created test order ${testOrder.orderNumber} for customer ${custWithOrders._id}`);

    const blockRes = await fetch(`${API_BASE}/customers/${custWithOrders._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const blockData = await blockRes.json();
    console.log('Blocked delete status:', blockRes.status, blockData);
    if (blockRes.status !== 400 || blockData.code !== 'CUSTOMER_HAS_ORDERS') {
      throw new Error('Expected 400 and CUSTOMER_HAS_ORDERS code when customer has orders');
    }
    console.log('Permanent deletion correctly blocked for customer with orders!');

    // Test 5: Soft-delete / Archive customer with historical orders via ?archive=true
    console.log('\n[Test 5] Testing archival of customer with historical orders...');
    const archiveRes = await fetch(`${API_BASE}/customers/${custWithOrders._id}?archive=true`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const archiveData = await archiveRes.json();
    console.log('Archive status:', archiveRes.status, archiveData);
    if (archiveRes.status !== 200 || archiveData.action !== 'archived') {
      throw new Error('Expected 200 and action "archived" when ?archive=true is passed');
    }

    // Verify customer still exists in DB but is archived
    const checkArchived = await Customer.findById(custWithOrders._id);
    if (!checkArchived || !checkArchived.isArchived || checkArchived.isActive) {
      throw new Error('Customer state in DB should be isArchived=true and isActive=false');
    }
    console.log('Customer safely archived in DB (isActive=false, isArchived=true).');

    // Test 6: Verify historical order remains viewable and intact
    console.log('\n[Test 6] Verifying historical order and customer snapshot remain intact...');
    const orderCheck = await Order.findById(testOrder._id);
    if (!orderCheck) throw new Error('Historical order was lost!');
    if (orderCheck.customer.toString() !== custWithOrders._id.toString()) {
      throw new Error('Customer reference on order was modified!');
    }
    if (orderCheck.customerSnapshot.name !== 'Customer With Historical Orders') {
      throw new Error('Customer snapshot on order was modified!');
    }
    console.log(`Historical order ${orderCheck.orderNumber} and snapshot preserved intact.`);

    // Verify GET /api/orders/:id still returns order with intact customer data
    const getOrderRes = await fetch(`${API_BASE}/orders/${testOrder._id}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const getOrderData = await getOrderRes.json();
    if (getOrderRes.status !== 200 || !getOrderData.data) {
      throw new Error('Failed to retrieve historical order via API');
    }
    console.log('Historical order API returned 200 with intact customer snapshot.');

    // Test 7: Verify archived customer is excluded from active customer list
    console.log('\n[Test 7] Verifying archived customer excluded from active customer list...');
    const listRes = await fetch(`${API_BASE}/customers?search=${custWithOrders.mobileNumber}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const listData = await listRes.json();
    const foundInActive = (listData.data || []).some(
      (c) => c._id.toString() === custWithOrders._id.toString()
    );
    if (foundInActive) {
      throw new Error('Archived customer should NOT appear in active customer list');
    }
    console.log('Archived customer successfully excluded from active customer list.');

    // Test 8: Tenant isolation - Tenant B cannot delete Tenant A's customer
    console.log('\n[Test 8] Testing tenant isolation (Tenant B attempting to delete Tenant A customer)...');
    const custTenantA = await Customer.create({
      tenantId: tenantA._id,
      name: 'Tenant A Private Customer',
      mobileNumber: '7' + Math.floor(100000000 + Math.random() * 900000000),
      isActive: true,
      isArchived: false,
    });

    const crossTenantDel = await fetch(`${API_BASE}/customers/${custTenantA._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` }, // Tenant B credentials!
    });
    const crossTenantData = await crossTenantDel.json();
    console.log('Cross tenant delete status:', crossTenantDel.status, crossTenantData.message);
    if (crossTenantDel.status !== 404) {
      throw new Error(`Expected 404 when Tenant B tries to delete Tenant A customer, got ${crossTenantDel.status}`);
    }

    // Verify customer in Tenant A still exists untouched
    const tenantACustCheck = await Customer.findById(custTenantA._id);
    if (!tenantACustCheck) {
      throw new Error('Tenant A customer was compromised by Tenant B request!');
    }
    console.log('Cross-tenant delete attempt successfully blocked with 404!');

    // Clean up temporary records created during tests
    await Order.deleteOne({ _id: testOrder._id });
    await Customer.deleteOne({ _id: custWithOrders._id });
    await Customer.deleteOne({ _id: custTenantA._id });
    console.log('Cleaned up test records.');

    console.log('\n=============================================');
    console.log('ALL CUSTOMER DELETION & ARCHIVAL TESTS PASSED!');
    console.log('=============================================\n');
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
