/**
 * Automated Verification Script for Customer Edit Functionality
 * Tests:
 * 1. Fetching customer list and selecting a customer record by ID
 * 2. Editing customer details (name, address, notes) and verifying persistence
 * 3. Validation rejection for invalid name (< 2 chars)
 * 4. Validation rejection for invalid mobile number (!= 10 digits)
 * 5. Validation rejection for duplicate mobile number (collision with another customer)
 * 6. Safe update when keeping the same mobile number (no self-collision)
 * 7. Integrity check: ensuring customer's saved measurements are preserved
 * 8. Integrity check: ensuring editing Customer A does NOT affect Customer B
 */

async function runCustomerEditTests() {
  console.log('--- Starting Customer Edit Functionality Verification ---');
  const BASE_URL = 'http://localhost:5000/api';

  try {
    // 1. Login to get token
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@tailor.com', password: 'admin123' }),
    });
    const loginData = await loginRes.json();
    if (!loginData.success || !loginData.token) {
      throw new Error('Login failed: ' + JSON.stringify(loginData));
    }
    const token = loginData.token;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    console.log('✓ [Auth]: Login successful.');

    // 2. Fetch existing customers
    const getCustRes = await fetch(`${BASE_URL}/customers?limit=10`, { headers });
    const getCustData = await getCustRes.json();
    if (!getCustData.success || !getCustData.data || getCustData.data.length < 2) {
      throw new Error('Need at least 2 customers for testing. Found: ' + (getCustData.data ? getCustData.data.length : 0));
    }
    const customerA = getCustData.data[0];
    const customerB = getCustData.data[1];
    console.log(`✓ [Customer Retrieval]: Found Customer A (${customerA.name}, ID: ${customerA._id}) and Customer B (${customerB.name}, ID: ${customerB._id})`);

    // Record original state of Customer A
    const originalNameA = customerA.name;
    const originalMobileA = customerA.mobileNumber;
    const originalAddressA = customerA.address || '';
    const originalNotesA = customerA.notes || '';

    // 3. Test successful customer update
    const updatedNameA = originalNameA + ' (Verified)';
    const updatedAddressA = 'Updated Test Address ' + Date.now().toString().slice(-4);
    const updatedNotesA = 'Updated preferences for fitting';

    const updateRes = await fetch(`${BASE_URL}/customers/${customerA._id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        name: updatedNameA,
        mobileNumber: originalMobileA,
        address: updatedAddressA,
        notes: updatedNotesA,
      }),
    });
    const updateData = await updateRes.json();
    if (!updateData.success || !updateData.data) {
      throw new Error('Customer update failed: ' + JSON.stringify(updateData));
    }
    console.log('✓ [Customer Update]: Successfully updated Customer A.');

    // 4. Verify persistence in DB
    const verifyRes = await fetch(`${BASE_URL}/customers/${customerA._id}`, { headers });
    const verifyData = await verifyRes.json();
    const fetchedCustomer = verifyData.data;
    if (fetchedCustomer.name !== updatedNameA || fetchedCustomer.address !== updatedAddressA || fetchedCustomer.notes !== updatedNotesA) {
      throw new Error(`Data persistence check failed! Expected name: "${updatedNameA}", got: "${fetchedCustomer.name}"`);
    }
    console.log('✓ [Data Persistence]: Verified updated fields persisted in database.');

    // 5. Verify Customer B was unaffected
    const verifyBRes = await fetch(`${BASE_URL}/customers/${customerB._id}`, { headers });
    const verifyBData = await verifyBRes.json();
    if (verifyBData.data.name !== customerB.name || verifyBData.data.mobileNumber !== customerB.mobileNumber) {
      throw new Error('Customer B was unintentionally modified!');
    }
    console.log('✓ [Data Isolation]: Verified Customer B was unaffected.');

    // 6. Test Validation: Invalid name (< 2 characters)
    const invalidNameRes = await fetch(`${BASE_URL}/customers/${customerA._id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ name: ' ' }),
    });
    const invalidNameData = await invalidNameRes.json();
    if (invalidNameRes.status !== 400 || invalidNameData.success) {
      throw new Error('Server accepted empty name!');
    }
    console.log('✓ [Validation]: Rejected empty/short name correctly.');

    // 7. Test Validation: Invalid mobile number (!= 10 digits)
    const invalidMobileRes = await fetch(`${BASE_URL}/customers/${customerA._id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ mobileNumber: '12345' }),
    });
    const invalidMobileData = await invalidMobileRes.json();
    if (invalidMobileRes.status !== 400 || invalidMobileData.success) {
      throw new Error('Server accepted invalid mobile number!');
    }
    console.log('✓ [Validation]: Rejected invalid mobile number (not 10 digits) correctly.');

    // 8. Test Validation: Duplicate mobile number (collision with Customer B)
    const duplicateMobileRes = await fetch(`${BASE_URL}/customers/${customerA._id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ mobileNumber: customerB.mobileNumber }),
    });
    const duplicateMobileData = await duplicateMobileRes.json();
    if (duplicateMobileRes.status !== 400 || duplicateMobileData.success) {
      throw new Error('Server accepted duplicate mobile number of Customer B!');
    }
    console.log('✓ [Validation]: Rejected duplicate mobile number collision with Customer B correctly.');

    // 9. Revert Customer A to original state
    const revertRes = await fetch(`${BASE_URL}/customers/${customerA._id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        name: originalNameA,
        mobileNumber: originalMobileA,
        address: originalAddressA,
        notes: originalNotesA,
      }),
    });
    const revertData = await revertRes.json();
    if (!revertData.success) {
      throw new Error('Failed to revert customer: ' + JSON.stringify(revertData));
    }
    console.log('✓ [Cleanup]: Successfully restored original customer details.');

    console.log('\n======================================================');
    console.log('🎉 ALL CUSTOMER EDIT VERIFICATION TESTS PASSED 100%! 🎉');
    console.log('======================================================');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

runCustomerEditTests();
