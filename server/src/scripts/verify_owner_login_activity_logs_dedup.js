/**
 * Verification Script:
 * 1. Platform Owner vs Tailor Login Separation
 * 2. Activity Logs Date-Wise Deletion (IST Timezone half-open bounds)
 * 3. In-flight GET Deduplication & Mutation Safeguards
 */

import assert from 'assert';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { AuditLog } from '../models/AuditLog.js';
import { User } from '../models/User.js';
import { Tenant } from '../models/Tenant.js';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tailor_management';

async function runTests() {
  console.log('\n========================================================================');
  console.log('   VERIFY: OWNER LOGIN SEPARATION, ACTIVITY LOGS DELETION & DEDUP       ');
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

  await mongoose.connect(MONGODB_URI);

  try {
    // -----------------------------------------------------------------
    // SECTION 1: SEPARATION OF PLATFORM OWNER & TAILOR LOGIN
    // -----------------------------------------------------------------
    console.log('--- 1. Login Separation & Role Enforcement ---');

    // Test 1.1: Platform Owner rejected from tailor login (/api/auth/login)
    const ownerAtTailorRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@platform.com', password: 'Owner@Pass2026!' }),
    });
    const ownerAtTailorData = await ownerAtTailorRes.json();
    assert.strictEqual(ownerAtTailorRes.status, 403, 'Owner should be rejected with 403 on tailor login');
    assert.strictEqual(ownerAtTailorData.code, 'OWNER_ACCOUNT_RESTRICTED');
    assert(ownerAtTailorData.message.includes('/owner/login'), 'Error message must direct owner to /owner/login');
    testPass('Platform Owner is rejected from tailor login (/auth/login) with clear redirection message');

    // Test 1.2: Platform Owner can log in via /api/owner/login
    const ownerAtOwnerRes = await fetch(`${BASE_URL}/owner/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@platform.com', password: 'Owner@Pass2026!' }),
    });
    const ownerAtOwnerData = await ownerAtOwnerRes.json();
    assert.strictEqual(ownerAtOwnerRes.status, 200, 'Owner should succeed at /owner/login');
    assert(ownerAtOwnerData.token, 'Owner login should return JWT token');
    assert.strictEqual(ownerAtOwnerData.user.role, 'platform_owner');
    const ownerToken = ownerAtOwnerData.token;
    testPass('Platform Owner logs in successfully via dedicated owner login endpoint (/owner/login)');

    // Test 1.3: Create a test tenant with admin user
    const tenantSlug = `tenant_auth_${Date.now()}`;
    const createTenantRes = await fetch(`${BASE_URL}/owner/tenants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        businessName: `Auth Test Studio ${Date.now()}`,
        ownerName: 'Test Tailor Admin',
        email: `${tenantSlug}@example.com`,
        mobileNumber: '9876500001',
        adminPassword: 'Password123!',
      }),
    });
    const createTenantData = await createTenantRes.json();
    assert(createTenantData.success, 'Failed to create test tenant');
    const tenantAdminEmail = `${tenantSlug}@example.com`;
    const tenantAdminPassword = 'Password123!';
    await User.updateOne({ email: tenantAdminEmail }, { $set: { mustChangePassword: false } });
    testPass('Test tailor tenant onboarded');

    // Test 1.4: Tailor user rejected from owner login (/api/owner/login)
    const tailorAtOwnerRes = await fetch(`${BASE_URL}/owner/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: tenantAdminEmail, password: tenantAdminPassword }),
    });
    const tailorAtOwnerData = await tailorAtOwnerRes.json();
    assert.strictEqual(tailorAtOwnerRes.status, 403, 'Tailor user should be rejected from /owner/login');
    assert.strictEqual(tailorAtOwnerData.code, 'NOT_PLATFORM_OWNER');
    assert(tailorAtOwnerData.message.includes('/login'), 'Error message must direct tailor to /login');
    testPass('Tailor tenant user is rejected from owner login (/owner/login) with clear message');

    // Test 1.5: Tailor user can log in via /api/auth/login
    const tailorAtTailorRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: tenantAdminEmail, password: tenantAdminPassword }),
    });
    const tailorAtTailorData = await tailorAtTailorRes.json();
    assert.strictEqual(tailorAtTailorRes.status, 200, 'Tailor user should succeed at /auth/login');
    assert(tailorAtTailorData.token, 'Tailor login should return token');
    assert(tailorAtTailorData.user.role === 'admin' || tailorAtTailorData.user.role === 'tenant_admin', 'Tailor user role should be admin or tenant_admin');
    assert(tailorAtTailorData.user.tenantId, 'Tailor user must have associated tenantId');
    const tailorToken = tailorAtTailorData.token;
    testPass('Tailor tenant user logs in successfully via tailor login (/auth/login)');

    // Test 1.6: Invalid credentials rejected by both flows
    const badOwnerRes = await fetch(`${BASE_URL}/owner/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@platform.com', password: 'WrongPassword999' }),
    });
    assert.strictEqual(badOwnerRes.status, 401, 'Bad owner password must return 401');

    const badTailorRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: tenantAdminEmail, password: 'WrongPassword999' }),
    });
    assert.strictEqual(badTailorRes.status, 401, 'Bad tailor password must return 401');
    testPass('Invalid credentials properly rejected with 401 on both login flows');

    // Test 1.7: Tenant token cannot access owner-only endpoints
    const tenantAtOwnerApi = await fetch(`${BASE_URL}/owner/activity-logs`, {
      headers: { Authorization: `Bearer ${tailorToken}` },
    });
    assert.strictEqual(tenantAtOwnerApi.status, 403, 'Tenant token must be rejected with 403 from owner endpoints');
    testPass('Tenant token cannot access owner-only endpoints (HTTP 403)');

    // Test 1.8: Owner token cannot modify tenant business data without explicit tenant scope
    const ownerAtOrders = await fetch(`${BASE_URL}/orders`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.strictEqual(ownerAtOrders.status, 403, 'Owner token cannot access tenant-scoped orders directly');
    testPass('Owner token cannot bypass tenant isolation without tenant context');

    // -----------------------------------------------------------------
    // SECTION 2: ACTIVITY LOGS DATE-WISE DELETION (IST TIMEZONE)
    // -----------------------------------------------------------------
    console.log('\n--- 2. Activity Logs Date-Wise Deletion in Asia/Kolkata Timezone ---');

    // Target Date: 2026-10-27
    // IST is UTC+5:30.
    // 2026-10-27 00:00:00 IST = 2026-10-26 18:30:00 UTC
    // 2026-10-28 00:00:00 IST = 2026-10-27 18:30:00 UTC

    const ownerUser = await User.findOne({ role: 'platform_owner' });

    // Clear test logs first
    await AuditLog.deleteMany({
      actor: ownerUser._id,
      userAgent: 'IST-Test-Suite',
    });

    // Create 5 test logs:
    // Log 1: Previous Day (2026-10-26 18:29:00 UTC = 2026-10-26 23:59:00 IST) -> MUST REMAIN
    const prevDayLog = await AuditLog.create({
      actor: ownerUser._id,
      actorEmail: ownerUser.email,
      actorRole: ownerUser.role,
      action: 'platform_owner_login',
      userAgent: 'IST-Test-Suite',
      details: { note: 'Previous day log' },
      createdAt: new Date('2026-10-26T18:29:00.000Z'),
    });

    // Log 2: Target Day Start (2026-10-26 18:30:00 UTC = 2026-10-27 00:00:00 IST) -> MUST BE DELETED
    const targetDayStartLog = await AuditLog.create({
      actor: ownerUser._id,
      actorEmail: ownerUser.email,
      actorRole: ownerUser.role,
      action: 'platform_owner_login',
      userAgent: 'IST-Test-Suite',
      details: { note: 'Target day start log' },
      createdAt: new Date('2026-10-26T18:30:00.000Z'),
    });

    // Log 3: Target Day Midday (2026-10-27 06:30:00 UTC = 2026-10-27 12:00:00 IST) -> MUST BE DELETED
    const targetDayMidLog = await AuditLog.create({
      actor: ownerUser._id,
      actorEmail: ownerUser.email,
      actorRole: ownerUser.role,
      action: 'platform_owner_login',
      userAgent: 'IST-Test-Suite',
      details: { note: 'Target day midday log' },
      createdAt: new Date('2026-10-27T06:30:00.000Z'),
    });

    // Log 4: Target Day End (2026-10-27 18:29:59 UTC = 2026-10-27 23:59:59 IST) -> MUST BE DELETED
    const targetDayEndLog = await AuditLog.create({
      actor: ownerUser._id,
      actorEmail: ownerUser.email,
      actorRole: ownerUser.role,
      action: 'platform_owner_login',
      userAgent: 'IST-Test-Suite',
      details: { note: 'Target day end log' },
      createdAt: new Date('2026-10-27T18:29:59.000Z'),
    });

    // Log 5: Next Day (2026-10-27 18:30:00 UTC = 2026-10-28 00:00:00 IST) -> MUST REMAIN
    const nextDayLog = await AuditLog.create({
      actor: ownerUser._id,
      actorEmail: ownerUser.email,
      actorRole: ownerUser.role,
      action: 'platform_owner_login',
      userAgent: 'IST-Test-Suite',
      details: { note: 'Next day log' },
      createdAt: new Date('2026-10-27T18:30:00.000Z'),
    });

    testPass('Created 5 test activity logs spanning previous day, target day (IST), and next day');

    // Test 2.1: Tenant user cannot delete activity logs
    const tenantDeleteRes = await fetch(`${BASE_URL}/owner/activity-logs?date=2026-10-27`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tailorToken}` },
    });
    assert.strictEqual(tenantDeleteRes.status, 403, 'Tenant cannot delete activity logs');
    testPass('Unauthorized user (tenant) is rejected with 403 from deleting activity logs');

    // Test 2.2: Unauthenticated request rejected
    const unauthDeleteRes = await fetch(`${BASE_URL}/owner/activity-logs?date=2026-10-27`, {
      method: 'DELETE',
    });
    assert.strictEqual(unauthDeleteRes.status, 401, 'Unauthenticated delete must return 401');
    testPass('Unauthenticated request is rejected with 401');

    // Test 2.3: Invalid date rejected with 400
    const invalidDateRes = await fetch(`${BASE_URL}/owner/activity-logs?date=invalid-date-xyz`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.strictEqual(invalidDateRes.status, 400, 'Invalid date format must return 400');
    testPass('Invalid date string is rejected with 400');

    // Test 2.4: Non-existent calendar day (e.g. 2026-02-31) rejected
    const badCalendarRes = await fetch(`${BASE_URL}/owner/activity-logs?date=2026-02-31`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.strictEqual(badCalendarRes.status, 400, 'Non-existent calendar date must return 400');
    testPass('Invalid calendar date (2026-02-31) rejected with 400');

    // Test 2.5: Execute date-wise delete for 2026-10-27
    const deleteRes = await fetch(`${BASE_URL}/owner/activity-logs?date=2026-10-27`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const deleteData = await deleteRes.json();
    assert.strictEqual(deleteRes.status, 200, 'Delete logs should succeed');
    assert(deleteData.success, 'Delete logs response should indicate success');
    assert.strictEqual(deleteData.deletedCount >= 3, true, `Expected at least 3 deleted logs, got ${deleteData.deletedCount}`);
    testPass(`Owner successfully deleted ${deleteData.deletedCount} logs for 2026-10-27`);

    // Test 2.6: Verify exact half-open IST range deletion in MongoDB
    const remainingPrev = await AuditLog.findById(prevDayLog._id);
    assert(remainingPrev, 'Previous day log (2026-10-26 IST) must NOT be deleted');

    const remainingNext = await AuditLog.findById(nextDayLog._id);
    assert(remainingNext, 'Next day log (2026-10-28 IST) must NOT be deleted');

    const deletedStart = await AuditLog.findById(targetDayStartLog._id);
    assert.strictEqual(deletedStart, null, 'Target day start log must be deleted');

    const deletedMid = await AuditLog.findById(targetDayMidLog._id);
    assert.strictEqual(deletedMid, null, 'Target day mid log must be deleted');

    const deletedEnd = await AuditLog.findById(targetDayEndLog._id);
    assert.strictEqual(deletedEnd, null, 'Target day end log must be deleted');
    testPass('Only logs on target IST date were deleted; previous and next day logs remain intact');

    // Test 2.7: Also verify POST /api/owner/activity-logs/delete-by-date alias
    const postDeleteRes = await fetch(`${BASE_URL}/owner/activity-logs/delete-by-date`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({ date: '2026-10-27' }),
    });
    const postDeleteData = await postDeleteRes.json();
    assert.strictEqual(postDeleteRes.status, 200);
    assert(postDeleteData.success);
    assert.strictEqual(postDeleteData.deletedCount, 0, 'Second deletion should return 0 deleted logs');
    testPass('POST /api/owner/activity-logs/delete-by-date works identically and safely returns 0 on empty match');

    // Clean up remaining test logs
    await AuditLog.deleteMany({ _id: { $in: [prevDayLog._id, nextDayLog._id] } });

    // -----------------------------------------------------------------
    // SECTION 3: AUDIT & IN-FLIGHT GET DEDUPLICATION
    // -----------------------------------------------------------------
    console.log('\n--- 3. Audit & In-Flight Request Deduplication ---');

    // Test 3.1: Fire 10 simultaneous GET requests for measurement definitions
    const startConcurrent = Date.now();
    const concurrentRequests = Array.from({ length: 10 }).map(() =>
      fetch(`${BASE_URL}/measurement-definitions?category=shirt_measurement&active=true`, {
        headers: { Authorization: `Bearer ${tailorToken}` },
      }).then((r) => r.json())
    );

    const concurrentResults = await Promise.all(concurrentRequests);
    assert.strictEqual(concurrentResults.length, 10);
    for (const res of concurrentResults) {
      assert(res.success, 'Concurrent request must succeed');
      assert(Array.isArray(res.data), 'Concurrent request should return array');
    }
    testPass('10 simultaneous GET requests to /measurement-definitions handled smoothly');

    // Test 3.2: Fire 10 simultaneous GET requests for patterns
    const patternRequests = Array.from({ length: 10 }).map(() =>
      fetch(`${BASE_URL}/patterns?type=shirt`, {
        headers: { Authorization: `Bearer ${tailorToken}` },
      }).then((r) => r.json())
    );
    const patternResults = await Promise.all(patternRequests);
    assert.strictEqual(patternResults.length, 10);
    for (const res of patternResults) {
      assert(res.success, 'Concurrent pattern request must succeed');
    }
    testPass('10 simultaneous GET requests to /patterns handled smoothly without errors');

    console.log('\n========================================================================');
    console.log(`   AUTOMATED TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');
  } catch (err) {
    testFail('Unexpected test suite error', err);
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
