/**
 * Verification Script: Dynamic Shirt & Pant Measurement Definitions in Create Order
 * Tests acceptance criteria:
 * 1. Zero shirt definitions -> 0 inputs, no hardcoded fallback, valid order placement without default fields
 * 2. Zero pant definitions -> 0 inputs, no hardcoded fallback, valid order placement without default fields
 * 3. Exactly configured active definitions appear and validate according to their isRequired setting
 * 4. Custom fields become available
 * 5. Deactivated definitions excluded from active queries
 * 6. Historical orders preserve their snapshot and saved measurement values
 * 7. Tenant isolation: tenant with 0 definitions never sees another tenant's definitions
 */

import assert from 'assert';

const BASE_URL = 'http://localhost:5000/api';

async function runVerification() {
  console.log('\n========================================================================');
  console.log('   VERIFY: DYNAMIC SHIRT & PANT MEASUREMENT DEFINITIONS IN CREATE ORDER  ');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function testPass(desc) {
    passed++;
    console.log(`  ✓ PASS: ${desc}`);
  }

  function testFail(desc, err) {
    failed++;
    console.log(`  ❌ FAIL: ${desc} - ${err?.message || err}`);
  }

  try {
    // -----------------------------------------------------------------
    // 1. Platform Owner Login
    // -----------------------------------------------------------------
    console.log('--- 1. Platform Owner Authentication ---');
    const ownerLoginRes = await fetch(`${BASE_URL}/owner/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@platform.com', password: 'Owner@Pass2026!' }),
    });
    const ownerData = await ownerLoginRes.json();
    assert(ownerData.success, 'Platform owner login failed');
    const ownerToken = ownerData.token;
    testPass('Platform owner authenticated');

    // -----------------------------------------------------------------
    // 2. Create Tenant A (Clean slate with 0 definitions)
    // -----------------------------------------------------------------
    console.log('\n--- 2. Onboard Tenant A and Clear All Definitions (Zero Definitions Test) ---');
    const slugA = `tenant_dyn_${Date.now()}`;
    const tenantARes = await fetch(`${BASE_URL}/owner/tenants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        businessName: 'Dynamic Definitions Tailors',
        ownerName: 'Vikram Seth',
        email: `${slugA}@tailor.com`,
        mobileNumber: '9988776655',
        adminPassword: 'Password123!',
        plan: 'pro',
      }),
    });
    const tenantAData = await tenantARes.json();
    assert(tenantAData.success, 'Failed to create Tenant A');

    // Login Tenant A & change temporary password
    const loginARes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `${slugA}@tailor.com`, password: 'Password123!' }),
    });
    const loginAData = await loginARes.json();
    const tempTokenA = loginAData.token;

    await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tempTokenA}`,
      },
      body: JSON.stringify({
        currentPassword: 'Password123!',
        newPassword: 'Tenant@Pass2026!',
        confirmPassword: 'Tenant@Pass2026!',
      }),
    });

    const finalLoginA = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `${slugA}@tailor.com`, password: 'Tenant@Pass2026!' }),
    });
    const finalLoginAData = await finalLoginA.json();
    const tokenA = finalLoginAData.token;
    testPass('Tenant A onboarded & authenticated');

    // Fetch initial definitions and delete all of them to simulate zero definitions
    const initialDefsRes = await fetch(`${BASE_URL}/measurement-definitions?all=true`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const initialDefsData = await initialDefsRes.json();
    assert(initialDefsData.success);

    for (const d of initialDefsData.data) {
      await fetch(`${BASE_URL}/measurement-definitions/${d._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenA}` },
      });
    }

    // Verify definitions are now genuinely 0
    const zeroShirtRes = await fetch(`${BASE_URL}/measurement-definitions?category=shirt_measurement&active=true`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const zeroShirtData = await zeroShirtRes.json();
    assert.strictEqual(zeroShirtData.data.length, 0, 'Shirt definitions must be 0');
    testPass('Criteria 1: Backend returns 0 active shirt definitions (no auto-seeding on GET)');

    const zeroPantRes = await fetch(`${BASE_URL}/measurement-definitions?category=pant_measurement&active=true`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const zeroPantData = await zeroPantRes.json();
    assert.strictEqual(zeroPantData.data.length, 0, 'Pant definitions must be 0');
    testPass('Criteria 2: Backend returns 0 active pant definitions');

    // Create a customer for Tenant A
    const custRes = await fetch(`${BASE_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        name: 'Ramesh Patel',
        mobileNumber: '9123456789',
        address: '123 Station Road',
      }),
    });
    const custData = await custRes.json();
    assert(custData.success, 'Failed to create customer');
    const customerId = custData.data._id;
    testPass('Customer created for Tenant A');

    // -----------------------------------------------------------------
    // 3. Place Order with ZERO Shirt & Pant Definitions
    // -----------------------------------------------------------------
    console.log('\n--- 3. Place Order with 0 Definitions ---');
    const orderZeroRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        customer: customerId,
        orderDate: new Date().toISOString(),
        deadline: new Date(Date.now() + 86400000 * 3).toISOString(),
        shirt: {
          quantity: 1,
          measurements: {}, // ZERO measurements provided!
        },
        pant: {
          quantity: 0,
          measurements: {},
        },
      }),
    });
    const orderZeroData = await orderZeroRes.json();
    if (orderZeroData.success) {
      testPass('Criteria 1 & 2: Order with 1 shirt placed successfully without requiring default fields');
      assert.strictEqual(orderZeroData.data.measurementSnapshot?.shirt?.length || 0, 0);
      testPass('Order measurement snapshot correctly reflects 0 defined measurements');
    } else {
      testFail('Order placement with 0 definitions', orderZeroData.message);
    }

    // -----------------------------------------------------------------
    // 4. Define exactly THREE active shirt measurements
    // -----------------------------------------------------------------
    console.log('\n--- 4. Configure Exactly 3 Shirt Measurements ---');
    const def1Res = await fetch(`${BASE_URL}/measurement-definitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        displayName: 'Chest Width',
        gujaratiName: 'છાતી',
        category: 'shirt_measurement',
        fieldType: 'number',
        isRequired: true,
        isActive: true,
        displayOrder: 1,
      }),
    });
    const def1 = (await def1Res.json()).data;

    const def2Res = await fetch(`${BASE_URL}/measurement-definitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        displayName: 'Front Length',
        gujaratiName: 'લંબાઈ',
        category: 'shirt_measurement',
        fieldType: 'number',
        isRequired: true,
        isActive: true,
        displayOrder: 2,
      }),
    });
    const def2 = (await def2Res.json()).data;

    const def3Res = await fetch(`${BASE_URL}/measurement-definitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        displayName: 'Sleeve Length',
        gujaratiName: 'બાજુ લંબાઈ',
        category: 'shirt_measurement',
        fieldType: 'number',
        isRequired: false, // Optional
        isActive: true,
        displayOrder: 3,
      }),
    });
    const def3 = (await def3Res.json()).data;

    const activeShirtDefsRes = await fetch(`${BASE_URL}/measurement-definitions?category=shirt_measurement&active=true`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const activeShirtDefs = (await activeShirtDefsRes.json()).data;
    assert.strictEqual(activeShirtDefs.length, 3, 'Exactly 3 active shirt definitions must exist');
    testPass('Criteria 3: Exactly 3 shirt measurements are configured and active');

    // Try creating order with 1 shirt without required measurements (def1 & def2)
    const orderMissingReqRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        customer: customerId,
        orderDate: new Date().toISOString(),
        deadline: new Date(Date.now() + 86400000 * 3).toISOString(),
        shirt: {
          quantity: 1,
          measurements: {},
        },
      }),
    });
    const orderMissingReqData = await orderMissingReqRes.json();
    assert.strictEqual(orderMissingReqData.success, false);
    assert(orderMissingReqData.message.includes('Required shirt measurement'), 'Must reject missing required defined measurement');
    testPass('Order validation enforces only configured isRequired definitions');

    // Create order with required measurements
    const order3Res = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        customer: customerId,
        orderDate: new Date().toISOString(),
        deadline: new Date(Date.now() + 86400000 * 3).toISOString(),
        shirt: {
          quantity: 1,
          measurements: {
            [def1.fieldKey]: '38',
            [def2.fieldKey]: '29.5',
          },
        },
      }),
    });
    const order3Data = await order3Res.json();
    assert(order3Data.success, 'Failed to create order with 3 definitions');
    const order3Id = order3Data.data._id;
    testPass('Order with configured measurements created successfully');

    // -----------------------------------------------------------------
    // 5. Add Custom Measurement Definition & Verify Availability
    // -----------------------------------------------------------------
    console.log('\n--- 5. Add Custom Definition & Verify ---');
    const def4Res = await fetch(`${BASE_URL}/measurement-definitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        displayName: 'Shoulder Slope',
        gujaratiName: 'ખભાનો ઢાળ',
        category: 'shirt_measurement',
        fieldType: 'number',
        isRequired: false,
        isActive: true,
        displayOrder: 4,
      }),
    });
    const def4Data = await def4Res.json();
    assert(def4Data.success, 'Custom definition creation failed');
    const def4 = def4Data.data;

    const updatedDefsRes = await fetch(`${BASE_URL}/measurement-definitions?category=shirt_measurement&active=true`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const updatedDefs = (await updatedDefsRes.json()).data;
    assert.strictEqual(updatedDefs.length, 4, 'Should now have 4 active definitions');
    testPass('Criteria 4: Adding custom measurement immediately available in active definitions');

    // -----------------------------------------------------------------
    // 6. Deactivate Definition & Verify Exclusion from Active List
    // -----------------------------------------------------------------
    console.log('\n--- 6. Deactivate Definition ---');
    const toggleRes = await fetch(`${BASE_URL}/measurement-definitions/${def4._id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ isActive: false }),
    });
    const toggleData = await toggleRes.json();
    assert(toggleData.success, 'Failed to deactivate definition');

    const afterDeactRes = await fetch(`${BASE_URL}/measurement-definitions?category=shirt_measurement&active=true`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const afterDeactDefs = (await afterDeactRes.json()).data;
    assert.strictEqual(afterDeactDefs.length, 3, 'Deactivated definition must NOT be in active list');
    assert(!afterDeactDefs.some((d) => d._id === def4._id), 'Deactivated item is excluded');
    testPass('Criteria 5: Deactivating definition removes it from active definitions');

    // -----------------------------------------------------------------
    // 7. Verify Historical Order Preserves Measurements
    // -----------------------------------------------------------------
    console.log('\n--- 7. Historical Order Data Preservation ---');
    const historicalOrderRes = await fetch(`${BASE_URL}/orders/${order3Id}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const historicalOrder = (await historicalOrderRes.json()).data;
    assert.strictEqual(historicalOrder.shirt?.measurements?.[def1.fieldKey], '38');
    assert.strictEqual(historicalOrder.shirt?.measurements?.[def2.fieldKey], '29.5');
    assert(Array.isArray(historicalOrder.measurementSnapshot?.shirt));
    assert(historicalOrder.measurementSnapshot.shirt.length >= 2);
    testPass('Criteria 6: Existing orders preserve saved measurements and snapshots intact');

    // -----------------------------------------------------------------
    // 8. Strict Tenant Isolation (Zero Definitions for Tenant B)
    // -----------------------------------------------------------------
    console.log('\n--- 8. Tenant Isolation: Tenant B with Zero Definitions ---');
    const slugB = `tenant_iso_${Date.now()}`;
    const tenantBRes = await fetch(`${BASE_URL}/owner/tenants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        businessName: 'Isolated Tailor Works',
        ownerName: 'Manish Sharma',
        email: `${slugB}@tailor.com`,
        mobileNumber: '9911223344',
        adminPassword: 'Password123!',
        plan: 'pro',
      }),
    });
    assert((await tenantBRes.json()).success);

    // Login Tenant B
    const loginBRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `${slugB}@tailor.com`, password: 'Password123!' }),
    });
    const tempTokenB = (await loginBRes.json()).token;

    await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tempTokenB}` },
      body: JSON.stringify({
        currentPassword: 'Password123!',
        newPassword: 'Tenant@Pass2026!',
        confirmPassword: 'Tenant@Pass2026!',
      }),
    });

    const finalLoginB = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `${slugB}@tailor.com`, password: 'Tenant@Pass2026!' }),
    });
    const tokenB = (await finalLoginB.json()).token;

    // Delete all definitions for Tenant B
    const defsBRes = await fetch(`${BASE_URL}/measurement-definitions?all=true`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const defsBData = (await defsBRes.json()).data;
    for (const d of defsBData) {
      await fetch(`${BASE_URL}/measurement-definitions/${d._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenB}` },
      });
    }

    // Tenant B queries active shirt definitions
    const tenantBActiveDefsRes = await fetch(`${BASE_URL}/measurement-definitions?category=shirt_measurement&active=true`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const tenantBActiveDefs = (await tenantBActiveDefsRes.json()).data;
    assert.strictEqual(tenantBActiveDefs.length, 0, 'Tenant B must receive 0 definitions, none of Tenant A');
    testPass('Criteria 7: Tenant with 0 definitions never receives another tenant\'s definitions');

    // -----------------------------------------------------------------
    // Final Summary
    // -----------------------------------------------------------------
    console.log('\n========================================================================');
    console.log(`   AUTOMATED TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test Suite encountered error:', err);
    process.exit(1);
  }
}

runVerification();
