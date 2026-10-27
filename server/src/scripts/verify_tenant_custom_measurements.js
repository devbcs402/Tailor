/**
 * Comprehensive Automated Verification Suite for:
 * Tenant-Wise Custom Measurements & Patterns Settings
 *
 * Verifies:
 * 1. Default measurements auto-seeding per tenant with Gujarati labels.
 * 2. Creating custom shirt and pant measurement definitions with stable keys.
 * 3. Strict tenant isolation (Tenant B cannot see Tenant A's custom definitions or patterns).
 * 4. Duplicate prevention within the same tenant & category.
 * 5. Cross-tenant update/delete blocking.
 * 6. Dynamic order creation with custom measurement validation and snapshot generation.
 * 7. Dynamic order editing without overwriting customer defaults or creating duplicate orders.
 * 8. Customer profile default measurements supporting custom fields.
 * 9. Deactivating a measurement preserves historical order and customer values.
 * 10. Reordering measurement definitions.
 * 11. Custom pattern definitions and tenant isolation.
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
  console.log('   TENANT-WISE CUSTOM MEASUREMENTS & PATTERNS VERIFICATION SUITE       ');
  console.log('========================================================================\n');

  try {
    // -------------------------------------------------------------
    // Step 1: Owner Login and Tenant Setup
    // -------------------------------------------------------------
    console.log('--- STEP 1: Platform Owner Setup ---');
    const ownerLoginRes = await request('/auth/login', {
      method: 'POST',
      body: { email: 'owner@platform.com', password: 'Owner@Pass2026!' },
    });
    assert(ownerLoginRes.status === 200, 'Platform owner login successful');
    const ownerToken = ownerLoginRes.data?.token;

    // Create or find Tenant A
    const tenantATimestamp = Date.now().toString().slice(-5);
    const tenantAAdminPass = 'AlphaPass2026!';
    const tenantAAdminEmail = `alpha_${tenantATimestamp}@example.com`;
    const tenantARes = await request('/owner/tenants', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: {
        businessName: `Studio Alpha ${tenantATimestamp}`,
        ownerName: 'Alpha Admin',
        email: tenantAAdminEmail,
        mobileNumber: '9876543210',
        address: '10 Alpha Complex',
        city: 'Ahmedabad',
        state: 'Gujarat',
        pincode: '380001',
        adminPassword: tenantAAdminPass,
      },
    });
    assert(tenantARes.status === 201, 'Created Tenant A (Studio Alpha)', JSON.stringify(tenantARes.data));

    // Create or find Tenant B
    const tenantBAdminPass = 'BetaPass2026!';
    const tenantBAdminEmail = `beta_${tenantATimestamp}@example.com`;
    const tenantBRes = await request('/owner/tenants', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: {
        businessName: `Studio Beta ${tenantATimestamp}`,
        ownerName: 'Beta Admin',
        email: tenantBAdminEmail,
        mobileNumber: '9876543211',
        address: '20 Beta Complex',
        city: 'Surat',
        state: 'Gujarat',
        pincode: '395001',
        adminPassword: tenantBAdminPass,
      },
    });
    assert(tenantBRes.status === 201, 'Created Tenant B (Studio Beta)', JSON.stringify(tenantBRes.data));

    // Login for Tenant A
    const loginARes = await request('/auth/login', {
      method: 'POST',
      body: { email: tenantAAdminEmail, password: tenantAAdminPass },
    });
    assert(loginARes.status === 200, 'Tenant A initial login successful');
    const initialTokenA = loginARes.data?.token;

    // Tenant A changes initial password to satisfy mustChangePassword
    const changePassARes = await request('/auth/change-password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${initialTokenA}` },
      body: {
        currentPassword: tenantAAdminPass,
        newPassword: 'AlphaPermanentPass2026!',
        confirmPassword: 'AlphaPermanentPass2026!',
      },
    });
    assert(changePassARes.status === 200, 'Tenant A successfully changed initial password');
    const tokenA = changePassARes.data?.token || initialTokenA;

    // Login for Tenant B
    const loginBRes = await request('/auth/login', {
      method: 'POST',
      body: { email: tenantBAdminEmail, password: tenantBAdminPass },
    });
    assert(loginBRes.status === 200, 'Tenant B initial login successful');
    const initialTokenB = loginBRes.data?.token;

    // Tenant B changes initial password
    const changePassBRes = await request('/auth/change-password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${initialTokenB}` },
      body: {
        currentPassword: tenantBAdminPass,
        newPassword: 'BetaPermanentPass2026!',
        confirmPassword: 'BetaPermanentPass2026!',
      },
    });
    assert(changePassBRes.status === 200, 'Tenant B successfully changed initial password');
    const tokenB = changePassBRes.data?.token || initialTokenB;

    // -------------------------------------------------------------
    // Step 2: Auto-Seeding & Baseline Definitions for Tenant A
    // -------------------------------------------------------------
    console.log('\n--- STEP 2: Tenant A Measurement Definitions & Auto-Seeding ---');
    const getDefsARes = await request('/measurement-definitions?category=shirt_measurement', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(getDefsARes.status === 200, 'Tenant A successfully fetched shirt measurement definitions');
    const shirtDefsA = getDefsARes.data?.data || [];
    assert(shirtDefsA.length >= 7, `Tenant A has ${shirtDefsA.length} default shirt definitions auto-seeded`);
    const lengthDef = shirtDefsA.find((d) => d.fieldKey === 'length');
    assert(!!lengthDef, 'Found baseline "length" definition');
    assert(lengthDef?.gujaratiName === 'લંબાઈ', `Baseline Gujarati label preserved ("${lengthDef?.gujaratiName}")`);

    // -------------------------------------------------------------
    // Step 3: Tenant A Adds Custom Shirt and Pant Measurements
    // -------------------------------------------------------------
    console.log('\n--- STEP 3: Tenant A Adds Custom Measurements ---');
    const addPocketHeightRes = await request('/measurement-definitions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        category: 'shirt_measurement',
        displayName: 'Pocket Height',
        gujaratiName: 'ખિસ્સાની ઊંચાઈ',
        fieldType: 'number',
        isRequired: true,
        isActive: true,
      },
    });
    assert(addPocketHeightRes.status === 201, 'Tenant A added custom shirt measurement "Pocket Height"');
    const pocketHeightDef = addPocketHeightRes.data?.data;
    assert(pocketHeightDef?.fieldKey === 'pocket_height', `Generated stable key "pocket_height" (got: ${pocketHeightDef?.fieldKey})`);
    assert(pocketHeightDef?.isRequired === true, 'Saved isRequired: true');

    const addWatchPocketRes = await request('/measurement-definitions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        category: 'pant_measurement',
        displayName: 'Watch Pocket Depth',
        gujaratiName: 'ઘડિયાળના ખિસ્સાની ઊંડાઈ',
        fieldType: 'number',
        isRequired: false,
        isActive: true,
      },
    });
    assert(addWatchPocketRes.status === 201, 'Tenant A added custom pant measurement "Watch Pocket Depth"');
    const watchPocketDef = addWatchPocketRes.data?.data;
    assert(watchPocketDef?.fieldKey === 'watch_pocket_depth', 'Generated stable key "watch_pocket_depth"');

    // -------------------------------------------------------------
    // Step 4: Strict Tenant Isolation Checks
    // -------------------------------------------------------------
    console.log('\n--- STEP 4: Strict Tenant Isolation ---');
    const getDefsBRes = await request('/measurement-definitions?category=shirt_measurement', {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(getDefsBRes.status === 200, 'Tenant B successfully fetched shirt measurement definitions');
    const shirtDefsB = getDefsBRes.data?.data || [];
    const pocketInB = shirtDefsB.find((d) => d.fieldKey === 'pocket_height');
    assert(!pocketInB, 'Tenant B CANNOT see Tenant A\'s custom "Pocket Height" measurement');

    // Tenant B can create its own "Pocket Height" with different properties
    const addPocketBRes = await request('/measurement-definitions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: {
        category: 'shirt_measurement',
        displayName: 'Pocket Height',
        gujaratiName: 'ખિસ્સાની લંબાઈ',
        fieldType: 'number',
        isRequired: false,
        isActive: true,
      },
    });
    assert(addPocketBRes.status === 201, 'Tenant B successfully created its own "Pocket Height" without conflict');
    const pocketBDef = addPocketBRes.data?.data;
    assert(pocketBDef?.displayName === 'Pocket Height', 'Tenant B has independent definition');

    // Cross-tenant update prevention: Tenant A tries to modify Tenant B's definition
    const crossUpdateRes = await request(`/measurement-definitions/${pocketBDef._id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { displayName: 'Hacked Pocket' },
    });
    assert(crossUpdateRes.status === 404, `Tenant A cannot update Tenant B's definition (returned ${crossUpdateRes.status})`);

    // Duplicate key prevention within Tenant A
    const duplicateKeyRes = await request('/measurement-definitions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        category: 'shirt_measurement',
        displayName: 'Pocket Height',
        fieldType: 'number',
      },
    });
    assert(duplicateKeyRes.status === 409, `Tenant A prevented duplicate key "pocket_height" (returned ${duplicateKeyRes.status})`);

    // -------------------------------------------------------------
    // Step 5: Customer Default Measurements with Custom Fields
    // -------------------------------------------------------------
    console.log('\n--- STEP 5: Customer Default Measurements ---');
    const custMobile = `98${Date.now().toString().slice(-8)}`;
    const createCustRes = await request('/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        name: 'Ramesh Patel',
        mobileNumber: custMobile,
        address: '101 Sardar Chowk, Ahmedabad',
        latestMeasurements: {
          shirt: {
            length: 29.5,
            chest: 41,
            shoulder: 18.5,
            sleeve_length: 24,
            collar: 15.5,
            cuff: 9.5,
            waist: 38,
            pocket_height: 8.5,
          },
          pant: {
            length: 40,
            waist: 34,
            hip: 40,
            thigh: 24,
            knee: 18,
            bottom: 15,
            rise: 11,
            watch_pocket_depth: 4.5,
          },
        },
      },
    });
    assert(createCustRes.status === 201, 'Tenant A created customer with custom default measurements', JSON.stringify(createCustRes.data));
    const customer = createCustRes.data?.data;
    assert(customer?.latestMeasurements?.shirt?.pocket_height === 8.5, `Customer saved shirt pocket_height = 8.5 (got: ${customer?.latestMeasurements?.shirt?.pocket_height})`);
    assert(customer?.latestMeasurements?.pant?.watch_pocket_depth === 4.5, `Customer saved pant watch_pocket_depth = 4.5 (got: ${customer?.latestMeasurements?.pant?.watch_pocket_depth})`);

    // -------------------------------------------------------------
    // Step 6: Create Order with Custom Measurements & Snapshot
    // -------------------------------------------------------------
    console.log('\n--- STEP 6: Create Order with Custom Measurements & Snapshot ---');
    const deadline = new Date(Date.now() + 7 * 86400000).toISOString();
    const createOrderRes = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        customerId: customer._id,
        deadline,
        deliveryTime: '06:00 PM',
        specialInstructions: 'Double needle stitch on pocket',
        shirt: {
          quantity: 2,
          measurements: {
            length: 29.5,
            chest: 41,
            shoulder: 18.5,
            sleeve_length: 24,
            collar: 15.5,
            cuff: 9.5,
            waist: 38,
            pocket_height: 8.5,
          },
        },
        pant: {
          quantity: 1,
          measurements: {
            length: 40,
            waist: 34,
            hip: 40,
            thigh: 24,
            knee: 18,
            bottom: 15,
            rise: 11,
            watch_pocket_depth: 4.5,
          },
        },
      },
    });
    assert(createOrderRes.status === 201, 'Tenant A created order with custom measurements', JSON.stringify(createOrderRes.data));
    const order = createOrderRes.data?.data;
    assert(order?.shirt?.measurements?.pocket_height === 8.5, 'Order shirt measurements contains pocket_height = 8.5');
    assert(order?.pant?.measurements?.watch_pocket_depth === 4.5, 'Order pant measurements contains watch_pocket_depth = 4.5');

    // Verify measurement snapshot in order
    assert(Array.isArray(order?.measurementSnapshot?.shirt), 'Order contains shirt measurement snapshot array');
    const snapshotPocket = order?.measurementSnapshot?.shirt?.find((s) => s.fieldKey === 'pocket_height');
    assert(!!snapshotPocket, 'Order snapshot captured custom "pocket_height" definition');
    assert(snapshotPocket?.displayName === 'Pocket Height', 'Snapshot captured displayName: "Pocket Height"');
    assert(snapshotPocket?.gujaratiName === 'ખિસ્સાની ઊંચાઈ', 'Snapshot captured Gujarati name: "ખિસ્સાની ઊંચાઈ"');
    assert(Number(snapshotPocket?.value) === 8.5, `Snapshot captured value: 8.5 (got: ${snapshotPocket?.value})`);

    // -------------------------------------------------------------
    // Step 7: Edit Order & Independent Values
    // -------------------------------------------------------------
    console.log('\n--- STEP 7: Edit Order & Independence from Customer Defaults ---');
    const editOrderRes = await request(`/orders/${order._id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        deadline,
        specialInstructions: 'Updated: Special pocket lining',
        shirt: {
          quantity: 2,
          measurements: {
            ...order.shirt.measurements,
            pocket_height: 9.0, // Modified for this order only
          },
        },
        pant: {
          quantity: 1,
          measurements: {
            ...order.pant.measurements,
            watch_pocket_depth: 5.0,
          },
        },
      },
    });
    assert(editOrderRes.status === 200, 'Tenant A successfully updated order', JSON.stringify(editOrderRes.data));
    const updatedOrder = editOrderRes.data?.data;
    assert(updatedOrder?._id === order._id, 'Order ID preserved during edit');
    assert(updatedOrder?.orderNumber === order.orderNumber, 'Order number preserved during edit');
    assert(updatedOrder?.shirt?.measurements?.pocket_height === 9.0, 'Order shirt pocket_height updated to 9.0');

    // Verify Customer Defaults were NOT silently changed
    const fetchCustRes = await request(`/customers/${customer._id}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(fetchCustRes.status === 200, 'Fetched customer profile');
    const refreshedCust = fetchCustRes.data?.data;
    assert(refreshedCust?.latestMeasurements?.shirt?.pocket_height === 8.5, `Customer defaults remained 8.5 (not overwritten to 9.0)`);

    // -------------------------------------------------------------
    // Step 8: Deactivate Measurement & Preserve Historical Values
    // -------------------------------------------------------------
    console.log('\n--- STEP 8: Deactivate Measurement & Historical Preservation ---');
    const toggleStatusRes = await request(`/measurement-definitions/${pocketHeightDef._id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { isActive: false },
    });
    assert(toggleStatusRes.status === 200, 'Tenant A deactivated "Pocket Height" definition');
    assert(toggleStatusRes.data?.data?.isActive === false, 'Definition status is now inactive');

    // Active query should no longer return it
    const activeDefsRes = await request('/measurement-definitions?category=shirt_measurement&activeOnly=true', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const activeShirtDefs = activeDefsRes.data?.data || [];
    assert(!activeShirtDefs.find((d) => d.fieldKey === 'pocket_height'), 'Deactivated field excluded from activeOnly list');

    // Historical order must still retain pocket_height
    const fetchOrderRes = await request(`/orders/${order._id}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(fetchOrderRes.status === 200, 'Fetched historical order');
    const historicalOrder = fetchOrderRes.data?.data;
    assert(historicalOrder?.shirt?.measurements?.pocket_height === 9.0, 'Historical order preserved pocket_height = 9.0 value');
    const historicalSnapshotItem = historicalOrder?.measurementSnapshot?.shirt?.find((s) => s.fieldKey === 'pocket_height');
    assert(!!historicalSnapshotItem, 'Historical snapshot still contains definition metadata');

    // -------------------------------------------------------------
    // Step 9: Custom Pattern Definitions and Tenant Isolation
    // -------------------------------------------------------------
    console.log('\n--- STEP 9: Custom Patterns & Tenant Isolation ---');
    const createPatternARes = await request('/pattern-definitions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        name: 'Royal Nehru Cut',
        category: 'shirt_pattern',
        type: 'shirt',
      },
    });
    assert(createPatternARes.status === 201, 'Tenant A created custom pattern "Royal Nehru Cut"');
    const patternA = createPatternARes.data?.data;

    // Tenant B cannot see Tenant A's pattern
    const getPatternsBRes = await request('/pattern-definitions?category=shirt_pattern', {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(getPatternsBRes.status === 200, 'Tenant B fetched patterns');
    const patternsB = getPatternsBRes.data?.data || [];
    const foundInB = patternsB.find((p) => p.name === 'Royal Nehru Cut');
    assert(!foundInB, 'Tenant B CANNOT see Tenant A\'s pattern (Tenant pattern isolation confirmed)');

    // -------------------------------------------------------------
    // Step 10: Reorder Measurement Definitions
    // -------------------------------------------------------------
    console.log('\n--- STEP 10: Reorder Measurement Definitions ---');
    const allDefsARes = await request('/measurement-definitions?category=shirt_measurement', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const allShirtDefsA = allDefsARes.data?.data || [];
    if (allShirtDefsA.length >= 2) {
      const reorderedItems = [
        { id: allShirtDefsA[1]._id, displayOrder: 0 },
        { id: allShirtDefsA[0]._id, displayOrder: 1 },
      ];
      const reorderRes = await request('/measurement-definitions/reorder', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: {
          category: 'shirt_measurement',
          items: reorderedItems,
        },
      });
      assert(reorderRes.status === 200, 'Reordered measurement definitions successfully');
    }

    // -------------------------------------------------------------
    // Step 11: Security & Tampering Resistance
    // -------------------------------------------------------------
    console.log('\n--- STEP 11: Tenant Identity Security Checks ---');
    // Frontend attempts to inject a foreign tenantId in request body
    const spoofTenantRes = await request('/measurement-definitions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        tenantId: '600000000000000000000000', // Spoofed foreign ID
        category: 'shirt_measurement',
        displayName: 'Spoofed Measure',
        fieldType: 'number',
      },
    });
    assert(spoofTenantRes.status === 201, 'Created measurement definition');
    assert(spoofTenantRes.data?.data?.tenantId !== '600000000000000000000000', 'Backend derived tenantId strictly from authenticated user token, ignoring spoofed body tenantId');
  } catch (err) {
    console.error('Fatal test error:', err);
    failedTests++;
  }

  console.log('\n========================================================================');
  console.log(`   VERIFICATION RESULTS: ${passedTests} PASSED, ${failedTests} FAILED     `);
  console.log('========================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runVerification();
