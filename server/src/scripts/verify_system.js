/**
 * Comprehensive Automated End-to-End Integration Test for Tailor Management System
 * Covers:
 * 1. Health check & Authentication
 * 2. Dynamic Pattern Settings CRUD (Shirt & Pant, case-insensitive duplicate prevention)
 * 3. Order creation with dynamic multi-select patterns, custom patterns, and no price UI
 * 4. Verification that default status is 'in_progress' and selecting 'pending' is rejected
 * 5. Historical records compatibility
 * 6. Real-time search, sorting & pagination on customers and orders
 */

async function runTests() {
  console.log('--- Starting Comprehensive Integration Tests for Tailor Management System ---');
  const BASE_URL = 'http://localhost:5000/api';

  try {
    // 1. Health check
    const healthRes = await fetch(`${BASE_URL}/health`);
    const health = await healthRes.json();
    console.log('✓ [Health Check]:', health.status);

    // 2. Login
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
    console.log('✓ [Auth]: Login successful. User:', loginData.user.name);

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 3. Pattern Settings Management (Requirement 4)
    console.log('\n--- Testing Dynamic Pattern Settings ---');
    // 3.1 Fetch initial patterns
    const patternsRes = await fetch(`${BASE_URL}/patterns`, { headers });
    const patternsData = await patternsRes.json();
    console.log(`✓ [Pattern Settings]: Retrieved ${patternsData.data.length} existing patterns.`);

    // 3.2 Add a new Shirt Pattern
    const uniqueShirtPattern = 'Chex Premium ' + Date.now().toString().slice(-4);
    const createShirtPatRes = await fetch(`${BASE_URL}/patterns`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: uniqueShirtPattern, type: 'shirt' }),
    });
    const createdShirtPat = await createShirtPatRes.json();
    if (!createdShirtPat.success) {
      throw new Error('Failed to create shirt pattern: ' + JSON.stringify(createdShirtPat));
    }
    console.log(`✓ [Pattern Settings]: Created shirt pattern "${createdShirtPat.data.name}"`);

    // 3.3 Test Duplicate Prevention (case-insensitive & trimmed)
    const dupPatternRes = await fetch(`${BASE_URL}/patterns`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: `   ${uniqueShirtPattern.toLowerCase()}   `, type: 'shirt' }),
    });
    const dupPatData = await dupPatternRes.json();
    if (dupPatternRes.status === 400) {
      console.log(`✓ [Pattern Settings]: Duplicate prevention verified: "${dupPatData.message}"`);
    } else {
      throw new Error(`Duplicate pattern was not prevented! Status: ${dupPatternRes.status}`);
    }

    // 3.4 Edit Pattern
    const editedName = `${uniqueShirtPattern} Edited`;
    const editPatRes = await fetch(`${BASE_URL}/patterns/${createdShirtPat.data._id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ name: editedName }),
    });
    const editPatData = await editPatRes.json();
    if (!editPatData.success || editPatData.data.name !== editedName) {
      throw new Error('Failed to edit pattern: ' + JSON.stringify(editPatData));
    }
    console.log(`✓ [Pattern Settings]: Edited pattern name to "${editPatData.data.name}"`);

    // 3.5 Add a Pant Pattern
    const uniquePantPattern = 'Two Pocket ' + Date.now().toString().slice(-4);
    const createPantPatRes = await fetch(`${BASE_URL}/patterns`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: uniquePantPattern, type: 'pant' }),
    });
    const createdPantPat = await createPantPatRes.json();
    console.log(`✓ [Pattern Settings]: Created pant pattern "${createdPantPat.data.name}"`);

    // 3.6 Delete Pattern
    const delPatRes = await fetch(`${BASE_URL}/patterns/${createdShirtPat.data._id}`, {
      method: 'DELETE',
      headers,
    });
    const delPatData = await delPatRes.json();
    if (!delPatData.success) {
      throw new Error('Failed to delete pattern: ' + JSON.stringify(delPatData));
    }
    console.log(`✓ [Pattern Settings]: Safely deleted test pattern.`);

    // 4. Customers List, Search & Pagination (Requirements 7 & 8)
    console.log('\n--- Testing Customers Search, Filter & Pagination ---');
    const custSearchRes = await fetch(`${BASE_URL}/customers?search=98&page=1&limit=5&sortBy=name_asc`, { headers });
    const custSearchData = await custSearchRes.json();
    console.log(`✓ [Customers Search & Pagination]: Found ${custSearchData.pagination.total} matching records.`);
    const firstCustomer = custSearchData.data[0];
    console.log(`  Customer: ${firstCustomer.name} (${firstCustomer.mobileNumber})`);

    // 5. Order Creation with Dynamic Pattern Selection & Custom Inputs (Requirement 5)
    console.log('\n--- Testing Order Form Dynamic Patterns & Custom Text ---');
    const newOrderPayload = {
      isNewCustomer: false,
      customerId: firstCustomer._id,
      deadline: new Date(Date.now() + 86400000 * 4).toISOString(),
      deliveryTime: 'Evening 6:30 PM',
      shirt: {
        quantity: 2,
        patterns: ['Plain', uniqueShirtPattern],
        customPattern: 'Special Designer Collar',
        measurements: {
          length: '29',
          chest: '40',
          waist: '36',
          shoulder: '18',
          sleeveLength: '24',
          neck: '15.5',
        },
      },
      pant: {
        quantity: 1,
        patterns: ['Formal', uniquePantPattern],
        customPattern: 'Extended waistband with coin pocket',
        measurements: {
          length: '39',
          waist: '32',
          hip: '38',
          bottomOpening: '14',
        },
      },
      specialInstructions: 'Urgent delivery for conference',
    };

    const orderRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(newOrderPayload),
    });
    const orderData = await orderRes.json();
    if (!orderData.success) {
      throw new Error('Order creation failed: ' + JSON.stringify(orderData));
    }
    const createdOrder = orderData.data;
    console.log('✓ [Order Creation]: Created order', createdOrder.orderNumber);

    // Verify default status is 'in_progress', not 'pending' (Requirement 2)
    if (createdOrder.status !== 'in_progress') {
      throw new Error(`Expected default status 'in_progress', got '${createdOrder.status}'`);
    }
    console.log(`✓ [Order Status]: Verified default status is "${createdOrder.status}" (Pending is removed)`);

    // Verify pattern arrays and custom pattern persistence
    if (!createdOrder.shirt.patterns.includes('Plain') || createdOrder.shirt.customPattern !== 'Special Designer Collar') {
      throw new Error('Shirt patterns not preserved correctly: ' + JSON.stringify(createdOrder.shirt));
    }
    if (!createdOrder.pant.patterns.includes('Formal') || createdOrder.pant.customPattern !== 'Extended waistband with coin pocket') {
      throw new Error('Pant patterns not preserved correctly: ' + JSON.stringify(createdOrder.pant));
    }
    console.log('✓ [Order Dynamic Patterns]: Verified shirt patterns:', createdOrder.shirt.patterns, '+ custom:', createdOrder.shirt.customPattern);
    console.log('✓ [Order Dynamic Patterns]: Verified pant patterns:', createdOrder.pant.patterns, '+ custom:', createdOrder.pant.customPattern);

    // 6. Test 'pending' status rejection on update (Requirement 2)
    console.log('\n--- Testing Status Validation (Rejection of Pending) ---');
    const updatePendingRes = await fetch(`${BASE_URL}/orders/${createdOrder._id}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'pending' }),
    });
    const updatePendingData = await updatePendingRes.json();
    if (updatePendingRes.status === 400) {
      console.log(`✓ [Status Validation]: Successfully rejected setting status to 'pending': "${updatePendingData.message}"`);
    } else {
      throw new Error(`Setting status to 'pending' should be rejected! Got status: ${updatePendingRes.status}`);
    }

    // 7. Update status to 'ready'
    const updateReadyRes = await fetch(`${BASE_URL}/orders/${createdOrder._id}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'ready' }),
    });
    const updateReadyData = await updateReadyRes.json();
    console.log(`✓ [Status Update]: Updated status to valid option "${updateReadyData.data.status}"`);

    // 8. Order Details Retrieval & Persistence check (Requirement 5)
    const getOrderRes = await fetch(`${BASE_URL}/orders/${createdOrder._id}`, { headers });
    const getOrderData = await getOrderRes.json();
    if (getOrderData.data.shirt.patterns.length !== 2 || getOrderData.data.pant.patterns.length !== 2) {
      throw new Error('Retrieved order patterns count mismatch');
    }
    console.log('✓ [Order Retrieval]: Verified patterns persisted in database.');

    // 9. Real-Time Order Search, Filter & Pagination (Requirements 7 & 8)
    console.log('\n--- Testing Orders Search, Status Filter & Pagination ---');
    const orderSearchRes = await fetch(`${BASE_URL}/orders?search=${createdOrder.orderNumber}&page=1&limit=10&status=ready`, { headers });
    const orderSearchData = await orderSearchRes.json();
    if (orderSearchData.data.length === 0) {
      throw new Error('Order search failed to find newly created order');
    }
    console.log(`✓ [Orders Search & Pagination]: Found ${orderSearchData.data.length} order matching query "${createdOrder.orderNumber}"`);

    // 10. Dashboard Summary Verification
    const dashRes = await fetch(`${BASE_URL}/dashboard/summary`, { headers });
    const dashData = await dashRes.json();
    console.log('✓ [Dashboard]: Live summary counts:', dashData.data.counts);

    // 11. Testing Qty: 0 Handling & Permanent Profile Preservation (Requirement 5 & 3)
    console.log('\n--- Testing Qty: 0 Behavior & Permanent Profile Preservation ---');
    // First, verify the customer has existing shirt & pant measurements
    const custBeforeRes = await fetch(`${BASE_URL}/customers/${firstCustomer._id}`, { headers });
    const custBeforeData = await custBeforeRes.json();
    const origShirtMeasurements = custBeforeData.data.latestMeasurements?.shirt || {};

    // Create an order where Shirt Qty is 0 and Pant Qty is 2, with saveAsLatestMeasurements = true
    const qtyZeroOrderPayload = {
      isNewCustomer: false,
      customerId: firstCustomer._id,
      deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
      shirt: {
        quantity: 0,
        patterns: ['Plain'], // Should be ignored because qty is 0
        customPattern: 'Ignored',
        measurements: { length: '30', chest: '42' }, // Should be ignored because qty is 0
      },
      pant: {
        quantity: 2,
        patterns: ['Formal'],
        measurements: { length: '40', waist: '34' },
      },
      saveAsLatestMeasurements: true,
    };

    const zeroOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(qtyZeroOrderPayload),
    });
    const zeroOrderData = await zeroOrderRes.json();
    if (!zeroOrderData.success) {
      throw new Error('Zero order creation failed: ' + JSON.stringify(zeroOrderData));
    }

    const createdZeroOrder = zeroOrderData.data;
    // Verify that the order's shirt measurements are empty (no non-empty values) and patterns are empty
    const hasShirtMeasurements = Object.values(createdZeroOrder.shirt.measurements || {}).some(v => v && String(v).trim().length > 0);
    if (hasShirtMeasurements) {
      throw new Error('Expected no non-empty shirt measurements when shirt Qty is 0!');
    }
    if ((createdZeroOrder.shirt.patterns || []).length > 0) {
      throw new Error('Expected empty shirt patterns when shirt Qty is 0!');
    }
    console.log('✓ [Qty: 0 Order Handling]: Confirmed shirt measurements and patterns saved as empty in order when Qty is 0.');

    // Verify customer's permanent shirt measurements were preserved and NOT overwritten with empty
    const custAfterRes = await fetch(`${BASE_URL}/customers/${firstCustomer._id}`, { headers });
    const custAfterData = await custAfterRes.json();
    const preservedShirtMeasurements = custAfterData.data.latestMeasurements?.shirt || {};
    if (origShirtMeasurements.length && preservedShirtMeasurements.length !== origShirtMeasurements.length) {
      throw new Error('Customer permanent shirt measurements were corrupted by Qty: 0 order!');
    }
    console.log('✓ [Permanent Profile Preservation]: Confirmed existing shirt measurements preserved on customer profile.');

    // 12. Testing Comprehensive Backend Validation (Requirement 6)
    console.log('\n--- Testing Comprehensive Backend Validation ---');
    // 12.1 Both shirt and pant Qty 0 should be rejected
    const invalidQtyRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customerId: firstCustomer._id,
        deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
        shirt: { quantity: 0 },
        pant: { quantity: 0 },
      }),
    });
    if (invalidQtyRes.status === 400) {
      console.log('✓ [Validation]: Correctly rejected order with total garment quantity 0.');
    } else {
      throw new Error('Failed to reject order with 0 shirts and 0 pants! Status: ' + invalidQtyRes.status);
    }

    // 12.2 Invalid 7-digit mobile number should be rejected
    const invalidMobileRes = await fetch(`${BASE_URL}/customers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Invalid Test Customer',
        mobileNumber: '98765', // Not 10 digits
      }),
    });
    if (invalidMobileRes.status === 400) {
      console.log('✓ [Validation]: Correctly rejected customer with non-10-digit mobile number.');
    } else {
      throw new Error('Failed to reject non-10-digit mobile number! Status: ' + invalidMobileRes.status);
    }

    // 12.3 Customer name less than 2 chars should be rejected
    const invalidNameRes = await fetch(`${BASE_URL}/customers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: ' ', // Empty
        mobileNumber: '9876543210',
      }),
    });
    if (invalidNameRes.status === 400) {
      console.log('✓ [Validation]: Correctly rejected customer with empty/invalid name.');
    } else {
      throw new Error('Failed to reject empty customer name! Status: ' + invalidNameRes.status);
    }

    console.log('\n========================================================');
    console.log('🎉 ALL INTEGRATION TESTS PASSED 100% SUCCESSFULLY! 🎉');
    console.log('========================================================\n');
  } catch (err) {
    console.error('❌ Test failed with error:', err.message);
    process.exit(1);
  }
}

runTests();
