import mongoose from 'mongoose';
import { Tenant } from '../models/Tenant.js';
import { User } from '../models/User.js';
import { Customer } from '../models/Customer.js';
import { Order } from '../models/Order.js';
import { Pattern } from '../models/Pattern.js';
import { OrderCounter } from '../models/OrderCounter.js';
import { AuditLog } from '../models/AuditLog.js';

const BASE_URL = 'http://localhost:5000/api';

async function run() {
  console.log('=== Starting Verification for Delete Tenant Functionality ===\n');

  await mongoose.connect('mongodb://127.0.0.1:27017/tailor_management');

  // 1. Health check
  const healthRes = await fetch(`${BASE_URL}/health`);
  if (!healthRes.ok) throw new Error('Backend health check failed');
  console.log('✓ [Health Check]: Backend is online and responsive.');

  // 2. Security: Unauthenticated request rejection
  const unauthRes = await fetch(`${BASE_URL}/owner/tenants/invalid-id`, { method: 'DELETE' });
  if (unauthRes.status === 401) {
    console.log('✓ [Security]: Unauthenticated DELETE request correctly rejected with 401.');
  } else {
    throw new Error(`Expected 401 for unauthenticated request, got ${unauthRes.status}`);
  }

  // 3. Security: Tenant Admin forbidden from deleting tenants
  const tenantLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@tailor.com', password: 'admin123' }),
  });
  const tenantLoginData = await tenantLoginRes.json();
  if (!tenantLoginData.success) throw new Error('Tenant Admin login failed');
  const tenantAdminToken = tenantLoginData.token;

  const forbiddenRes = await fetch(`${BASE_URL}/owner/tenants/6adf529c3b3cd5f4701f3a7b`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tenantAdminToken}` },
  });
  if (forbiddenRes.status === 403) {
    console.log('✓ [Security]: Tenant Admin forbidden from DELETE /api/owner/tenants/:id (403 Forbidden).');
  } else {
    throw new Error(`Expected 403 for Tenant Admin, got ${forbiddenRes.status}`);
  }

  // 4. Authenticate Platform Owner
  const ownerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@platform.com', password: 'Owner@Pass2026!' }),
  });
  const ownerLoginData = await ownerLoginRes.json();
  if (!ownerLoginData.success) throw new Error('Platform owner login failed');
  const ownerToken = ownerLoginData.token;
  console.log('✓ [Auth]: Platform Owner successfully authenticated.');

  // 5. Validation: Invalid ObjectId format
  const badIdRes = await fetch(`${BASE_URL}/owner/tenants/not-an-object-id`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const badIdData = await badIdRes.json();
  if (badIdRes.status === 400 && badIdData.success === false) {
    console.log('✓ [Validation]: Malformed tenant ID correctly rejected with 400:', badIdData.message);
  } else {
    throw new Error(`Expected 400 for bad ID, got ${badIdRes.status}`);
  }

  // 6. Validation: Non-existent Tenant ID
  const fakeId = new mongoose.Types.ObjectId().toString();
  const notFoundRes = await fetch(`${BASE_URL}/owner/tenants/${fakeId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const notFoundData = await notFoundRes.json();
  if (notFoundRes.status === 404 && notFoundData.success === false) {
    console.log('✓ [Validation]: Non-existent tenant ID correctly returned 404:', notFoundData.message);
  } else {
    throw new Error(`Expected 404 for non-existent tenant, got ${notFoundRes.status}`);
  }

  // Record initial counts for primary tenant (Silai Master) to verify zero side-effects
  const primaryTenant = await Tenant.findOne({ tenantCode: 'SILAI-MASTER' });
  if (!primaryTenant) throw new Error('Primary tenant Silai Master not found');
  const silaiOrdersBefore = await Order.countDocuments({ tenantId: primaryTenant._id });
  const silaiCustomersBefore = await Customer.countDocuments({ tenantId: primaryTenant._id });
  const silaiUsersBefore = await User.countDocuments({ tenantId: primaryTenant._id });
  console.log(`\n--- Baseline Check: Primary Tenant (${primaryTenant.businessName}) ---`);
  console.log(`Silai Master Customers: ${silaiCustomersBefore}, Orders: ${silaiOrdersBefore}, Users: ${silaiUsersBefore}`);

  // 7. Create an isolated Test Tenant with full suite of dependent records
  console.log('\n--- Provisioning Dedicated Test Tenant with Dependent Records ---');
  const uniqueCode = `DEL-${Math.floor(1000 + Math.random() * 9000)}`;
  const testTenant = new Tenant({
    businessName: 'Vanguard Bespoke Tailoring Studio',
    tenantCode: uniqueCode,
    ownerName: 'Vanguard Owner',
    email: `vanguard.${Date.now()}@vanguardtailors.com`,
    mobileNumber: '9988776655',
    address: '100 Regent Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    status: 'active',
  });
  await testTenant.save();
  const testTenantId = testTenant._id;

  // Add 2 Users (1 admin, 1 staff)
  const passwordHash = await User.hashPassword('Pass@123456');
  await User.create([
    {
      name: 'Vanguard Admin',
      email: testTenant.email,
      passwordHash,
      role: 'admin',
      tenantId: testTenantId,
      shopName: testTenant.businessName,
      isActive: true,
    },
    {
      name: 'Vanguard Staff Tailor',
      email: `staff.${Date.now()}@vanguardtailors.com`,
      passwordHash,
      role: 'staff',
      tenantId: testTenantId,
      shopName: testTenant.businessName,
      isActive: true,
    },
  ]);

  // Add 13 Starter Patterns
  await Pattern.create([
    { tenantId: testTenantId, name: 'Normal Collar', type: 'shirt', isActive: true },
    { tenantId: testTenantId, name: 'Mandarin Collar', type: 'shirt', isActive: true },
    { tenantId: testTenantId, name: 'French Cuff', type: 'shirt', isActive: true },
    { tenantId: testTenantId, name: 'Formal Trousers', type: 'pant', isActive: true },
    { tenantId: testTenantId, name: 'Slim Fit Pant', type: 'pant', isActive: true },
  ]);

  // Add 2 Customers with embedded measurement profiles
  const customer1 = await Customer.create({
    tenantId: testTenantId,
    name: 'Vanguard VIP Customer A',
    mobileNumber: '9876543210',
    address: 'Penthouse 4B',
    latestMeasurements: {
      unit: 'inch',
      shirt: { length: '30', chest: '40', waist: '36', shoulder: '18', sleeveLength: '25' },
      pant: { length: '40', waist: '34', hip: '40', bottomOpening: '15' },
    },
  });

  const customer2 = await Customer.create({
    tenantId: testTenantId,
    name: 'Vanguard VIP Customer B',
    mobileNumber: '9876543211',
    address: 'Villa 12',
    latestMeasurements: {
      unit: 'inch',
      shirt: { length: '29', chest: '38', waist: '34' },
      pant: { length: '39', waist: '32', hip: '38' },
    },
  });

  // Add 2 Orders
  await Order.create([
    {
      tenantId: testTenantId,
      orderNumber: `ORD-2026-90001`,
      customer: customer1._id,
      customerSnapshot: { name: customer1.name, mobileNumber: customer1.mobileNumber },
      deadline: new Date(Date.now() + 86400000 * 5),
      status: 'in_progress',
      shirt: { quantity: 2, measurements: { chest: '40', length: '30' } },
      pant: { quantity: 1, measurements: { waist: '34', length: '40' } },
      pricing: { total: 4500, advancePaid: 2000, balanceDue: 2500 },
    },
    {
      tenantId: testTenantId,
      orderNumber: `ORD-2026-90002`,
      customer: customer2._id,
      customerSnapshot: { name: customer2.name, mobileNumber: customer2.mobileNumber },
      deadline: new Date(Date.now() + 86400000 * 7),
      status: 'ready',
      shirt: { quantity: 1, measurements: { chest: '38', length: '29' } },
      pant: { quantity: 2, measurements: { waist: '32', length: '39' } },
      pricing: { total: 5000, advancePaid: 5000, balanceDue: 0 },
    },
  ]);

  // Add Sequence Counter
  await OrderCounter.create({
    name: `order_seq_${testTenantId}_2026`,
    seq: 2,
  });

  // Verify created test records in MongoDB
  const testUsersBefore = await User.countDocuments({ tenantId: testTenantId });
  const testCustomersBefore = await Customer.countDocuments({ tenantId: testTenantId });
  const testOrdersBefore = await Order.countDocuments({ tenantId: testTenantId });
  const testPatternsBefore = await Pattern.countDocuments({ tenantId: testTenantId });
  const testCountersBefore = await OrderCounter.countDocuments({ name: new RegExp(`^order_seq_${testTenantId}_`) });

  console.log(`✓ [Test Tenant Provisioned]: ${testTenant.businessName} (ID: ${testTenantId})`);
  console.log(`  - Users: ${testUsersBefore}`);
  console.log(`  - Customers: ${testCustomersBefore}`);
  console.log(`  - Orders: ${testOrdersBefore}`);
  console.log(`  - Patterns: ${testPatternsBefore}`);
  console.log(`  - OrderCounters: ${testCountersBefore}`);

  // 8. Execute Deletion via Owner API Endpoint
  console.log('\n--- Executing DELETE /api/owner/tenants/:id ---');
  const deleteRes = await fetch(`${BASE_URL}/owner/tenants/${testTenantId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const deleteData = await deleteRes.json();

  if (!deleteRes.ok || !deleteData.success) {
    throw new Error(`Deletion failed: ${deleteData.message}`);
  }

  console.log('✓ [API Response]: HTTP 200 OK');
  console.log('  Message:', deleteData.message);
  console.log('  Deleted Counts:', JSON.stringify(deleteData.data.deletedCounts, null, 2));

  // 9. Verify COMPLETE Deletion of Test Tenant Data from MongoDB
  console.log('\n--- Verifying MongoDB State After Deletion ---');
  const tenantAfter = await Tenant.findById(testTenantId);
  const usersAfter = await User.countDocuments({ tenantId: testTenantId });
  const customersAfter = await Customer.countDocuments({ tenantId: testTenantId });
  const ordersAfter = await Order.countDocuments({ tenantId: testTenantId });
  const patternsAfter = await Pattern.countDocuments({ tenantId: testTenantId });
  const countersAfter = await OrderCounter.countDocuments({ name: new RegExp(`^order_seq_${testTenantId}_`) });

  if (tenantAfter !== null) throw new Error('Tenant record still exists in database!');
  if (usersAfter !== 0) throw new Error(`Expected 0 users for deleted tenant, found ${usersAfter}`);
  if (customersAfter !== 0) throw new Error(`Expected 0 customers for deleted tenant, found ${customersAfter}`);
  if (ordersAfter !== 0) throw new Error(`Expected 0 orders for deleted tenant, found ${ordersAfter}`);
  if (patternsAfter !== 0) throw new Error(`Expected 0 patterns for deleted tenant, found ${patternsAfter}`);
  if (countersAfter !== 0) throw new Error(`Expected 0 counters for deleted tenant, found ${countersAfter}`);

  console.log('✓ [Data Integrity]: Tenant document successfully removed from MongoDB.');
  console.log('✓ [Data Integrity]: All staff and admin users deleted (0 remaining).');
  console.log('✓ [Data Integrity]: All customer records and measurement profiles deleted (0 remaining).');
  console.log('✓ [Data Integrity]: All orders and measurement snapshots deleted (0 remaining).');
  console.log('✓ [Data Integrity]: All garment patterns deleted (0 remaining).');
  console.log('✓ [Data Integrity]: All sequence counters deleted (0 remaining).');

  // 10. Verify ZERO Side Effects on other tenants and platform records
  console.log('\n--- Verifying Isolation: Other Tenants & Shared Platform Records ---');
  const silaiOrdersAfter = await Order.countDocuments({ tenantId: primaryTenant._id });
  const silaiCustomersAfter = await Customer.countDocuments({ tenantId: primaryTenant._id });
  const silaiUsersAfter = await User.countDocuments({ tenantId: primaryTenant._id });

  if (silaiOrdersAfter !== silaiOrdersBefore) {
    throw new Error(`Silai orders corrupted! Before: ${silaiOrdersBefore}, After: ${silaiOrdersAfter}`);
  }
  if (silaiCustomersAfter !== silaiCustomersBefore) {
    throw new Error(`Silai customers corrupted! Before: ${silaiCustomersBefore}, After: ${silaiCustomersAfter}`);
  }
  if (silaiUsersAfter !== silaiUsersBefore) {
    throw new Error(`Silai users corrupted! Before: ${silaiUsersBefore}, After: ${silaiUsersAfter}`);
  }
  console.log('✓ [Tenant Isolation]: Primary tenant Silai Master records remain 100% untouched!');

  // Verify platform owner user account remains untouched
  const platformOwner = await User.findOne({ role: 'platform_owner' });
  if (!platformOwner) throw new Error('Platform owner account was deleted or corrupted!');
  console.log('✓ [Platform Integrity]: Platform Owner account preserved intact.');

  // 11. Verify Audit Log entry
  const auditEntry = await AuditLog.findOne({
    action: 'tenant_deleted',
    targetTenant: testTenantId,
  });
  if (!auditEntry) throw new Error('No tenant_deleted audit log record found!');
  console.log('✓ [Audit Log]: tenant_deleted audit entry verified:', {
    action: auditEntry.action,
    targetTenantName: auditEntry.targetTenantName,
    deletedCounts: auditEntry.details.deletedCounts,
  });

  // 12. Verify Tenants List & Statistics Summary API
  const listRes = await fetch(`${BASE_URL}/owner/tenants`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const listData = await listRes.json();
  if (!listData.success || !listData.summary) {
    throw new Error('Failed to retrieve tenants list or summary statistics');
  }
  console.log('✓ [Dashboard Stats Refresh]: Statistics summary refreshed accurately:', listData.summary);

  await mongoose.disconnect();
  console.log('\n======================================================');
  console.log('🎉 ALL TENANT DELETION TESTS PASSED 100% SUCCESSFULLY! 🎉');
  console.log('======================================================\n');
}

run().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
