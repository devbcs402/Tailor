import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tailor_management';

export async function bootstrapPlatformOwner() {
  console.log('=== Checking Platform Owner Bootstrap ===');
  await mongoose.connect(MONGODB_URI);

  try {
    const existingOwner = await User.findOne({ role: 'platform_owner' });
    if (existingOwner) {
      console.log(`✓ [Platform Owner]: Platform owner already exists (${existingOwner.email}, ID: ${existingOwner._id}). Skipping creation.`);
      return existingOwner;
    }

    const ownerEmail = process.env.OWNER_EMAIL || 'owner@platform.com';
    const ownerPassword = process.env.OWNER_PASSWORD || 'Owner@Pass2026!';
    const passwordHash = await User.hashPassword(ownerPassword);

    const owner = new User({
      name: 'Central Platform Owner',
      email: ownerEmail.toLowerCase().trim(),
      passwordHash,
      role: 'platform_owner',
      tenantId: null,
      shopName: 'Central Platform Administration',
      isActive: true,
    });

    await owner.save();
    console.log('\n======================================================');
    console.log('🎉 PLATFORM OWNER BOOTSTRAPPED SUCCESSFULLY! 🎉');
    console.log(`Email: ${owner.email}`);
    console.log(`Role: ${owner.role}`);
    console.log(`ID: ${owner._id}`);
    console.log('======================================================\n');
    return owner;
  } catch (error) {
    console.error('❌ Failed to bootstrap platform owner:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

if (process.argv[1] && process.argv[1].endsWith('bootstrap_owner.js')) {
  bootstrapPlatformOwner();
}
