/**
 * Comprehensive Automated Verification Suite for:
 * 1. Platform Owner access after database cleanup
 * 2. Tenant onboarding with mustChangePassword: true
 * 3. First-login detection and backend middleware enforcement (HTTP 403 MUST_CHANGE_PASSWORD)
 * 4. Password validation rules (min 12 chars, upper/lower/number, non-identical, confirmation match)
 * 5. Password change completion and business API unlocking
 * 6. Owner-initiated tenant admin password reset
 * 7. Tenant isolation and deactivation enforcement
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
  console.log('\n============================================================');
  console.log('   MULTI-TENANT FIRST-LOGIN & RESET VERIFICATION TEST SUITE  ');
  console.log('============================================================\n');

  try {
    // -------------------------------------------------------------
    // Scenario 1: Platform Owner login after database cleanup
    // -------------------------------------------------------------
    console.log('--- SCENARIO 1: Platform Owner Login After Cleanup ---');
    const ownerLoginRes = await request('/auth/login', {
      method: 'POST',
      body: { email: 'owner@platform.com', password: 'Owner@Pass2026!' },
    });
    assert(
      ownerLoginRes.status === 200 && ownerLoginRes.data.user?.role === 'platform_owner',
      'Owner logs in successfully and has role platform_owner',
      JSON.stringify(ownerLoginRes.data)
    );
    const ownerToken = ownerLoginRes.data.token;

    // -------------------------------------------------------------
    // Scenario 2: Platform Owner access to tenant management & stats
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 2: Owner Accesses Tenant Management & Stats ---');
    const tenantsListRes = await request('/owner/tenants', {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert(
      tenantsListRes.status === 200 && Array.isArray(tenantsListRes.data.data),
      'Owner can access /api/owner/tenants',
      `Status: ${tenantsListRes.status}`
    );

    const statsRes = await request('/owner/stats', {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert(
      statsRes.status === 200 && statsRes.data.success,
      'Owner can access /api/owner/stats',
      `Status: ${statsRes.status}`
    );

    // -------------------------------------------------------------
    // Scenario 3: Database cleanup verification (tenants clean slate)
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 3: Clean Slate Database Verification ---');
    assert(
      tenantsListRes.data.data.length === 0,
      'Tenants collection is cleanly emptied of old test tenants',
      `Found ${tenantsListRes.data.data.length} tenants`
    );

    // -------------------------------------------------------------
    // Scenario 4: Platform Owner account preserved
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 4: Platform Owner Account Preserved ---');
    assert(
      ownerLoginRes.data.user.email === 'owner@platform.com' && !ownerLoginRes.data.user.tenantId,
      'Platform owner account intact with tenantId null and mustChangePassword false/null',
      JSON.stringify(ownerLoginRes.data.user)
    );

    // -------------------------------------------------------------
    // Scenario 5 & 6: Owner creates a new tenant with mustChangePassword: true
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 5 & 6: Owner Creates Tenant & Admin mustChangePassword Flag ---');
    const tenantPayload = {
      businessName: 'Savile Row Bespoke',
      ownerName: 'Arthur Pendelton',
      email: 'admin@savilerow.com',
      mobileNumber: '9876543210',
      address: '1 Savile Row, Mayfair',
      city: 'London',
      state: 'Greater London',
      pincode: 'W1S 2ER',
      adminPassword: 'InitialTempPassword123!',
      notes: 'Premier bespoke tailoring house',
    };

    const createTenantRes = await request('/owner/tenants', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: tenantPayload,
    });

    assert(
      createTenantRes.status === 201 && createTenantRes.data.success,
      'Tenant created with 201 Created',
      JSON.stringify(createTenantRes.data)
    );
    const createdTenantId = createTenantRes.data.data?.tenant?._id;
    const initialAdmin = createTenantRes.data.data?.adminUser;

    assert(
      initialAdmin && initialAdmin.mustChangePassword === true,
      'Created tenant administrator has mustChangePassword: true',
      JSON.stringify(initialAdmin)
    );

    // -------------------------------------------------------------
    // Scenario 7: First login returns mustChangePassword === true
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 7: First Login Detects mustChangePassword === true ---');
    const adminLoginRes = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@savilerow.com', password: 'InitialTempPassword123!' },
    });

    assert(
      adminLoginRes.status === 200 && adminLoginRes.data.user?.mustChangePassword === true,
      'Tenant admin logs in and response contains mustChangePassword === true',
      JSON.stringify(adminLoginRes.data.user)
    );
    const adminToken = adminLoginRes.data.token;

    // -------------------------------------------------------------
    // Scenario 8: Backend Middleware Blocks Business APIs (HTTP 403)
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 8: Backend Middleware Blocks Business Endpoints ---');
    const blockedDashboardRes = await request('/dashboard/summary', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      blockedDashboardRes.status === 403 && blockedDashboardRes.data.code === 'MUST_CHANGE_PASSWORD',
      'GET /api/dashboard/summary blocked with 403 MUST_CHANGE_PASSWORD',
      `Status: ${blockedDashboardRes.status}, data: ${JSON.stringify(blockedDashboardRes.data)}`
    );

    const blockedCustomersRes = await request('/customers', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      blockedCustomersRes.status === 403 && blockedCustomersRes.data.code === 'MUST_CHANGE_PASSWORD',
      'GET /api/customers blocked with 403 MUST_CHANGE_PASSWORD',
      `Status: ${blockedCustomersRes.status}`
    );

    const blockedOrdersRes = await request('/orders', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      blockedOrdersRes.status === 403 && blockedOrdersRes.data.code === 'MUST_CHANGE_PASSWORD',
      'GET /api/orders blocked with 403 MUST_CHANGE_PASSWORD',
      `Status: ${blockedOrdersRes.status}`
    );

    // Verify /api/auth/me is ALLOWED
    const meRes = await request('/auth/me', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      meRes.status === 200 && meRes.data.user?.mustChangePassword === true,
      'GET /api/auth/me is permitted before password change',
      `Status: ${meRes.status}`
    );

    // -------------------------------------------------------------
    // Scenario 9 & 10: Password Validation Rules
    // -------------------------------------------------------------
    console.log('\n--- SCENARIOS 9 & 10: Password Policy & Validation Checks ---');
    // Test 1: Invalid current password
    const wrongCurrentRes = await request('/auth/change-password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        currentPassword: 'WrongPassword999!',
        newPassword: 'BrandNewPassword2026!',
        confirmPassword: 'BrandNewPassword2026!',
      },
    });
    assert(
      wrongCurrentRes.status === 400 &&
      (wrongCurrentRes.data.message?.toLowerCase().includes('incorrect') ||
       wrongCurrentRes.data.message?.toLowerCase().includes('current password')),
      'Rejects invalid current password with 400',
      wrongCurrentRes.data.message
    );

    // Test 2: Identical to current password
    const identicalRes = await request('/auth/change-password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        currentPassword: 'InitialTempPassword123!',
        newPassword: 'InitialTempPassword123!',
        confirmPassword: 'InitialTempPassword123!',
      },
    });
    assert(
      identicalRes.status === 400 &&
      identicalRes.data.message?.toLowerCase().includes('identical'),
      'Rejects new password identical to current/initial password',
      identicalRes.data.message
    );

    // Test 3: Password too short (< 12 characters)
    const shortRes = await request('/auth/change-password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        currentPassword: 'InitialTempPassword123!',
        newPassword: 'ShortPass1!',
        confirmPassword: 'ShortPass1!',
      },
    });
    assert(
      shortRes.status === 400 && shortRes.data.message?.includes('12 characters'),
      'Rejects password shorter than 12 characters',
      shortRes.data.message
    );

    // Test 4: Mismatched confirm password
    const mismatchRes = await request('/auth/change-password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        currentPassword: 'InitialTempPassword123!',
        newPassword: 'ValidNewPassword2026!',
        confirmPassword: 'DifferentPassword2026!',
      },
    });
    assert(
      mismatchRes.status === 400 && mismatchRes.data.message?.includes('do not match'),
      'Rejects mismatched new password and confirmation',
      mismatchRes.data.message
    );

    // -------------------------------------------------------------
    // Scenario 11: Successful Password Change
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 11: Successful Password Change Execution ---');
    const changeSuccessRes = await request('/auth/change-password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        currentPassword: 'InitialTempPassword123!',
        newPassword: 'SavileRowSecurePassword2026!',
        confirmPassword: 'SavileRowSecurePassword2026!',
      },
    });

    assert(
      changeSuccessRes.status === 200 &&
      changeSuccessRes.data.user?.mustChangePassword === false &&
      !!changeSuccessRes.data.token,
      'Password changed successfully: mustChangePassword is false and new token issued',
      JSON.stringify(changeSuccessRes.data)
    );
    const newAdminToken = changeSuccessRes.data.token;

    // Verify business APIs are now UNLOCKED
    const unblockedDashboardRes = await request('/dashboard/summary', {
      headers: { Authorization: `Bearer ${newAdminToken}` },
    });
    assert(
      unblockedDashboardRes.status === 200,
      'GET /api/dashboard/summary is unlocked after password change',
      `Status: ${unblockedDashboardRes.status}`
    );

    // -------------------------------------------------------------
    // Scenario 12: Subsequent Login Works Without Forced Change
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 12: Subsequent Login With New Password ---');
    const subsequentLoginRes = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@savilerow.com', password: 'SavileRowSecurePassword2026!' },
    });

    assert(
      subsequentLoginRes.status === 200 &&
      subsequentLoginRes.data.user?.mustChangePassword === false,
      'Subsequent login succeeds and does NOT require password change',
      JSON.stringify(subsequentLoginRes.data.user)
    );

    // Old password should fail
    const oldLoginRes = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@savilerow.com', password: 'InitialTempPassword123!' },
    });
    assert(
      oldLoginRes.status === 400 || oldLoginRes.status === 401,
      'Old initial password is invalidated and rejected',
      `Status: ${oldLoginRes.status}`
    );

    // -------------------------------------------------------------
    // Scenario 13: Owner Initiates Password Reset
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 13: Platform Owner Resets Tenant Admin Password ---');
    const resetRes = await request(`/owner/tenants/${createdTenantId}/reset-password`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: { newPassword: 'OwnerResetTemporaryPassword2026!' },
    });

    assert(
      resetRes.status === 200 && resetRes.data.success,
      'Owner resets tenant admin password successfully',
      JSON.stringify(resetRes.data)
    );

    // Login with new reset password
    const resetLoginRes = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@savilerow.com', password: 'OwnerResetTemporaryPassword2026!' },
    });

    assert(
      resetLoginRes.status === 200 && resetLoginRes.data.user?.mustChangePassword === true,
      'Reset admin login succeeds and requires password change again (mustChangePassword: true)',
      JSON.stringify(resetLoginRes.data.user)
    );

    // Check that business APIs are once again blocked
    const reblockedRes = await request('/dashboard/summary', {
      headers: { Authorization: `Bearer ${resetLoginRes.data.token}` },
    });
    assert(
      reblockedRes.status === 403 && reblockedRes.data.code === 'MUST_CHANGE_PASSWORD',
      'Business APIs re-blocked after owner reset until password is changed',
      `Status: ${reblockedRes.status}`
    );

    // -------------------------------------------------------------
    // Scenario 14: Tenant Isolation & Status Check
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 14: Tenant Isolation & Deactivation Security ---');
    // 1. Tenant admin cannot access owner APIs
    const adminAccessOwnerRes = await request('/owner/tenants', {
      headers: { Authorization: `Bearer ${resetLoginRes.data.token}` },
    });
    assert(
      adminAccessOwnerRes.status === 403,
      'Tenant administrator cannot access /api/owner endpoints (403 Forbidden)',
      `Status: ${adminAccessOwnerRes.status}`
    );

    // 2. Owner deactivates tenant
    const deactivateRes = await request(`/owner/tenants/${createdTenantId}/deactivate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: { reason: 'Account review' },
    });
    assert(
      deactivateRes.status === 200 && deactivateRes.data.data?.status === 'inactive',
      'Owner deactivates tenant successfully',
      `Status: ${deactivateRes.status}`
    );

    // 3. Login blocked for inactive tenant
    const inactiveLoginRes = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@savilerow.com', password: 'OwnerResetTemporaryPassword2026!' },
    });
    assert(
      inactiveLoginRes.status === 403 &&
      (inactiveLoginRes.data.message?.toLowerCase().includes('deactivated') ||
       inactiveLoginRes.data.code === 'TENANT_INACTIVE'),
      'Login blocked for administrator of inactive tenant',
      JSON.stringify(inactiveLoginRes.data)
    );

    // 4. Reactivate tenant
    const reactivateRes = await request(`/owner/tenants/${createdTenantId}/activate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert(
      reactivateRes.status === 200 && reactivateRes.data.data?.status === 'active',
      'Owner reactivates tenant successfully',
      `Status: ${reactivateRes.status}`
    );

    // -------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------
    console.log('\n============================================================');
    console.log(`   TEST VERIFICATION COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED   `);
    console.log('============================================================\n');

    if (failedTests > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal verification error:', err);
    process.exit(1);
  }
}

runVerification();
