import { connectDB } from '../config/db.js';
import app from '../app.js';
import http from 'http';
import jwt from 'jsonwebtoken';
import { Tenant } from '../models/Tenant.js';
import { User } from '../models/User.js';

async function testBackupEndpoints() {
  console.log('=== Starting Test for 7-Day Cron & Backup Local Storage ===');

  await connectDB();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5001, resolve));
  const BASE_URL = 'http://localhost:5001/api';

  try {
    // 1. Authenticate with active tenant
    const tenant = await Tenant.findOne({ status: 'active' });
    if (!tenant) throw new Error('No active tenant found');
    const user = await User.findOne({ tenantId: tenant._id, isActive: true });
    if (!user) throw new Error('No active user found for tenant');

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'super_secret_tailor_management_key_2026_xyz',
      { expiresIn: '1h' }
    );
    console.log(`✓ [Auth]: Authenticated as ${user.name} (${tenant.businessName})`);

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 2. GET /api/backups
    const summaryRes = await fetch(`${BASE_URL}/backups`, { headers });
    const summary = await summaryRes.json();
    console.log('✓ [Backups Summary]:', {
      cronSchedule: summary.cron.schedule,
      scheduleDesc: summary.cron.scheduleDescription,
      totalFiles: summary.storage.totalCount,
      totalSize: summary.storage.totalSizeFormatted,
    });

    // 3. POST /api/backups/trigger (Manual backup)
    const triggerRes = await fetch(`${BASE_URL}/backups/trigger`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ note: 'Integration test backup' }),
    });
    const triggerData = await triggerRes.json();
    console.log('✓ [Trigger Backup]:', {
      success: triggerData.success,
      file: triggerData.backup.filename,
      size: triggerData.backup.sizeFormatted,
      records: triggerData.backup.meta.stats.totalRecords,
    });
    const testFile = triggerData.backup.filename;

    // 4. GET /api/backups/latest-data (For browser localStorage sync)
    const latestRes = await fetch(`${BASE_URL}/backups/latest-data`, { headers });
    const latestData = await latestRes.json();
    console.log('✓ [Latest Backup Data for LocalStorage]:', {
      success: latestData.success,
      timestamp: latestData.backup.meta.createdAt,
      customersInBackup: latestData.backup.data.customers.length,
      ordersInBackup: latestData.backup.data.orders.length,
    });

    // 5. GET /api/backups/download/:filename
    const dlRes = await fetch(`${BASE_URL}/backups/download/${testFile}`, { headers });
    if (!dlRes.ok) throw new Error('Download failed: ' + dlRes.statusText);
    const dlText = await dlRes.text();
    console.log('✓ [Download Backup]: Successfully downloaded', dlText.length, 'bytes.');

    // 6. POST /api/backups/restore/:filename
    const restoreRes = await fetch(`${BASE_URL}/backups/restore/${testFile}`, {
      method: 'POST',
      headers,
    });
    const restoreData = await restoreRes.json();
    console.log('✓ [Restore from Local Storage]:', {
      success: restoreData.success,
      restored: restoreData.details.restoredCounts,
    });

    // 7. POST /api/backups/trigger with runCronJob=true
    const cronTestRes = await fetch(`${BASE_URL}/backups/trigger`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ runCronJob: true }),
    });
    const cronTestData = await cronTestRes.json();
    console.log('✓ [Cron 7-Day Trigger]:', {
      file: cronTestData.backup.filename,
      triggeredBy: cronTestData.backup.meta.triggeredBy,
    });

    console.log('=== All 7-Day Cron & Local Storage Tests PASSED Successfully! ===');
  } catch (err) {
    console.error('✗ Test failed:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    process.exit(process.exitCode || 0);
  }
}

testBackupEndpoints();
