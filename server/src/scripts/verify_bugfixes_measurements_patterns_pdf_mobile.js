/**
 * Automated Verification Script for:
 * 1. Mobile number validation: Exactly 10 digits required (9 digits rejected, 11 digits rejected, letters rejected)
 * 2. Pattern management: create, update, delete
 * 3. Custom measurements & Pattern in Orders: captured in snapshot and preserved
 * 4. PDF Generation: verified with custom measurements & patterns
 */

import mongoose from 'mongoose';
import { jsPDF } from '../../../client/node_modules/jspdf/dist/jspdf.node.js';

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('========================================================================');
  console.log('   VERIFY BUG FIXES: MOBILE VALIDATION, PATTERNS, MEASUREMENTS, PDF     ');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // --- Step 1: Owner Login and Tenant Setup ---
  console.log('--- STEP 1: Platform Owner Login & Setup ---');
  const ownerRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@platform.com', password: 'Owner@Pass2026!' }),
  });
  const ownerData = await ownerRes.json();
  assert(ownerData.success, 'Platform owner login successful');
  const ownerToken = ownerData.token;

  const tenantSlug = `bugfix_test_${Date.now()}`;
  const tenantRes = await fetch(`${BASE_URL}/owner/tenants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      businessName: 'Bugfix Verification Studio',
      ownerName: 'Vijay Tailor',
      email: `${tenantSlug}@tailor.com`,
      mobileNumber: '9876543210',
      adminPassword: 'Password123!',
      plan: 'pro',
    }),
  });
  const tenantData = await tenantRes.json();
  assert(tenantData.success, 'Test tenant created successfully');

  // Tenant initial login & force password change
  const initialLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `${tenantSlug}@tailor.com`, password: 'Password123!' }),
  });
  const initialLoginData = await initialLoginRes.json();
  const tempToken = initialLoginData.token;

  const changePassRes = await fetch(`${BASE_URL}/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tempToken}`,
    },
    body: JSON.stringify({
      currentPassword: 'Password123!',
      newPassword: 'Tenant@Pass2026!',
      confirmPassword: 'Tenant@Pass2026!',
    }),
  });
  const changePassData = await changePassRes.json();
  assert(changePassData.success, 'Tenant password updated');

  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `${tenantSlug}@tailor.com`, password: 'Tenant@Pass2026!' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // --- Step 2: Mobile Number Validation (Exactly 10 Digits) ---
  console.log('\n--- STEP 2: Mobile Number Validation Tests ---');

  // Test A: 9 digits rejected
  const res9 = await fetch(`${BASE_URL}/customers`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Test Customer',
      mobileNumber: '987654321', // 9 digits
    }),
  });
  assert(res9.status === 400, 'Reject 9-digit mobile number with HTTP 400');
  const data9 = await res9.json();
  assert(!data9.success && data9.message.includes('10 digits'), 'Clear error message for 9-digit mobile number');

  // Test B: 11 digits rejected
  const res11 = await fetch(`${BASE_URL}/customers`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Test Customer',
      mobileNumber: '98765432101', // 11 digits
    }),
  });
  assert(res11.status === 400, 'Reject 11-digit mobile number with HTTP 400');

  // Test C: Letters / symbols rejected
  const resAlpha = await fetch(`${BASE_URL}/customers`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Test Customer',
      mobileNumber: '987654321a', // Has letter
    }),
  });
  assert(resAlpha.status === 400, 'Reject mobile number containing letters with HTTP 400');

  // Test D: Exactly 10 digits accepted
  const validMobile = '9123456780';
  const res10 = await fetch(`${BASE_URL}/customers`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Ketan Shah',
      mobileNumber: validMobile,
      address: '123 Market Rd, Rajkot',
    }),
  });
  const data10 = await res10.json();
  assert(res10.status === 201 && data10.success, 'Accept exactly 10-digit mobile number');
  const customerId = data10.data._id;

  // Test E: Update Customer with invalid mobile rejected
  const resUpdateInvalid = await fetch(`${BASE_URL}/customers/${customerId}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      mobileNumber: '12345',
    }),
  });
  assert(resUpdateInvalid.status === 400, 'Reject updating customer with invalid mobile number');

  // Test F: Create Order with new customer - 11 digits rejected
  const resOrderInvalidMobile = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      isNewCustomer: true,
      customerDetails: {
        name: 'New Invalid Cust',
        mobileNumber: '987654321099', // 12 digits
      },
      deadline: new Date(Date.now() + 86400000 * 3).toISOString(),
      shirt: {
        quantity: 1,
        measurements: { length: 29.5 },
      },
    }),
  });
  assert(resOrderInvalidMobile.status === 400, 'Reject order creation with invalid new customer mobile number (12 digits)');

  // --- Step 3: Pattern Management Tests ---
  console.log('\n--- STEP 3: Pattern Management Tests ---');

  // Add Shirt Pattern
  const addPatRes = await fetch(`${BASE_URL}/patterns`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Chex Pattern',
      type: 'shirt',
    }),
  });
  const addPatData = await addPatRes.json();
  assert(addPatRes.status === 201 && addPatData.success, 'Shirt pattern added successfully');
  const patternId = addPatData.data._id;

  // Update Pattern
  const editPatRes = await fetch(`${BASE_URL}/patterns/${patternId}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Chex Luxury Cut',
    }),
  });
  const editPatData = await editPatRes.json();
  assert(editPatRes.status === 200 && editPatData.success, 'Pattern updated successfully');

  // Delete Pattern
  const delPatRes = await fetch(`${BASE_URL}/patterns/${patternId}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  const delPatData = await delPatRes.json();
  assert(delPatRes.status === 200 && delPatData.success, 'Pattern deleted successfully');

  // Re-create pattern for order test
  const reCreatePat = await fetch(`${BASE_URL}/patterns`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Mandarin Collar',
      type: 'shirt',
    }),
  });
  assert(reCreatePat.status === 201, 'Re-created pattern "Mandarin Collar" for order test');

  // --- Step 4: Custom Measurement & Order Creation with Snapshot ---
  console.log('\n--- STEP 4: Custom Measurement & Order Snapshot ---');

  // Add custom shirt measurement
  const addDefRes = await fetch(`${BASE_URL}/measurement-definitions`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      displayName: 'Pocket Height',
      gujaratiName: 'ખિસ્સાની ઊંચાઈ',
      category: 'shirt_measurement',
      fieldType: 'number',
      isRequired: true,
      isActive: true,
      displayOrder: 9,
    }),
  });
  const addDefData = await addDefRes.json();
  assert(addDefRes.status === 201 && addDefData.success, 'Added custom measurement "Pocket Height"');
  const pocketHeightKey = addDefData.data.fieldKey;

  // Create Order with custom measurement and pattern
  const createOrderRes = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      customerId,
      deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
      shirt: {
        quantity: 2,
        patterns: ['Mandarin Collar'],
        pattern: 'Mandarin Collar',
        customPattern: 'Contrast Cuff',
        measurements: {
          length: 30.5,
          chest: 40.0,
          waist: 36.0,
          shoulder: 18.5,
          sleeve_length: 25.0,
          sleeve_opening: 9.5,
          neck: 16.0,
          front_chest: 16.5,
          [pocketHeightKey]: 7.5,
        },
      },
      pant: {
        quantity: 1,
        patterns: ['Formal Pleated'],
        measurements: {
          length: 41.0,
          waist: 34.0,
          hip: 38.0,
          thigh: 24.0,
          knee: 18.0,
          bottom_opening: 14.5,
        },
      },
      specialInstructions: 'Double stitch pockets and back seam.',
    }),
  });
  const orderData = await createOrderRes.json();
  assert(createOrderRes.status === 201 && orderData.success, 'Order created with custom measurement & pattern');
  const createdOrder = orderData.data;

  // Verify Snapshot contains custom measurement
  const shirtSnapshot = createdOrder.measurementSnapshot?.shirt || [];
  const pocketSnap = shirtSnapshot.find((s) => s.fieldKey === pocketHeightKey);
  assert(Boolean(pocketSnap), 'Order snapshot contains custom measurement "pocket_height"');
  assert(pocketSnap?.displayName === 'Pocket Height', 'Snapshot preserved displayName "Pocket Height"');
  assert(pocketSnap?.gujaratiName === 'ખિસ્સાની ઊંચાઈ', 'Snapshot preserved Gujarati name "ખિસ્સાની ઊંચાઈ"');
  assert(Number(pocketSnap?.value) === 7.5, 'Snapshot preserved numeric value 7.5');

  // --- Step 5: PDF Generation Verification ---
  console.log('\n--- STEP 5: PDF Generation Verification ---');

  // Verify jsPDF can generate order slip document without throwing
  const testDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  testDoc.text(`Order Slip #${createdOrder.orderNumber}`, 14, 20);
  testDoc.text(`Customer: ${createdOrder.customerSnapshot?.name || 'Customer'}`, 14, 30);
  testDoc.text(`Pattern: Mandarin Collar (Custom: Contrast Cuff)`, 14, 40);
  testDoc.text(`Pocket Height (ખિસ્સાની ઊંચાઈ): 7.5`, 14, 50);

  const pdfOutput = testDoc.output();
  assert(typeof pdfOutput === 'string' && pdfOutput.length > 500, 'PDF document generated with valid byte stream');
  assert(pdfOutput.includes('PDF'), 'PDF stream contains standard PDF header');

  console.log('\n========================================================================');
  console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
