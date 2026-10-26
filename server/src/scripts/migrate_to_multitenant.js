import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Tenant } from '../models/Tenant.js';
import { User } from '../models/User.js';
import { Customer } from '../models/Customer.js';
import { Order } from '../models/Order.js';
import { Pattern } from '../models/Pattern.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tailor_management';

export async function runMigration() {
  console.log('=== Starting Multi-Tenant Database Migration ===');
  console.log(`Connecting to: ${MONGODB_URI}`);

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  try {
    // 1. Create or retrieve the primary default tenant for existing records
    let primaryTenant = await Tenant.findOne({ tenantCode: 'SILAI-MASTER' });
    if (!primaryTenant) {
      primaryTenant = new Tenant({
        businessName: 'Silai Master Tailor Studio',
        tenantCode: 'SILAI-MASTER',
        ownerName: 'Yash Tailor',
        email: 'admin@tailor.com',
        mobileNumber: '9825012345',
        address: 'Main Market, Station Road',
        city: 'Ahmedabad',
        state: 'Gujarat',
        pincode: '380001',
        status: 'active',
        notes: 'Initial migrated business tenant',
      });
      await primaryTenant.save();
      console.log(`✓ [Tenant]: Created primary tenant "Silai Master Tailor Studio" (ID: ${primaryTenant._id}, Code: ${primaryTenant.tenantCode})`);
    } else {
      console.log(`✓ [Tenant]: Found existing primary tenant (ID: ${primaryTenant._id}, Code: ${primaryTenant.tenantCode})`);
    }

    const tenantId = primaryTenant._id;

    // 2. Drop obsolete single-tenant unique indexes if they exist
    const dropIndexSafely = async (collectionName, indexName) => {
      try {
        const indexes = await db.collection(collectionName).indexes();
        const exists = indexes.some((idx) => idx.name === indexName);
        if (exists) {
          await db.collection(collectionName).dropIndex(indexName);
          console.log(`✓ [Index Cleanup]: Dropped obsolete index "${indexName}" on "${collectionName}".`);
        }
      } catch (err) {
        console.warn(`[Index Cleanup Warning]: Could not drop "${indexName}" on "${collectionName}":`, err.message);
      }
    };

    await dropIndexSafely('orders', 'orderNumber_1');
    await dropIndexSafely('customers', 'mobileNumber_1');

    // 3. Migrate Users (assign tenantId to tenant admin / staff)
    const usersResult = await User.updateMany(
      { role: { $ne: 'platform_owner' }, tenantId: { $in: [null, undefined] } },
      { $set: { tenantId, shopName: primaryTenant.businessName } }
    );
    console.log(`✓ [Users]: Assigned primary tenantId to ${usersResult.modifiedCount} user(s).`);

    // 4. Migrate Customers
    const customersResult = await Customer.updateMany(
      { tenantId: { $in: [null, undefined] } },
      { $set: { tenantId } }
    );
    console.log(`✓ [Customers]: Assigned primary tenantId to ${customersResult.modifiedCount} customer(s).`);

    // 5. Migrate Orders
    const ordersResult = await Order.updateMany(
      { tenantId: { $in: [null, undefined] } },
      { $set: { tenantId } }
    );
    console.log(`✓ [Orders]: Assigned primary tenantId to ${ordersResult.modifiedCount} order(s).`);

    // 6. Migrate Patterns
    const patternsResult = await Pattern.updateMany(
      { tenantId: { $in: [null, undefined] } },
      { $set: { tenantId } }
    );
    console.log(`✓ [Patterns]: Assigned primary tenantId to ${patternsResult.modifiedCount} pattern(s).`);

    // 7. Sync Mongoose schema indexes
    console.log('Synchronizing new compound indexes...');
    await Customer.syncIndexes();
    await Order.syncIndexes();
    await Pattern.syncIndexes();
    await Tenant.syncIndexes();
    console.log('✓ [Indexes]: Synchronized all compound multi-tenant indexes successfully.');

    // 8. Verification checks
    const unassignedCustomers = await Customer.countDocuments({ tenantId: { $in: [null, undefined] } });
    const unassignedOrders = await Order.countDocuments({ tenantId: { $in: [null, undefined] } });
    const unassignedPatterns = await Pattern.countDocuments({ tenantId: { $in: [null, undefined] } });

    if (unassignedCustomers > 0 || unassignedOrders > 0 || unassignedPatterns > 0) {
      throw new Error(`Migration incomplete! Unassigned: Customers=${unassignedCustomers}, Orders=${unassignedOrders}, Patterns=${unassignedPatterns}`);
    }

    console.log('\n======================================================');
    console.log('🎉 MULTI-TENANT MIGRATION COMPLETED SUCCESSFULLY! 🎉');
    console.log(`Primary Tenant: ${primaryTenant.businessName} (${primaryTenant.tenantCode})`);
    console.log(`Total Customers in Primary Tenant: ${await Customer.countDocuments({ tenantId })}`);
    console.log(`Total Orders in Primary Tenant: ${await Order.countDocuments({ tenantId })}`);
    console.log(`Total Patterns in Primary Tenant: ${await Pattern.countDocuments({ tenantId })}`);
    console.log('======================================================\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

if (process.argv[1] && process.argv[1].endsWith('migrate_to_multitenant.js')) {
  runMigration();
}
