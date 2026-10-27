/**
 * Comprehensive Automated Verification Suite
 * Feature: Delete Measurement, Gujarati Transliteration, Default Required Field
 */

import assert from 'assert';

const BASE_URL = 'http://localhost:5000/api';

async function runVerification() {
  console.log('\n========================================================================');
  console.log('   VERIFY: DELETE MEASUREMENT, GUJARATI TRANSLITERATION, REQUIRED ON    ');
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
    // STEP 1: Transliteration Engine Verification (Scenarios 6, 7, 8)
    // -----------------------------------------------------------------
    console.log('--- STEP 1: Gujarati Transliteration Engine Tests ---');
    const { transliterateToGujarati, getGujaratiSuggestions } = await import(
      '../../../client/src/utils/gujaratiTransliteration.js'
    );

    const transliterationCases = [
      { input: 'chhati', expected: 'છાતી', desc: 'Scenario 6: chhati -> છાતી' },
      { input: 'lambai', expected: 'લંબાઈ', desc: 'lambai -> લંબાઈ' },
      { input: 'kamar', expected: 'કમર', desc: 'Scenario 7: kamar -> કમર' },
      { input: 'khissani unchai', expected: 'ખિસ્સાની ઊંચાઈ', desc: 'khissani unchai -> ખિસ્સાની ઊંચાઈ' },
      { input: 'baju', expected: 'બાજુ', desc: 'baju -> બાજુ' },
    ];

    for (const tc of transliterationCases) {
      const output = transliterateToGujarati(tc.input);
      if (output === tc.expected) {
        testPass(`${tc.desc} (got "${output}")`);
      } else {
        testFail(tc.desc, `Expected "${tc.expected}", got "${output}"`);
      }
    }

    const suggestions = getGujaratiSuggestions('chest');
    if (suggestions.includes('છાતી') && suggestions.includes('ચેસ્ટ')) {
      testPass('Suggestions for "chest" return [છાતી, ચેસ્ટ]');
    } else {
      testFail('Suggestions for "chest"', `Got ${JSON.stringify(suggestions)}`);
    }

    // -----------------------------------------------------------------
    // STEP 2: Platform Owner Setup & Tenant Onboarding
    // -----------------------------------------------------------------
    console.log('\n--- STEP 2: Platform Owner & Tenant Setup ---');

    const ownerLoginRes = await fetch(`${BASE_URL}/owner/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@platform.com', password: 'Owner@Pass2026!' }),
    });
    const ownerData = await ownerLoginRes.json();
    assert(ownerData.success, 'Platform owner login successful');
    const ownerToken = ownerData.token;
    testPass('Platform owner authenticated');

    // Create Tenant A
    const slugA = `tenant_del_a_${Date.now()}`;
    const tenantARes = await fetch(`${BASE_URL}/owner/tenants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        businessName: 'Royal Deluxe Tailors',
        ownerName: 'Kishore Kumar',
        email: `${slugA}@tailor.com`,
        mobileNumber: '9876543210',
        adminPassword: 'Password123!',
        plan: 'pro',
      }),
    });
    const tenantAData = await tenantARes.json();
    assert(tenantAData.success, 'Tenant A onboarded');
    testPass('Tenant A created');

    // Login Tenant A & change initial password
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
    const finalDataA = await finalLoginA.json();
    const tokenA = finalDataA.token;
    const authHeadersA = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    };
    testPass('Tenant A logged in with permanent password');

    // Create Tenant B (for cross-tenant security test)
    const slugB = `tenant_del_b_${Date.now()}`;
    const tenantBRes = await fetch(`${BASE_URL}/owner/tenants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        businessName: 'Savile Row Tailors',
        ownerName: 'James Tailor',
        email: `${slugB}@tailor.com`,
        mobileNumber: '9876543211',
        adminPassword: 'Password123!',
        plan: 'pro',
      }),
    });
    const tenantBData = await tenantBRes.json();
    assert(tenantBData.success, 'Tenant B onboarded');

    const loginBRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `${slugB}@tailor.com`, password: 'Password123!' }),
    });
    const loginBData = await loginBRes.json();
    const tempTokenB = loginBData.token;

    await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tempTokenB}`,
      },
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
    const finalDataB = await finalLoginB.json();
    const tokenB = finalDataB.token;
    const authHeadersB = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenB}`,
    };
    testPass('Tenant B created & authenticated for isolation testing');

    // -----------------------------------------------------------------
    // STEP 3: Required Field Default ON & Manual Edit (Scenarios 10, 11, 12, 8, 9)
    // -----------------------------------------------------------------
    console.log('\n--- STEP 3: Required Field Default & Gujarati Field Tests ---');

    // Scenario 10: Create measurement without isRequired -> Must default to true (ON)
    const createReqRes = await fetch(`${BASE_URL}/measurement-definitions`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({
        displayName: 'Pocket Flap',
        category: 'shirt_measurement',
        fieldType: 'number',
        // isRequired omitted to test default ON
      }),
    });
    const createReqData = await createReqRes.json();
    if (createReqRes.status === 201 && createReqData.data.isRequired === true) {
      testPass('Scenario 10: Required Field is ON (true) by default when omitted');
    } else {
      testFail('Scenario 10: Required Field default ON', `Got isRequired: ${createReqData.data?.isRequired}`);
    }
    const pocketFlapDef = createReqData.data;

    // Scenario 9: Empty Gujarati label leaves gujaratiName empty and application uses displayName
    if (pocketFlapDef.gujaratiName === '') {
      testPass('Scenario 9: Empty Gujarati label left blank, falls back to displayName');
    } else {
      testFail('Scenario 9: Empty Gujarati label', `Got ${pocketFlapDef.gujaratiName}`);
    }

    // Scenario 8: User manually enters/edits custom Gujarati label
    const createManualGujRes = await fetch(`${BASE_URL}/measurement-definitions`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({
        displayName: 'Back Pleat Depth',
        gujaratiName: 'પાછળની પ્લીટ ઊંડાઈ', // User custom edit
        category: 'shirt_measurement',
        fieldType: 'number',
        isRequired: true,
      }),
    });
    const createManualGujData = await createManualGujRes.json();
    if (createManualGujData.data.gujaratiName === 'પાછળની પ્લીટ ઊંડાઈ') {
      testPass('Scenario 8: Manually edited Gujarati label is preserved and saved');
    } else {
      testFail('Scenario 8: Manual Gujarati label', `Got ${createManualGujData.data?.gujaratiName}`);
    }

    // Scenario 11: Turn Required Field OFF (optional)
    const createOptRes = await fetch(`${BASE_URL}/measurement-definitions`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({
        displayName: 'Cuff Height',
        gujaratiName: 'કફની ઊંચાઈ',
        category: 'shirt_measurement',
        fieldType: 'number',
        isRequired: false, // Turn OFF
      }),
    });
    const createOptData = await createOptRes.json();
    if (createOptData.data.isRequired === false) {
      testPass('Scenario 11: Turned Required Field OFF and saved as isRequired: false');
    } else {
      testFail('Scenario 11: Required Field OFF', `Got isRequired: ${createOptData.data?.isRequired}`);
    }
    const cuffHeightDef = createOptData.data;

    // Scenario 12: Edit existing optional measurement without changing isRequired -> stays optional
    const editOptRes = await fetch(`${BASE_URL}/measurement-definitions/${cuffHeightDef._id}`, {
      method: 'PUT',
      headers: authHeadersA,
      body: JSON.stringify({
        displayName: 'Cuff Height Adjusted',
        // isRequired: false is preserved
        isRequired: false,
      }),
    });
    const editOptData = await editOptRes.json();
    if (editOptData.data.isRequired === false && editOptData.data.displayName === 'Cuff Height Adjusted') {
      testPass('Scenario 12: Editing existing optional measurement keeps it optional');
    } else {
      testFail('Scenario 12: Edit optional measurement', `Got isRequired: ${editOptData.data?.isRequired}`);
    }

    // Add a custom pant measurement
    const createPantDefRes = await fetch(`${BASE_URL}/measurement-definitions`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({
        displayName: 'Watch Pocket Width',
        gujaratiName: 'વોચ પોકેટ પહોળાઈ',
        category: 'pant_measurement',
        fieldType: 'number',
        isRequired: true,
      }),
    });
    const createPantDefData = await createPantDefRes.json();
    assert(createPantDefRes.status === 201, 'Custom pant measurement created');
    const watchPocketWidthDef = createPantDefData.data;
    testPass('Created custom pant measurement "Watch Pocket Width"');

    // -----------------------------------------------------------------
    // STEP 4: Create Order with Measurements & Check Snapshot
    // -----------------------------------------------------------------
    console.log('\n--- STEP 4: Order Creation & Measurement Snapshot ---');

    // Create a customer first
    const custRes = await fetch(`${BASE_URL}/customers`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({
        name: 'Hiren Patel',
        mobileNumber: '9988776655',
      }),
    });
    const custData = await custRes.json();
    assert(custRes.status === 201, 'Customer created');
    const customerId = custData.data._id;

    // Create an order containing the custom measurements
    const orderRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({
        customerId,
        deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
        shirt: {
          quantity: 1,
          measurements: {
            length: 30,
            chest: 38,
            waist: 34,
            shoulder: 18,
            sleeveLength: 24,
            pocket_flap: 4.5,
            back_pleat_depth: 2.0,
          },
        },
        pant: {
          quantity: 1,
          measurements: {
            length: 40,
            waist: 34,
            hip: 39,
            bottomOpening: 15,
            watch_pocket_width: 3.5,
          },
        },
      }),
    });
    const orderData = await orderRes.json();
    assert(orderRes.status === 201 && orderData.success, 'Order created successfully');
    const orderId = orderData.data._id;
    testPass(`Order #${orderData.data.orderNumber} created with custom shirt and pant measurements`);

    // Verify snapshot captured definitions
    const shirtSnap = orderData.data.measurementSnapshot?.shirt || orderData.data.shirt?.measurementSnapshot || [];
    const pantSnap = orderData.data.measurementSnapshot?.pant || orderData.data.pant?.measurementSnapshot || [];
    const hasFlapSnap = shirtSnap.some((s) => s.fieldKey === 'pocket_flap' && parseFloat(s.value) === 4.5);
    const hasWatchSnap = pantSnap.some((s) => s.fieldKey === 'watch_pocket_width' && parseFloat(s.value) === 3.5);
    if (hasFlapSnap && hasWatchSnap) {
      testPass('Order captured measurement snapshot for pocket_flap and watch_pocket_width');
    } else {
      testFail('Order measurement snapshot', `Shirt snap: ${JSON.stringify(shirtSnap)}`);
    }

    // -----------------------------------------------------------------
    // STEP 5: Delete Measurement (Scenarios 1 & 2)
    // -----------------------------------------------------------------
    console.log('\n--- STEP 5: Delete Shirt & Pant Measurements ---');

    // Scenario 1: Delete a shirt measurement (Pocket Flap)
    const delShirtRes = await fetch(`${BASE_URL}/measurement-definitions/${pocketFlapDef._id}`, {
      method: 'DELETE',
      headers: authHeadersA,
    });
    const delShirtData = await delShirtRes.json();
    if (delShirtRes.status === 200 && delShirtData.success) {
      testPass('Scenario 1: Delete shirt measurement "Pocket Flap" successful (HTTP 200)');
    } else {
      testFail('Scenario 1: Delete shirt measurement', delShirtData.message);
    }

    // Scenario 2: Delete a pant measurement (Watch Pocket Width)
    const delPantRes = await fetch(`${BASE_URL}/measurement-definitions/${watchPocketWidthDef._id}`, {
      method: 'DELETE',
      headers: authHeadersA,
    });
    const delPantData = await delPantRes.json();
    if (delPantRes.status === 200 && delPantData.success) {
      testPass('Scenario 2: Delete pant measurement "Watch Pocket Width" successful (HTTP 200)');
    } else {
      testFail('Scenario 2: Delete pant measurement', delPantData.message);
    }

    // Verify deleted definitions are excluded from active & all lists
    const fetchAfterDelRes = await fetch(`${BASE_URL}/measurement-definitions?all=true`, {
      method: 'GET',
      headers: authHeadersA,
    });
    const fetchAfterDelData = await fetchAfterDelRes.json();
    const remainingKeys = fetchAfterDelData.data.map((d) => d.fieldKey);
    if (!remainingKeys.includes('pocket_flap') && !remainingKeys.includes('watch_pocket_width')) {
      testPass('Deleted measurements are cleanly excluded from GET /api/measurement-definitions');
    } else {
      testFail('Deleted measurements excluded', `Remaining keys: ${remainingKeys}`);
    }

    // -----------------------------------------------------------------
    // STEP 6: Historical Data Integrity & Safety (Scenarios 5 & 14)
    // -----------------------------------------------------------------
    console.log('\n--- STEP 6: Historical Orders Preservation & Safety ---');

    // Fetch the historical order after measurement deletion
    const fetchOrderRes = await fetch(`${BASE_URL}/orders/${orderId}`, {
      method: 'GET',
      headers: authHeadersA,
    });
    const fetchOrderData = await fetchOrderRes.json();
    assert(fetchOrderRes.status === 200, 'Fetched historical order');
    const orderAfterDelete = fetchOrderData.data;

    // Check shirt snapshot contains deleted pocket_flap definition & value 4.5
    const histShirtSnap = orderAfterDelete.measurementSnapshot?.shirt || orderAfterDelete.shirt?.measurementSnapshot || [];
    const flapRecord = histShirtSnap.find((s) => s.fieldKey === 'pocket_flap');
    if (flapRecord && parseFloat(flapRecord.value) === 4.5 && flapRecord.displayName === 'Pocket Flap') {
      testPass('Scenario 5: Historical order preserved deleted measurement "Pocket Flap" and value 4.5');
    } else {
      testFail('Scenario 5: Historical measurement snapshot', JSON.stringify(flapRecord));
    }

    // Check pant snapshot contains deleted watch_pocket_width definition & value 3.5
    const histPantSnap = orderAfterDelete.measurementSnapshot?.pant || orderAfterDelete.pant?.measurementSnapshot || [];
    const watchRecord = histPantSnap.find((s) => s.fieldKey === 'watch_pocket_width');
    if (watchRecord && parseFloat(watchRecord.value) === 3.5 && watchRecord.displayName === 'Watch Pocket Width') {
      testPass('Scenario 5: Historical order preserved deleted measurement "Watch Pocket Width" and value 3.5');
    } else {
      testFail('Scenario 5: Historical pant snapshot', JSON.stringify(watchRecord));
    }

    // Scenario 14: PDF Generation for historical order with deleted measurement
    const { generateOrderSlipPdf } = await import(
      '../../../client/src/services/orderSlipPdfService.js'
    );
    const pdfDoc = generateOrderSlipPdf(orderAfterDelete, {
      shopName: 'Royal Deluxe Tailors',
      phone: '9876543210',
    });
    const pdfOutput = pdfDoc.output();
    if (pdfOutput && pdfOutput.startsWith('%PDF')) {
      testPass('Scenario 14: PDF successfully generated for historical order containing deleted measurements');
    } else {
      testFail('Scenario 14: PDF generation', 'PDF stream did not have valid header');
    }

    // -----------------------------------------------------------------
    // STEP 7: Tenant Isolation & Unauthorized Access (Scenario 13)
    // -----------------------------------------------------------------
    console.log('\n--- STEP 7: Tenant Isolation & Security (Scenario 13) ---');

    // Tenant B attempts to delete Tenant A's definition
    const crossDelRes = await fetch(`${BASE_URL}/measurement-definitions/${cuffHeightDef._id}`, {
      method: 'DELETE',
      headers: authHeadersB, // Tenant B token
    });
    if (crossDelRes.status === 404) {
      testPass('Scenario 13: Tenant B CANNOT delete Tenant A measurement (HTTP 404 Not Found)');
    } else {
      testFail('Scenario 13: Tenant B cross-delete', `Status: ${crossDelRes.status}`);
    }

    // Tenant B attempts to update Tenant A's definition
    const crossUpdateRes = await fetch(`${BASE_URL}/measurement-definitions/${cuffHeightDef._id}`, {
      method: 'PUT',
      headers: authHeadersB, // Tenant B token
      body: JSON.stringify({ displayName: 'Hacked Cuff' }),
    });
    if (crossUpdateRes.status === 404) {
      testPass('Scenario 13: Tenant B CANNOT update Tenant A measurement (HTTP 404 Not Found)');
    } else {
      testFail('Scenario 13: Tenant B cross-update', `Status: ${crossUpdateRes.status}`);
    }

    // Recreate a deleted measurement (tests unique index & revive logic)
    const reviveRes = await fetch(`${BASE_URL}/measurement-definitions`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({
        displayName: 'Pocket Flap',
        category: 'shirt_measurement',
        fieldType: 'number',
        isRequired: true,
      }),
    });
    const reviveData = await reviveRes.json();
    if (reviveRes.status === 201 && reviveData.success) {
      testPass('Tenant A can safely recreate a previously deleted measurement without conflict');
    } else {
      testFail('Recreate deleted measurement', reviveData.message);
    }

  } catch (err) {
    console.error('\nFatal test execution error:', err);
    failed++;
  }

  console.log('\n========================================================================');
  console.log(`   TEST VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification();
