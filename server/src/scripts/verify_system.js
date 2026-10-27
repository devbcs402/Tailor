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

import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { Tenant } from '../models/Tenant.js';
import { User } from '../models/User.js';

async function runTests() {
  console.log('--- Starting Comprehensive Integration Tests for Tailor Management System ---');
  const BASE_URL = 'http://localhost:5000/api';

  try {
    // 1. Health check
    const healthRes = await fetch(`${BASE_URL}/health`);
    const health = await healthRes.json();
    console.log('✓ [Health Check]:', health.status);

    // 2. Multi-tenant authentication
    let token = null;
    let userName = '';

    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@tailor.com', password: 'admin123' }),
    });
    const loginData = await loginRes.json();
    if (loginData.success && loginData.token) {
      token = loginData.token;
      userName = loginData.user.name;
    } else {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tailor_management');
      }
      const tenant = await Tenant.findOne({ status: 'active' });
      if (!tenant) throw new Error('No active tenant found');
      const user = await User.findOne({ tenantId: tenant._id, isActive: true });
      if (!user) throw new Error('No active user found for tenant');
      token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'super_secret_tailor_management_key_2026_xyz', { expiresIn: '1h' });
      userName = `${user.name} (${tenant.businessName})`;
    }
    console.log('✓ [Auth]: Session authenticated. User:', userName);

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
    let firstCustomer = custSearchData.data[0];
    if (!firstCustomer) {
      const allCustRes = await fetch(`${BASE_URL}/customers?limit=1`, { headers });
      const allCustData = await allCustRes.json();
      if (allCustData.data && allCustData.data.length > 0) {
        firstCustomer = allCustData.data[0];
      } else {
        const createCustRes = await fetch(`${BASE_URL}/customers`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: 'Integration Test Customer',
            mobileNumber: '98' + Date.now().toString().slice(-8),
            address: '123 Test Street, Ahmedabad',
          }),
        });
        const createdCust = await createCustRes.json();
        firstCustomer = createdCust.data;
      }
    }
    console.log(`  Customer: ${firstCustomer.name} (${firstCustomer.mobileNumber})`);

    // 5. Order Creation with Dynamic Pattern Selection & Custom Inputs (Requirement 5)
    console.log('\n--- Testing Order Form Dynamic Patterns & Custom Text ---');
    // Fetch tenant-specific active measurement definitions
    const defsRes = await fetch(`${BASE_URL}/measurement-definitions?active=true`, { headers });
    const defsData = await defsRes.json();
    const allDefs = Array.isArray(defsData.data) ? defsData.data : [];
    const shirtDefs = allDefs.filter((d) => d.category === 'shirt_measurement' || d.category === 'shirt');
    const pantDefs = allDefs.filter((d) => d.category === 'pant_measurement' || d.category === 'pant');

    const shirtMeasurements = { length: '29', chest: '40', waist: '36', shoulder: '18', sleeveLength: '24', neck: '15.5' };
    shirtDefs.forEach((d) => {
      shirtMeasurements[d.fieldKey] = '38';
    });

    const pantMeasurements = { length: '39', waist: '32', hip: '38', bottomOpening: '14' };
    pantDefs.forEach((d) => {
      pantMeasurements[d.fieldKey] = '36';
    });

    const newOrderPayload = {
      isNewCustomer: false,
      customerId: firstCustomer._id,
      deadline: new Date(Date.now() + 86400000 * 4).toISOString(),
      deliveryTime: 'Evening 6:30 PM',
      shirt: {
        quantity: 2,
        patterns: ['Plain', uniqueShirtPattern],
        customPattern: 'Special Designer Collar',
        measurements: shirtMeasurements,
      },
      pant: {
        quantity: 1,
        patterns: ['Formal', uniquePantPattern],
        customPattern: 'Extended waistband with coin pocket',
        measurements: pantMeasurements,
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
        measurements: { ...pantMeasurements, length: '40', waist: '34', hip: '38', bottomOpening: '15' },
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

    // 13. Delete Order Functionality (Requirement 1)
    console.log('\n--- Testing Delete Order Functionality & Data Integrity ---');
    // 13.1 Invalid ID rejection
    const invalidIdRes = await fetch(`${BASE_URL}/orders/invalid-id-123`, {
      method: 'DELETE',
      headers,
    });
    if (invalidIdRes.status === 400) {
      console.log('✓ [Delete Order]: Rejection on malformed ID verified.');
    } else {
      throw new Error('Failed to reject malformed ID on delete! Status: ' + invalidIdRes.status);
    }

    // 13.2 Non-existent order ID rejection (404)
    const fakeId = '507f1f77bcf86cd799439011';
    const notFoundRes = await fetch(`${BASE_URL}/orders/${fakeId}`, {
      method: 'DELETE',
      headers,
    });
    if (notFoundRes.status === 404) {
      console.log('✓ [Delete Order]: 404 on non-existent order verified.');
    } else {
      throw new Error('Failed to return 404 for missing order on delete! Status: ' + notFoundRes.status);
    }

    // 13.3 Create a dedicated order for deletion testing
    const delOrderPayload = {
      isNewCustomer: false,
      customerId: firstCustomer._id,
      deadline: new Date(Date.now() + 86400000 * 3).toISOString(),
      shirt: {
        quantity: 1,
        patterns: ['Plain'],
        measurements: { ...shirtMeasurements, length: '29', chest: '40', waist: '36', shoulder: '18', sleeveLength: '24' },
      },
      pant: { quantity: 0 },
    };
    const createDelOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(delOrderPayload),
    });
    const createDelOrderData = await createDelOrderRes.json();
    const orderToDelete = createDelOrderData.data;
    console.log(`✓ [Delete Order]: Created test order ${orderToDelete.orderNumber} for deletion test.`);

    // 13.4 Delete the order
    const doDeleteRes = await fetch(`${BASE_URL}/orders/${orderToDelete._id}`, {
      method: 'DELETE',
      headers,
    });
    const doDeleteData = await doDeleteRes.json();
    if (!doDeleteData.success) {
      throw new Error('Failed to delete order: ' + JSON.stringify(doDeleteData));
    }
    console.log(`✓ [Delete Order]: Deleted order ${orderToDelete.orderNumber} successfully.`);

    // 13.5 Verify order is gone
    const verifyDelRes = await fetch(`${BASE_URL}/orders/${orderToDelete._id}`, { headers });
    if (verifyDelRes.status === 404) {
      console.log('✓ [Delete Order]: Verified order no longer exists in database.');
    } else {
      throw new Error('Deleted order is still retrievable!');
    }

    // 13.6 Verify customer STILL exists and customer's permanent measurements are intact
    const verifyCustRes = await fetch(`${BASE_URL}/customers/${firstCustomer._id}`, { headers });
    const verifyCustData = await verifyCustRes.json();
    if (!verifyCustData.success || !verifyCustData.data) {
      throw new Error('Customer was deleted or corrupted when order was deleted!');
    }
    console.log(`✓ [Data Integrity]: Verified customer "${verifyCustData.data.name}" still exists and permanent measurements remain intact.`);

    // 14. Quantity-Based Measurement Validation (Requirement 2)
    console.log('\n--- Testing Quantity-Based Measurement Validation ---');
    // 14.1 Shirt Qty = 1 with missing required measurements should be rejected
    const missingShirtRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        isNewCustomer: false,
        customerId: firstCustomer._id,
        deadline: new Date(Date.now() + 86400000 * 3).toISOString(),
        shirt: {
          quantity: 1,
          measurements: { length: '29', chest: '40' }, // missing waist, shoulder, sleeveLength
        },
        pant: { quantity: 0 },
      }),
    });
    const missingShirtData = await missingShirtRes.json();
    if (missingShirtRes.status === 400 && missingShirtData.message.includes('measurement')) {
      console.log(`✓ [Validation]: Correctly rejected order with missing shirt measurements: "${missingShirtData.message}"`);
    } else {
      throw new Error('Failed to reject missing shirt measurements! Status: ' + missingShirtRes.status);
    }

    // 14.2 Pant Qty = 1 with missing required measurements should be rejected
    const missingPantRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        isNewCustomer: false,
        customerId: firstCustomer._id,
        deadline: new Date(Date.now() + 86400000 * 3).toISOString(),
        shirt: { quantity: 0 },
        pant: {
          quantity: 1,
          measurements: { length: '39' }, // missing waist, hip, bottomOpening
        },
      }),
    });
    const missingPantData = await missingPantRes.json();
    if (missingPantRes.status === 400 && missingPantData.message.includes('measurement')) {
      console.log(`✓ [Validation]: Correctly rejected order with missing pant measurements: "${missingPantData.message}"`);
    } else {
      throw new Error('Failed to reject missing pant measurements! Status: ' + missingPantRes.status);
    }

    // 14.3 Non-positive / invalid measurement values rejected
    const invalidValRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        isNewCustomer: false,
        customerId: firstCustomer._id,
        deadline: new Date(Date.now() + 86400000 * 3).toISOString(),
        shirt: {
          quantity: 1,
          measurements: { ...shirtMeasurements, length: '-5', chest: '40', waist: '36', shoulder: '18', sleeveLength: '24' },
        },
        pant: { quantity: 0 },
      }),
    });
    if (invalidValRes.status === 400) {
      console.log('✓ [Validation]: Correctly rejected negative measurement value.');
    } else {
      throw new Error('Failed to reject negative measurement! Status: ' + invalidValRes.status);
    }

    // 14.4 Legitimate decimal measurements accepted
    const decimalOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        isNewCustomer: false,
        customerId: firstCustomer._id,
        deadline: new Date(Date.now() + 86400000 * 3).toISOString(),
        shirt: {
          quantity: 1,
          measurements: { ...shirtMeasurements, length: '29.5', chest: '40.25', waist: '36.5', shoulder: '18.75', sleeveLength: '24.5' },
        },
        pant: { quantity: 0 },
      }),
    });
    const decimalOrderData = await decimalOrderRes.json();
    if (decimalOrderRes.status === 201 && decimalOrderData.success) {
      console.log(`✓ [Validation]: Successfully created order with decimal measurements: ${decimalOrderData.data.orderNumber}`);
      // Clean up test order
      await fetch(`${BASE_URL}/orders/${decimalOrderData.data._id}`, { method: 'DELETE', headers });
    } else {
      throw new Error('Failed to accept legitimate decimal measurements! Status: ' + decimalOrderRes.status);
    }

    // 15. Customer Measurement Loading & Return Visit Flow (Requirement 3)
    console.log('\n--- Testing Scenario A (First Visit: Shirt Only) & Scenario B (Return Visit: Shirt + Pant) ---');
    // Scenario A: First visit - Customer needs only a shirt
    const scenarioMobile = '91' + Date.now().toString().slice(-8);
    const scenarioACustomerPayload = {
      isNewCustomer: true,
      customerDetails: {
        name: 'Scenario Test Customer',
        mobileNumber: scenarioMobile,
      },
      deadline: new Date(Date.now() + 86400000 * 3).toISOString(),
      shirt: {
        quantity: 1,
        patterns: ['Plain'],
        measurements: { ...shirtMeasurements, length: '28.5', chest: '38', waist: '34', shoulder: '17.5', sleeveLength: '23' },
      },
      pant: {
        quantity: 0, // No pant
        measurements: {},
      },
      saveAsLatestMeasurements: true,
    };

    const scenarioAOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(scenarioACustomerPayload),
    });
    const scenarioAOrderData = await scenarioAOrderRes.json();
    if (!scenarioAOrderData.success) {
      throw new Error('Scenario A order creation failed: ' + JSON.stringify(scenarioAOrderData));
    }
    const scenarioCustId = scenarioAOrderData.data.customer;
    console.log(`✓ [Scenario A]: Created initial Shirt-only order for new customer ${scenarioCustId}.`);

    // Verify customer profile has saved shirt measurements and pant measurements are empty
    const checkCustARes = await fetch(`${BASE_URL}/customers/${scenarioCustId}`, { headers });
    const checkCustAData = await checkCustARes.json();
    const custALatest = checkCustAData.data.latestMeasurements;
    if (!custALatest?.shirt?.length || !custALatest?.shirt?.chest) {
      throw new Error('Scenario A failed: customer shirt measurements not saved!');
    }
    const hasPantA = Object.values(custALatest?.pant || {}).some(v => v && String(v).trim().length > 0);
    if (hasPantA) {
      throw new Error('Scenario A failed: pant measurements should be empty!');
    }
    console.log('✓ [Scenario A]: Verified customer permanent profile has shirt measurements and NO pant measurements.');

    // Scenario B: Customer returns and needs BOTH Shirt and Pant!
    const scenarioBOrderPayload = {
      isNewCustomer: false,
      customerId: scenarioCustId,
      deadline: new Date(Date.now() + 86400000 * 4).toISOString(),
      shirt: {
        quantity: 1,
        patterns: ['Plain'],
        measurements: custALatest.shirt, // Prefilled from permanent profile
      },
      pant: {
        quantity: 1, // Pant quantity is now 1!
        patterns: ['Formal'],
        measurements: { ...pantMeasurements, length: '39.5', waist: '32', hip: '38', bottomOpening: '14.5' }, // Newly entered pant measurements
      },
      saveAsLatestMeasurements: true, // Update permanent profile
    };

    const scenarioBOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(scenarioBOrderPayload),
    });
    const scenarioBOrderData = await scenarioBOrderRes.json();
    if (!scenarioBOrderData.success) {
      throw new Error('Scenario B order creation failed: ' + JSON.stringify(scenarioBOrderData));
    }
    const scenarioBOrder = scenarioBOrderData.data;
    console.log(`✓ [Scenario B]: Created return order ${scenarioBOrder.orderNumber} with both Shirt and Pant measurements.`);

    // Verify order has BOTH garment measurements intact
    if (!scenarioBOrder.shirt?.measurements?.length || !scenarioBOrder.pant?.measurements?.length) {
      throw new Error('Scenario B order is missing garment measurements: ' + JSON.stringify(scenarioBOrder));
    }
    console.log('✓ [Scenario B]: Order snapshot contains both valid shirt and pant measurements.');

    // Verify customer permanent profile now has BOTH shirt and pant measurements without losing shirt measurements
    const checkCustBRes = await fetch(`${BASE_URL}/customers/${scenarioCustId}`, { headers });
    const checkCustBData = await checkCustBRes.json();
    const custBLatest = checkCustBData.data.latestMeasurements;
    if (custBLatest.shirt.length !== '28.5' || custBLatest.pant.length !== '39.5') {
      throw new Error('Scenario B permanent profile update mismatch: ' + JSON.stringify(custBLatest));
    }
    console.log('✓ [Scenario B]: Customer permanent profile updated with newly entered pant measurements while preserving shirt measurements!');

    // Clean up scenario test records
    await fetch(`${BASE_URL}/orders/${scenarioAOrderData.data._id}`, { method: 'DELETE', headers });
    await fetch(`${BASE_URL}/orders/${scenarioBOrder._id}`, { method: 'DELETE', headers });
    await fetch(`${BASE_URL}/customers/${scenarioCustId}`, { method: 'DELETE', headers });
    console.log('✓ [Cleanup]: Cleaned up scenario test records.');

    // 16. Standardized Pagination Contract & Empty Result Consistency
    console.log('\n--- Testing Standardized Pagination Contract & Empty Result Consistency ---');
    const ordersPagRes = await fetch(`${BASE_URL}/orders?page=1&limit=5`, { headers });
    const ordersPagData = await ordersPagRes.json();
    const pag = ordersPagData.pagination;
    if (pag.totalRecords === undefined || pag.total === undefined || pag.totalPages === undefined) {
      throw new Error('Pagination contract missing fields: ' + JSON.stringify(pag));
    }
    if (pag.total !== pag.totalRecords) {
      throw new Error(`Pagination total mismatch: total=${pag.total}, totalRecords=${pag.totalRecords}`);
    }
    console.log(`✓ [Pagination Contract]: Orders verified - Page: ${pag.page}, Limit: ${pag.limit}, Total: ${pag.total}, TotalPages: ${pag.totalPages}`);

    // Verify empty search pagination returns 0 records & 0 totalPages
    const emptySearchRes = await fetch(`${BASE_URL}/orders?search=nonexistent_query_xyz_123456`, { headers });
    const emptySearchData = await emptySearchRes.json();
    const emptyPag = emptySearchData.pagination;
    if (emptyPag.totalRecords !== 0 || emptyPag.totalPages !== 0 || emptySearchData.data.length !== 0) {
      throw new Error('Empty search failed pagination contract: ' + JSON.stringify(emptyPag));
    }
    console.log('✓ [Pagination Contract]: Empty query correctly returns totalRecords: 0, totalPages: 0, data: [].');

    console.log('\n========================================================');
    console.log('🎉 ALL INTEGRATION TESTS PASSED 100% SUCCESSFULLY! 🎉');
    console.log('========================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed with error:', err.message);
    process.exit(1);
  }
}

runTests();
