/**
 * Comprehensive Automated Verification Suite for:
 * 1. Order Editing (preserving ID, orderDate, orderNumber, no duplicates)
 * 2. Customer Measurement Selection & Snapshots vs Default Profile Updates
 * 3. Password Validation (rejecting 7 chars, accepting exactly 8 chars)
 * 4. Tenant Isolation during Order Mutations
 */

const BASE_URL = 'http://localhost:5000/api';

async function request(url, options = {}) {
  const fullUrl = `${BASE_URL}${url}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(fullUrl, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, ok: res.ok, data };
}

let passedTests = 0;
let failedTests = 0;

function assert(condition, scenarioName, details = '') {
  if (condition) {
    console.log(`  ✓ PASS: ${scenarioName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${scenarioName} - ${details}`);
    failedTests++;
  }
}

async function runVerification() {
  console.log('\n========================================================================');
  console.log('   ORDER EDITING, MEASUREMENT SNAPSHOTS & PASSWORD TEST SUITE          ');
  console.log('========================================================================\n');

  try {
    // -------------------------------------------------------------
    // Setup: Platform Owner Login
    // -------------------------------------------------------------
    console.log('--- SETUP: Platform Owner Login ---');
    const ownerLoginRes = await request('/auth/login', {
      method: 'POST',
      body: { email: 'owner@platform.com', password: 'Owner@Pass2026!' },
    });
    assert(ownerLoginRes.status === 200, 'Platform owner login successful');
    const ownerToken = ownerLoginRes.data.token;

    // -------------------------------------------------------------
    // Password Validation Tests (Scenarios 9, 10, 11, 12)
    // -------------------------------------------------------------
    console.log('\n--- PASSWORD VALIDATION (Scenarios 9, 10, 11, 12) ---');

    // 1. Create Tenant A with initial admin password
    const uniqueSuffix = Date.now().toString().slice(-4);
    const tenantARes = await request('/owner/tenants', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: {
        businessName: `Royal Bespoke ${uniqueSuffix}`,
        ownerName: 'Vikram Patel',
        email: `admin_${uniqueSuffix}@royal.com`,
        mobileNumber: '9123456789',
        address: '10 Ring Road',
        city: 'Ahmedabad',
        state: 'Gujarat',
        pincode: '380015',
        adminPassword: 'InitialTemp8!',
      },
    });
    assert(tenantARes.status === 201, 'Tenant A onboarded with initial admin');
    const tenantAId = tenantARes.data.data?.tenant?._id;
    const adminAEmail = `admin_${uniqueSuffix}@royal.com`;

    // 2. Reject owner setting admin password with 7 characters
    const shortAdminPassRes = await request(`/owner/tenants/${tenantAId}/reset-password`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: { newPassword: 'Short7!' },
    });
    assert(
      shortAdminPassRes.status === 400 && shortAdminPassRes.data.message?.includes('8 characters'),
      'Owner password reset rejects 7 characters with 400 (Scenario 9)',
      JSON.stringify(shortAdminPassRes.data)
    );

    // 3. Accept owner setting admin password with exactly 8 characters
    const exact8ResetRes = await request(`/owner/tenants/${tenantAId}/reset-password`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: { newPassword: 'Exact8pw' },
    });
    assert(
      exact8ResetRes.status === 200 && exact8ResetRes.data.success,
      'Owner password reset accepts exactly 8 characters (Scenario 10)',
      JSON.stringify(exact8ResetRes.data)
    );

    // 4. Admin A logs in with reset password (mustChangePassword: true)
    const adminALoginRes = await request('/auth/login', {
      method: 'POST',
      body: { email: adminAEmail, password: 'Exact8pw' },
    });
    assert(
      adminALoginRes.status === 200 && adminALoginRes.data.user?.mustChangePassword === true,
      'Admin A logs in and has mustChangePassword: true (Scenario 12)',
      JSON.stringify(adminALoginRes.data.user)
    );
    const adminAToken = adminALoginRes.data.token;

    // 5. Backend rejects password change with 7 characters (Scenario 9, 11)
    const reject7ChangeRes = await request('/auth/change-password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAToken}` },
      body: {
        currentPassword: 'Exact8pw',
        newPassword: 'Seven7!',
        confirmPassword: 'Seven7!',
      },
    });
    assert(
      reject7ChangeRes.status === 400 && reject7ChangeRes.data.message?.includes('8 characters'),
      'Backend rejects user password change with 7 characters (Scenario 9 & 11)',
      JSON.stringify(reject7ChangeRes.data)
    );

    // 6. Backend accepts password change with exactly 8 characters (Scenario 10)
    const accept8ChangeRes = await request('/auth/change-password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAToken}` },
      body: {
        currentPassword: 'Exact8pw',
        newPassword: 'New8pass',
        confirmPassword: 'New8pass',
      },
    });
    assert(
      accept8ChangeRes.status === 200 &&
      accept8ChangeRes.data.user?.mustChangePassword === false &&
      !!accept8ChangeRes.data.token,
      'Backend accepts password change with exactly 8 characters (Scenario 10)',
      JSON.stringify(accept8ChangeRes.data)
    );
    const newAdminAToken = accept8ChangeRes.data.token;

    // -------------------------------------------------------------
    // Tenant B Setup (for isolation testing - Scenario 8)
    // -------------------------------------------------------------
    console.log('\n--- TENANT B SETUP FOR ISOLATION TESTING ---');
    const tenantBRes = await request('/owner/tenants', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: {
        businessName: `Savile Row Studio ${uniqueSuffix}`,
        ownerName: 'Karan Dave',
        email: `admin_b_${uniqueSuffix}@savile.com`,
        mobileNumber: '9234567890',
        address: '22 Park Lane',
        city: 'Surat',
        state: 'Gujarat',
        pincode: '395001',
        adminPassword: 'InitialTemp8!',
      },
    });
    assert(tenantBRes.status === 201, 'Tenant B onboarded');
    const adminBEmail = `admin_b_${uniqueSuffix}@savile.com`;

    // Admin B login & change password to get active session
    const adminBLoginRes = await request('/auth/login', {
      method: 'POST',
      body: { email: adminBEmail, password: 'InitialTemp8!' },
    });
    const changeBPassRes = await request('/auth/change-password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminBLoginRes.data.token}` },
      body: {
        currentPassword: 'InitialTemp8!',
        newPassword: 'SavileRow8Pass',
        confirmPassword: 'SavileRow8Pass',
      },
    });
    const adminBToken = changeBPassRes.data.token;

    // -------------------------------------------------------------
    // Customer Creation with Saved Default Measurements
    // -------------------------------------------------------------
    console.log('\n--- CUSTOMER & ORDER SETUP (Scenarios 1 & 2) ---');
    const customerPayload = {
      name: 'Rameshchandra Mehta',
      mobileNumber: '9898012345',
      address: '42 Ashirwad Flats, Ellisbridge',
      notes: 'Prefers comfort fit shirts',
    };

    const createCustRes = await request('/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${newAdminAToken}` },
      body: customerPayload,
    });
    assert(createCustRes.status === 201, 'Customer created in Tenant A');
    const customerId = createCustRes.data.data?._id;

    // Save default measurements for this customer
    const initialDefaultMeasurements = {
      unit: 'inch',
      shirt: {
        length: '29.5',
        chest: '40',
        waist: '36',
        shoulder: '18',
        sleeveLength: '24',
        sleeveOpening: '9.5',
        neck: '15.5',
        frontChest: '19',
        notes: 'Double stitch collar',
      },
      shirtPatterns: ['Regular Collar', 'Single Pocket'],
      pant: {
        length: '40',
        waist: '34',
        hip: '38',
        bottomOpening: '15',
        thigh: '23',
        knee: '16',
        crotchRise: '10.5',
        notes: 'Narrow fit',
      },
      pantPatterns: ['Cross Pocket'],
    };

    const updateCustMeasRes = await request(`/customers/${customerId}/measurements`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${newAdminAToken}` },
      body: { measurements: initialDefaultMeasurements },
    });
    assert(updateCustMeasRes.status === 200, 'Customer default measurements saved');

    // -------------------------------------------------------------
    // Scenario 1 & 2: Create Order 1 Reusing Customer Measurements
    // -------------------------------------------------------------
    console.log('\n--- SCENARIOS 1 & 2: Create Order Reusing Customer Measurements ---');
    const order1Payload = {
      isNewCustomer: false,
      customerId,
      orderDate: '2026-10-27',
      deadline: '2026-11-05',
      deliveryTime: 'Evening 6:00 PM',
      shirt: {
        quantity: 2,
        patterns: ['Regular Collar', 'Single Pocket'],
        measurements: { ...initialDefaultMeasurements.shirt },
      },
      pant: {
        quantity: 1,
        patterns: ['Cross Pocket'],
        measurements: { ...initialDefaultMeasurements.pant },
      },
      specialInstructions: 'Initial festive order',
      saveAsDefaultMeasurements: false, // Don't alter defaults on creation
    };

    const createOrder1Res = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${newAdminAToken}` },
      body: order1Payload,
    });
    assert(
      createOrder1Res.status === 201 && createOrder1Res.data.data?.orderNumber,
      'Order 1 created successfully reusing customer measurements (Scenario 1 & 2)',
      JSON.stringify(createOrder1Res.data)
    );
    const order1 = createOrder1Res.data.data;
    const order1Id = order1._id;
    const order1Number = order1.orderNumber;
    const order1OriginalDate = order1.orderDate;

    // Verify Order 1 retained the measurement values in its snapshot
    assert(
      order1.shirt?.measurements?.length === '29.5' && order1.pant?.measurements?.length === '40',
      'Order 1 contains correct initial measurement snapshot',
      `Shirt length: ${order1.shirt?.measurements?.length}, Pant length: ${order1.pant?.measurements?.length}`
    );

    // -------------------------------------------------------------
    // Scenario 3 & 5: Edit measurements for ONLY Order 1 (Snapshot Isolation)
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 3 & 5: Edit Measurements for Only Order 1 (Snapshot Isolation) ---');
    // Modify shirt length to 31.0 for this order ONLY (saveAsDefaultMeasurements: false)
    const editOrder1SnapshotRes = await request(`/orders/${order1Id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${newAdminAToken}` },
      body: {
        shirt: {
          quantity: 2,
          patterns: ['Regular Collar'],
          measurements: {
            ...order1.shirt.measurements,
            length: '31.0', // Custom length for Order 1 only!
          },
        },
        saveAsDefaultMeasurements: false, // DO NOT touch customer default profile!
      },
    });

    assert(
      editOrder1SnapshotRes.status === 200 &&
      editOrder1SnapshotRes.data.data?.shirt?.measurements?.length === '31.0',
      'Order 1 measurement snapshot updated to length 31.0 (Scenario 3)',
      `Updated shirt length: ${editOrder1SnapshotRes.data.data?.shirt?.measurements?.length}`
    );

    // Fetch customer to confirm customer default measurements REMAIN UNTOUCHED (length 29.5)
    const verifyCustAfterOrderEditRes = await request(`/customers/${customerId}`, {
      headers: { Authorization: `Bearer ${newAdminAToken}` },
    });
    const custShirtDefaultLength = verifyCustAfterOrderEditRes.data.data?.latestMeasurements?.shirt?.length;
    assert(
      custShirtDefaultLength === '29.5',
      'Customer default profile measurements remained untouched at 29.5 (Scenario 5 - Snapshot Isolation verified)',
      `Customer default shirt length: ${custShirtDefaultLength}`
    );

    // -------------------------------------------------------------
    // Scenario 4: Save Updated Measurements as Customer Defaults
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 4: Save Updated Measurements as Customer Defaults ---');
    // Modify pant length to 42.0 AND explicitly check saveAsDefaultMeasurements: true
    const editWithDefaultSaveRes = await request(`/orders/${order1Id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${newAdminAToken}` },
      body: {
        pant: {
          quantity: 1,
          patterns: ['Cross Pocket', 'Slim Bottom'],
          measurements: {
            ...order1.pant.measurements,
            length: '42.0', // New updated default length
          },
        },
        saveAsDefaultMeasurements: true, // EXPLICITLY requested update!
      },
    });

    assert(
      editWithDefaultSaveRes.status === 200 &&
      editWithDefaultSaveRes.data.data?.pant?.measurements?.length === '42.0',
      'Order 1 pant length updated to 42.0',
      `Order 1 pant length: ${editWithDefaultSaveRes.data.data?.pant?.measurements?.length}`
    );

    // Verify Customer profile has now ALSO updated to 42.0
    const verifyCustAfterExplicitDefaultRes = await request(`/customers/${customerId}`, {
      headers: { Authorization: `Bearer ${newAdminAToken}` },
    });
    const custPantDefaultLength = verifyCustAfterExplicitDefaultRes.data.data?.latestMeasurements?.pant?.length;
    assert(
      custPantDefaultLength === '42.0',
      'Customer default profile measurements updated to 42.0 upon explicit request (Scenario 4)',
      `Customer default pant length: ${custPantDefaultLength}`
    );

    // -------------------------------------------------------------
    // Scenario 6 & 7: Verify Same Order ID & No Duplicate Orders Created
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 6 & 7: Verify Same Order ID & No Duplicates ---');
    const fetchedOrder1Res = await request(`/orders/${order1Id}`, {
      headers: { Authorization: `Bearer ${newAdminAToken}` },
    });
    const fetchedOrder = fetchedOrder1Res.data.data;

    assert(
      fetchedOrder._id === order1Id,
      'Order ID is strictly preserved after multiple edits (Scenario 6)',
      `Original: ${order1Id}, Current: ${fetchedOrder._id}`
    );
    assert(
      fetchedOrder.orderNumber === order1Number,
      'Order number is strictly preserved after multiple edits (Scenario 6)',
      `Original: ${order1Number}, Current: ${fetchedOrder.orderNumber}`
    );
    assert(
      new Date(fetchedOrder.orderDate).getTime() === new Date(order1OriginalDate).getTime(),
      'Original orderDate is preserved',
      `Original: ${order1OriginalDate}, Current: ${fetchedOrder.orderDate}`
    );

    // Verify total orders count in Tenant A: must be exactly 1!
    const ordersListRes = await request('/orders', {
      headers: { Authorization: `Bearer ${newAdminAToken}` },
    });
    const totalOrdersCount = ordersListRes.data.pagination?.total ?? ordersListRes.data.data?.length;
    assert(
      totalOrdersCount === 1,
      'Total orders in Tenant A is exactly 1 (No duplicate records created - Scenario 7)',
      `Found ${totalOrdersCount} orders`
    );

    // -------------------------------------------------------------
    // Scenario 8: Tenant Isolation — Deny Cross-Tenant Order Editing
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 8: Tenant Isolation — Cross-Tenant Edit Denied ---');
    // Admin B attempts to edit Tenant A's Order 1
    const crossTenantEditRes = await request(`/orders/${order1Id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminBToken}` },
      body: {
        specialInstructions: 'Hacked cross-tenant edit attempt',
        deadline: '2026-12-31',
      },
    });

    assert(
      crossTenantEditRes.status === 404 || crossTenantEditRes.status === 403,
      'Tenant B cannot edit Tenant A order (Access Denied / Not Found - Scenario 8)',
      `Status: ${crossTenantEditRes.status}, data: ${JSON.stringify(crossTenantEditRes.data)}`
    );

    // Verify Order 1 in Tenant A was not modified by the unauthorized request
    const checkOrderUnchangedRes = await request(`/orders/${order1Id}`, {
      headers: { Authorization: `Bearer ${newAdminAToken}` },
    });
    assert(
      checkOrderUnchangedRes.data.data?.specialInstructions !== 'Hacked cross-tenant edit attempt',
      'Tenant A order data was not compromised by cross-tenant request',
      checkOrderUnchangedRes.data.data?.specialInstructions
    );

    // -------------------------------------------------------------
    // Scenario 13: Non-existent Order Handling
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 13: Handle Non-Existent Order ID ---');
    const fakeOrderId = '609c12345678901234567890';
    const fakeOrderRes = await request(`/orders/${fakeOrderId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${newAdminAToken}` },
      body: { deadline: '2026-11-20' },
    });
    assert(
      fakeOrderRes.status === 404,
      'Editing non-existent order ID gracefully returns 404 Not Found',
      `Status: ${fakeOrderRes.status}`
    );

    // -------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------
    console.log('\n========================================================================');
    console.log(`   TEST VERIFICATION COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED   `);
    console.log('========================================================================\n');

    if (failedTests > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runVerification();
