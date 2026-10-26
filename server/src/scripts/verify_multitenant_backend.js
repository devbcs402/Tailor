/**
 * Comprehensive Backend Verification Test for Multi-Tenant Architecture
 */

async function runMultiTenantVerification() {
  console.log('=== Starting Multi-Tenant Architecture Integration Verification ===');
  const BASE_URL = 'http://localhost:5000/api';

  try {
    // 1. Health check
    const healthRes = await fetch(`${BASE_URL}/health`);
    const health = await healthRes.json();
    console.log('✓ [Health Check]:', health.status);

    // 2. Unauthenticated access check on owner endpoints
    const unauthStatsRes = await fetch(`${BASE_URL}/owner/stats`);
    if (unauthStatsRes.status !== 401) {
      throw new Error(`Expected 401 on unauthenticated owner stats, got: ${unauthStatsRes.status}`);
    }
    console.log('✓ [Security]: Unauthenticated access to /api/owner/stats correctly rejected with 401.');

    // 3. Login as Primary Tenant Admin (Silai Master)
    const tenantLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@tailor.com', password: 'admin123' }),
    });
    const tenantLogin = await tenantLoginRes.json();
    if (!tenantLogin.success || !tenantLogin.token) {
      throw new Error('Tenant admin login failed: ' + JSON.stringify(tenantLogin));
    }
    const tenantToken = tenantLogin.token;
    console.log(`✓ [Auth]: Tenant Admin (${tenantLogin.user.name}, Role: ${tenantLogin.user.role}, Tenant: ${tenantLogin.user.tenant?.businessName}) logged in.`);

    // 4. Verify Tenant Admin CANNOT access owner endpoints (RBAC)
    const tenantAccessOwnerRes = await fetch(`${BASE_URL}/owner/stats`, {
      headers: { Authorization: `Bearer ${tenantToken}` },
    });
    if (tenantAccessOwnerRes.status !== 403) {
      throw new Error(`Expected 403 when Tenant Admin calls owner endpoint, got: ${tenantAccessOwnerRes.status}`);
    }
    console.log('✓ [Security]: Tenant Admin access to /api/owner/stats correctly rejected with 403 Forbidden.');

    // 5. Login as Platform Owner
    const ownerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@platform.com', password: 'Owner@Pass2026!' }),
    });
    const ownerLogin = await ownerLoginRes.json();
    if (!ownerLogin.success || !ownerLogin.token) {
      throw new Error('Platform owner login failed: ' + JSON.stringify(ownerLogin));
    }
    const ownerToken = ownerLogin.token;
    const ownerHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    };
    console.log(`✓ [Auth]: Platform Owner (${ownerLogin.user.name}, Role: ${ownerLogin.user.role}) logged in.`);

    // 6. Owner accesses platform stats
    const statsRes = await fetch(`${BASE_URL}/owner/stats`, { headers: ownerHeaders });
    const statsData = await statsRes.json();
    if (!statsData.success) {
      throw new Error('Owner failed to fetch platform stats: ' + JSON.stringify(statsData));
    }
    console.log('✓ [Owner Dashboard]: Platform stats retrieved successfully:', {
      totalTenants: statsData.data.totalTenants,
      activeTenants: statsData.data.activeTenants,
      totalOrders: statsData.data.totalOrders,
      totalCustomers: statsData.data.totalCustomers,
    });

    // 7. Owner Onboards a New Tenant ("Royal Tailors")
    const testEmail = `royal.${Date.now()}@royaltailors.com`;
    const createTenantRes = await fetch(`${BASE_URL}/owner/tenants`, {
      method: 'POST',
      headers: ownerHeaders,
      body: JSON.stringify({
        businessName: 'Royal Tailors Studio',
        ownerName: 'Vikram Royal',
        email: testEmail,
        mobileNumber: '9898123456',
        address: '42 Heritage Palace',
        city: 'Jaipur',
        state: 'Rajasthan',
        pincode: '302001',
        adminPassword: 'Royal@Pass2026!',
      }),
    });
    const createTenantData = await createTenantRes.json();
    if (!createTenantData.success || !createTenantData.data.tenant) {
      throw new Error('Failed to create new tenant: ' + JSON.stringify(createTenantData));
    }
    const newTenant = createTenantData.data.tenant;
    const newAdmin = createTenantData.data.adminUser;
    console.log(`✓ [Tenant Onboarding]: Created tenant "${newTenant.businessName}" (Code: ${newTenant.tenantCode}, Admin: ${newAdmin.email}).`);

    // 8. Login as New Tenant Admin (Royal Tailors)
    const royalLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'Royal@Pass2026!' }),
    });
    const royalLogin = await royalLoginRes.json();
    if (!royalLogin.success) {
      throw new Error('Royal Tailors admin login failed: ' + JSON.stringify(royalLogin));
    }
    const royalToken = royalLogin.token;
    const royalHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${royalToken}`,
    };
    console.log(`✓ [Tenant Auth]: Royal Tailors admin logged in successfully.`);

    // 9. Royal Tailors verifies starter patterns seeded
    const royalPatternsRes = await fetch(`${BASE_URL}/patterns`, { headers: royalHeaders });
    const royalPatternsData = await royalPatternsRes.json();
    console.log(`✓ [Tenant Patterns]: Royal Tailors has ${royalPatternsData.data.length} starter patterns.`);

    // 10. Royal Tailors creates a Customer
    const royalCustRes = await fetch(`${BASE_URL}/customers`, {
      method: 'POST',
      headers: royalHeaders,
      body: JSON.stringify({
        name: 'Maharaja Customer',
        mobileNumber: '9988776655',
        address: 'Pink City Palace',
      }),
    });
    const royalCustData = await royalCustRes.json();
    if (!royalCustData.success) {
      throw new Error('Royal customer creation failed: ' + JSON.stringify(royalCustData));
    }
    const royalCustomerId = royalCustData.data._id;
    console.log(`✓ [Tenant Customer]: Royal Tailors created customer "${royalCustData.data.name}" (ID: ${royalCustomerId}).`);

    // 11. Cross-Tenant Isolation Tests (Silai Master vs Royal Tailors)
    const silaiHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tenantToken}`,
    };

    // 11.1 Silai Master lists customers -> Must NOT see Royal Tailors' customer
    const silaiCustListRes = await fetch(`${BASE_URL}/customers?search=Maharaja`, { headers: silaiHeaders });
    const silaiCustListData = await silaiCustListRes.json();
    if (silaiCustListData.data && silaiCustListData.data.length > 0) {
      throw new Error('LEAK DETECTED! Silai Master was able to see Royal Tailors customer in search list!');
    }
    console.log('✓ [Tenant Isolation]: Silai Master cannot find Royal customer in customer search list.');

    // 11.2 Silai Master attempts to fetch Royal customer by direct ID -> Must receive 404
    const silaiDirectGetRes = await fetch(`${BASE_URL}/customers/${royalCustomerId}`, { headers: silaiHeaders });
    if (silaiDirectGetRes.status !== 404) {
      throw new Error(`LEAK DETECTED! Silai Master fetched Royal customer by ID (status: ${silaiDirectGetRes.status})`);
    }
    console.log('✓ [Tenant Isolation]: Silai Master cannot get Royal customer by ID (returned 404).');

    // 11.3 Silai Master attempts to attach Royal customer to an order -> Must be rejected!
    const silaiIllegalOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: silaiHeaders,
      body: JSON.stringify({
        isNewCustomer: false,
        customerId: royalCustomerId,
        deadline: new Date(Date.now() + 86400000).toISOString(),
        shirt: {
          quantity: 1,
          measurements: { length: '28', chest: '38', waist: '34', shoulder: '18', sleeveLength: '24' },
        },
      }),
    });
    if (silaiIllegalOrderRes.status !== 404 && silaiIllegalOrderRes.status !== 400) {
      throw new Error(`LEAK DETECTED! Silai Master was able to attach Royal customer to an order (status: ${silaiIllegalOrderRes.status})`);
    }
    console.log('✓ [Tenant Isolation]: Silai Master rejected when attempting to create order for Royal customer.');

    // 12. Tenant Deactivation Lifecycle Test
    console.log('\n--- Testing Tenant Deactivation & Immediate Access Revocation ---');
    const deactRes = await fetch(`${BASE_URL}/owner/tenants/${newTenant._id}/deactivate`, {
      method: 'POST',
      headers: ownerHeaders,
      body: JSON.stringify({ reason: 'Billing trial period ended' }),
    });
    const deactData = await deactRes.json();
    if (!deactData.success) {
      throw new Error('Tenant deactivation failed: ' + JSON.stringify(deactData));
    }
    console.log(`✓ [Tenant Lifecycle]: Deactivated tenant "${newTenant.businessName}".`);

    // 12.1 Royal Tailors tries to access customer API -> Must be blocked immediately!
    const blockedApiRes = await fetch(`${BASE_URL}/customers`, { headers: royalHeaders });
    if (blockedApiRes.status !== 403) {
      throw new Error(`Expected 403 on deactivated tenant API call, got: ${blockedApiRes.status}`);
    }
    const blockedApiData = await blockedApiRes.json();
    console.log(`✓ [Tenant Lifecycle]: Deactivated tenant API access blocked immediately: "${blockedApiData.message}"`);

    // 12.2 Silai Master continues working normally
    const silaiNormalRes = await fetch(`${BASE_URL}/customers`, { headers: silaiHeaders });
    if (!silaiNormalRes.ok) {
      throw new Error('Silai Master was unexpectedly affected by Royal Tailors deactivation!');
    }
    console.log('✓ [Tenant Lifecycle]: Active tenant (Silai Master) continues operating normally without disruption.');

    // 13. Tenant Reactivation Lifecycle Test
    console.log('\n--- Testing Tenant Reactivation ---');
    const reactRes = await fetch(`${BASE_URL}/owner/tenants/${newTenant._id}/activate`, {
      method: 'POST',
      headers: ownerHeaders,
    });
    const reactData = await reactRes.json();
    if (!reactData.success) {
      throw new Error('Tenant reactivation failed: ' + JSON.stringify(reactData));
    }
    console.log(`✓ [Tenant Lifecycle]: Reactivated tenant "${newTenant.businessName}".`);

    // 13.1 Royal Tailors access restored
    const restoredRes = await fetch(`${BASE_URL}/customers`, { headers: royalHeaders });
    if (!restoredRes.ok) {
      throw new Error('Failed to restore access to reactivated tenant!');
    }
    const restoredData = await restoredRes.json();
    if (!restoredData.data || restoredData.data.length !== 1 || restoredData.data[0]._id !== royalCustomerId) {
      throw new Error('Customer data was lost or missing after reactivation!');
    }
    console.log(`✓ [Tenant Lifecycle]: Royal Tailors access fully restored with existing customer "${restoredData.data[0].name}" intact.`);

    // 14. Audit Logs Verification
    const auditRes = await fetch(`${BASE_URL}/owner/activity-logs?limit=10`, { headers: ownerHeaders });
    const auditData = await auditRes.json();
    if (!auditData.success || auditData.data.length === 0) {
      throw new Error('No audit logs found!');
    }
    const actions = auditData.data.map((l) => l.action);
    console.log(`✓ [Audit Log]: Audit log contains recorded actions:`, [...new Set(actions)]);

    console.log('\n======================================================');
    console.log('🎉 ALL MULTI-TENANT BACKEND TESTS PASSED 100%! 🎉');
    console.log('======================================================');
  } catch (error) {
    console.error('❌ Multi-tenant verification failed:', error.message);
    process.exit(1);
  }
}

runMultiTenantVerification();
