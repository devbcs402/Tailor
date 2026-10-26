import { connectDB } from '../config/db.js';
import app from '../app.js';
import http from 'http';

async function testBackupEndpoints() {
  console.log('=== Starting Test for 7-Day Cron & Backup Local Storage ===');

  await connectDB();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5001, resolve));
  const BASE_URL = 'http://localhost:5001/api';

  try {
    // 1. Login
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@tailor.com', password: 'admin123' }),
    });
    const loginData = await loginRes.json();
    if (!loginData.success || !loginData.token) {
      throw new Error('Admin login failed: ' + JSON.stringify(loginData));
    }
    const token = loginData.token;
    console.log('✓ [Auth]: Admin logged in successfully.');

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
