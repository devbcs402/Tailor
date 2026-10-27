import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Tenant } from '../models/Tenant.js';
import { User } from '../models/User.js';
import { Customer } from '../models/Customer.js';
import { Order } from '../models/Order.js';
import { Pattern } from '../models/Pattern.js';
import { OrderCounter } from '../models/OrderCounter.js';
import { AuditLog } from '../models/AuditLog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUP_DIR = path.resolve(__dirname, '../../backups');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tailor_management';
const isConfirmed = process.argv.includes('--confirm');

async function runCleanup() {
  console.log('================================================================');
  console.log('   MULTI-TENANT SAAS DATABASE RESET & CLEANUP UTILITY');
  console.log('================================================================\n');

  await mongoose.connect(MONGO_URI);
  console.log(`Connected to MongoDB: ${MONGO_URI}`);

  // 1. Identify and verify platform owner account
  const platformOwners = await User.find({ role: 'platform_owner' }).lean();

  if (platformOwners.length === 0) {
    console.error('\n❌ CRITICAL ABORT: No user account with role "platform_owner" was found in the database!');
    console.error('Cannot proceed with tenant cleanup as it would leave the platform ownerless.');
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`\n✓ [Platform Owner Verified]: Found ${platformOwners.length} platform owner account(s):`);
  platformOwners.forEach((owner) => {
    console.log(`   - ID: ${owner._id} | Email: ${owner.email} | Name: ${owner.name}`);
  });

  // 2. Count records to be purged vs. preserved
  const [
    tenantCount,
    nonOwnerUserCount,
    customerCount,
    orderCount,
    patternCount,
    counterCount,
    auditLogCount,
  ] = await Promise.all([
    Tenant.countDocuments(),
    User.countDocuments({ role: { $ne: 'platform_owner' } }),
    Customer.countDocuments(),
    Order.countDocuments(),
    Pattern.countDocuments(),
    OrderCounter.countDocuments(),
    AuditLog.countDocuments(),
  ]);

  console.log('\n--- CLEANUP SCOPE AUDIT REPORT ---');
  console.log(`• Tenants to delete:             ${tenantCount}`);
  console.log(`• Tenant Users/Staff to delete:  ${nonOwnerUserCount}`);
  console.log(`• Customers to delete:           ${customerCount}`);
  console.log(`• Orders to delete:              ${orderCount}`);
  console.log(`• Patterns to delete:            ${patternCount}`);
  console.log(`• Order Counters to delete:      ${counterCount}`);
  console.log('----------------------------------');
  console.log(`• Platform Owner(s) to PRESERVE: ${platformOwners.length}`);
  console.log(`• Historical Audit Logs to KEEP: ${auditLogCount}`);

  // 3. Perform Pre-Cleanup Safety Backup
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilePath = path.join(BACKUP_DIR, `pre_cleanup_backup_${timestamp}.json`);

  console.log('\n--- Creating Pre-Cleanup Safety Backup ---');
  const [allTenants, allUsers, allCustomers, allOrders, allPatterns, allCounters] = await Promise.all([
    Tenant.find().lean(),
    User.find().lean(),
    Customer.find().lean(),
    Order.find().lean(),
    Pattern.find().lean(),
    OrderCounter.find().lean(),
  ]);

  const backupData = {
    metadata: {
      createdAt: new Date().toISOString(),
      reason: 'Automated pre-cleanup safety snapshot before tenant reset',
      platformOwners: platformOwners.map((p) => p.email),
    },
    data: {
      tenants: allTenants,
      users: allUsers,
      customers: allCustomers,
      orders: allOrders,
      patterns: allPatterns,
      ordercounters: allCounters,
    },
  };

  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log(`✓ Safety snapshot saved to: ${backupFilePath} (${(fs.statSync(backupFilePath).size / 1024).toFixed(1)} KB)`);

  // 4. Require explicit confirmation flag
  if (!isConfirmed) {
    console.log('\n⚠️  DRY RUN COMPLETED — NO DATA WAS MODIFIED.');
    console.log('To execute this destructive cleanup and reset the database to a fresh state (preserving only the platform owner), re-run with:');
    console.log('\n   node src/scripts/cleanup_tenants.js --confirm\n');
    await mongoose.disconnect();
    process.exit(0);
  }

  // 5. Execute Destructive Cleanup with Transaction & Staged Fallback
  console.log('\n⚡ CONFIRMED: Executing atomic database cleanup...');

  let session = null;
  let useTransaction = false;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
    useTransaction = true;
  } catch (err) {
    if (session) await session.endSession();
    session = null;
    useTransaction = false;
    console.warn('[Cleanup Warning] Replica set transactions unavailable, using safe staged cleanup.');
  }

  let deletedOrders = 0;
  let deletedCustomers = 0;
  let deletedPatterns = 0;
  let deletedCounters = 0;
  let deletedUsers = 0;
  let deletedTenants = 0;

  if (useTransaction) {
    try {
      const ordRes = await Order.deleteMany({}).session(session);
      deletedOrders = ordRes.deletedCount;

      const custRes = await Customer.deleteMany({}).session(session);
      deletedCustomers = custRes.deletedCount;

      const patRes = await Pattern.deleteMany({}).session(session);
      deletedPatterns = patRes.deletedCount;

      const cntRes = await OrderCounter.deleteMany({}).session(session);
      deletedCounters = cntRes.deletedCount;

      // Strictly delete only non-platform-owner users
      const usrRes = await User.deleteMany({ role: { $ne: 'platform_owner' } }).session(session);
      deletedUsers = usrRes.deletedCount;

      const tntRes = await Tenant.deleteMany({}).session(session);
      deletedTenants = tntRes.deletedCount;

      await session.commitTransaction();
    } catch (txError) {
      await session.abortTransaction();
      throw txError;
    } finally {
      await session.endSession();
    }
  } else {
    // Staged cleanup in dependency order
    const ordRes = await Order.deleteMany({});
    deletedOrders = ordRes.deletedCount;

    const custRes = await Customer.deleteMany({});
    deletedCustomers = custRes.deletedCount;

    const patRes = await Pattern.deleteMany({});
    deletedPatterns = patRes.deletedCount;

    const cntRes = await OrderCounter.deleteMany({});
    deletedCounters = cntRes.deletedCount;

    const usrRes = await User.deleteMany({ role: { $ne: 'platform_owner' } });
    deletedUsers = usrRes.deletedCount;

    const tntRes = await Tenant.deleteMany({});
    deletedTenants = tntRes.deletedCount;
  }

  console.log('✓ Purged Orders:         ', deletedOrders);
  console.log('✓ Purged Customers:      ', deletedCustomers);
  console.log('✓ Purged Patterns:       ', deletedPatterns);
  console.log('✓ Purged OrderCounters:  ', deletedCounters);
  console.log('✓ Purged Tenant Users:   ', deletedUsers);
  console.log('✓ Purged Tenants:        ', deletedTenants);

  // 6. Record Audit Log for the cleanup event
  try {
    const primaryOwner = platformOwners[0];
    await AuditLog.create({
      actor: primaryOwner._id,
      actorEmail: primaryOwner.email,
      actorRole: primaryOwner.role,
      action: 'tenant_deleted',
      targetTenant: null,
      targetTenantName: 'All Tenants (Platform Reset)',
      details: {
        operation: 'database_cleanup_tenants_reset',
        deletedTenants,
        deletedUsers,
        deletedCustomers,
        deletedOrders,
        deletedPatterns,
        deletedCounters,
        executedAt: new Date(),
      },
      ipAddress: '127.0.0.1',
      userAgent: 'CLI Script (cleanup_tenants.js)',
    });
    console.log('✓ [Audit Log]: Recorded database cleanup audit event.');
  } catch (auditErr) {
    console.warn('[Audit Warning] Could not record cleanup audit:', auditErr.message);
  }

  // 7. Verify post-cleanup integrity
  const remainingOwners = await User.find({ role: 'platform_owner' }).lean();
  const remainingTenants = await Tenant.countDocuments();
  const remainingNonOwners = await User.countDocuments({ role: { $ne: 'platform_owner' } });
  const remainingCustomers = await Customer.countDocuments();
  const remainingOrders = await Order.countDocuments();

  console.log('\n--- POST-CLEANUP VERIFICATION ---');
  console.log(`• Active Platform Owners: ${remainingOwners.length} (Verified intact)`);
  console.log(`• Remaining Tenants:      ${remainingTenants} (Clean slate)`);
  console.log(`• Remaining Tenant Users: ${remainingNonOwners}`);
  console.log(`• Remaining Customers:    ${remainingCustomers}`);
  console.log(`• Remaining Orders:       ${remainingOrders}`);

  if (remainingOwners.length === 0 || remainingTenants !== 0 || remainingNonOwners !== 0) {
    console.error('❌ Post-cleanup validation failed!');
    process.exit(1);
  }

  console.log('\n================================================================');
  console.log('🎉 DATABASE CLEANUP SUCCESSFUL! READY FOR NEW TENANT ONBOARDING.');
  console.log('   Platform Owner can now log in at http://localhost:5173/owner/login');
  console.log('================================================================\n');

  await mongoose.disconnect();
}

runCleanup().catch((err) => {
  console.error('\n❌ CLEANUP SCRIPT FAILED:', err);
  process.exit(1);
});
