import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from '../models/User.js';
import { Customer } from '../models/Customer.js';
import { Order } from '../models/Order.js';
import { OrderCounter } from '../models/OrderCounter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local storage directory for database backups
export const BACKUP_DIR = process.env.BACKUP_DIR
  ? path.resolve(process.env.BACKUP_DIR)
  : path.resolve(__dirname, '../../backups');

// Maximum number of backup files to keep in local storage: ONLY ONE backup file
export const MAX_BACKUP_RETENTION = 1;

/**
 * Format date as YYYY-MM-DD.json (file name is date)
 * @param {Date} date
 * @returns {string} e.g. "2026-10-26.json"
 */
export function getBackupDateFilename(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}.json`;
}

/**
 * Ensure backup directory exists on the local filesystem
 */
export function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`[Backup Service] Created local backup directory: ${BACKUP_DIR}`);
  }
}

/**
 * Helper to format bytes into readable KB/MB
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Create a full database backup and save it to server local storage.
 * File name is date (e.g. 2026-10-26.json).
 * Enforces strictly storing only one backup file.
 * @param {Object} options
 * @param {'cron_7_days'|'manual'|'pre_restore'} [options.triggeredBy='cron_7_days']
 * @param {string} [options.note='']
 * @param {string} [options.filename]
 */
export async function createBackup({ triggeredBy = 'cron_7_days', note = '', filename: customFilename } = {}) {
  ensureBackupDir();

  // Query all database collections
  const [users, customers, orders, orderCounters] = await Promise.all([
    User.find().lean(),
    Customer.find().lean(),
    Order.find().lean(),
    OrderCounter.find().lean(),
  ]);

  const timestamp = new Date();
  const dateIso = timestamp.toISOString();
  // File name is date (e.g. 2026-10-26.json)
  const filename = customFilename || getBackupDateFilename(timestamp);
  const filePath = path.join(BACKUP_DIR, filename);

  const meta = {
    version: '1.0.0',
    system: 'Tailor Management System (Silai Master)',
    createdAt: dateIso,
    triggeredBy,
    note: note || (triggeredBy === 'cron_7_days' ? 'Automated 7-day scheduled backup' : 'Manual backup'),
    stats: {
      users: users.length,
      customers: customers.length,
      orders: orders.length,
      orderCounters: orderCounters.length,
      totalRecords: users.length + customers.length + orders.length + orderCounters.length,
    },
  };

  const backupPayload = {
    meta,
    data: {
      users,
      customers,
      orders,
      orderCounters,
    },
  };

  const jsonContent = JSON.stringify(backupPayload, null, 2);
  await fs.promises.writeFile(filePath, jsonContent, 'utf-8');

  // Enforce single backup file policy: delete all other backup files in BACKUP_DIR
  const files = await fs.promises.readdir(BACKUP_DIR);
  for (const existingFile of files) {
    if (existingFile !== filename && existingFile.endsWith('.json')) {
      try {
        await fs.promises.unlink(path.join(BACKUP_DIR, existingFile));
        console.log(`[Backup Retention] Removed old backup file: ${existingFile} (maintaining only 1 backup file)`);
      } catch (delErr) {
        console.warn(`[Backup Retention] Could not remove old backup ${existingFile}:`, delErr.message);
      }
    }
  }

  const fileStats = await fs.promises.stat(filePath);

  return {
    filename,
    filePath,
    sizeBytes: fileStats.size,
    sizeFormatted: formatBytes(fileStats.size),
    createdAt: dateIso,
    meta,
  };
}

/**
 * List all backup files stored in server local storage
 */
export async function listBackups() {
  ensureBackupDir();

  const files = await fs.promises.readdir(BACKUP_DIR);
  const jsonFiles = files.filter((f) => f.endsWith('.json'));

  const backupList = [];
  let totalSizeBytes = 0;

  for (const filename of jsonFiles) {
    const filePath = path.join(BACKUP_DIR, filename);
    try {
      const stats = await fs.promises.stat(filePath);
      totalSizeBytes += stats.size;

      // Read small portion or full JSON to extract metadata
      const rawContent = await fs.promises.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(rawContent);

      backupList.push({
        filename,
        sizeBytes: stats.size,
        sizeFormatted: formatBytes(stats.size),
        createdAt: parsed?.meta?.createdAt || stats.mtime.toISOString(),
        triggeredBy: parsed?.meta?.triggeredBy || (filename.includes('cron') ? 'cron_7_days' : 'manual'),
        note: parsed?.meta?.note || '',
        stats: parsed?.meta?.stats || {
          users: parsed?.data?.users?.length || 0,
          customers: parsed?.data?.customers?.length || 0,
          orders: parsed?.data?.orders?.length || 0,
          orderCounters: parsed?.data?.orderCounters?.length || 0,
          totalRecords:
            (parsed?.data?.users?.length || 0) +
            (parsed?.data?.customers?.length || 0) +
            (parsed?.data?.orders?.length || 0) +
            (parsed?.data?.orderCounters?.length || 0),
        },
      });
    } catch (err) {
      console.warn(`[Backup Service] Error reading metadata for ${filename}:`, err.message);
    }
  }

  // Sort descending: newest first
  backupList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    backups: backupList,
    totalCount: backupList.length,
    totalSizeBytes,
    totalSizeFormatted: formatBytes(totalSizeBytes),
    backupDirectory: BACKUP_DIR,
    maxRetention: MAX_BACKUP_RETENTION,
  };
}

/**
 * Get the full data of the latest backup (used for browser localStorage sync)
 */
export async function getLatestBackupData() {
  ensureBackupDir();
  const summary = await listBackups();
  if (summary.backups.length === 0) {
    return null;
  }

  const latestFile = summary.backups[0].filename;
  const filePath = path.join(BACKUP_DIR, latestFile);
  const rawContent = await fs.promises.readFile(filePath, 'utf-8');
  return JSON.parse(rawContent);
}

/**
 * Get validated safe path for a backup file
 * @param {string} filename
 */
export function getSafeBackupFilePath(filename) {
  ensureBackupDir();
  // Prevent directory traversal attacks
  const safeBase = path.basename(filename);
  if (safeBase !== filename || !filename.endsWith('.json')) {
    throw new Error('Invalid backup filename.');
  }

  const filePath = path.join(BACKUP_DIR, safeBase);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Backup file "${filename}" not found in local storage.`);
  }

  return filePath;
}

/**
 * Delete a backup file from server local storage
 * @param {string} filename
 */
export async function deleteBackupFile(filename) {
  const filePath = getSafeBackupFilePath(filename);
  await fs.promises.unlink(filePath);
  return { success: true, deleted: filename };
}

/**
 * Prune old backups to respect retention policy (strictly keeps 1 file)
 * @param {number} maxToKeep
 */
export async function pruneOldBackups(maxToKeep = MAX_BACKUP_RETENTION) {
  try {
    ensureBackupDir();
    const files = await fs.promises.readdir(BACKUP_DIR);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    if (jsonFiles.length <= maxToKeep) return;

    // Collect file mtime
    const fileStats = await Promise.all(
      jsonFiles.map(async (filename) => {
        const filePath = path.join(BACKUP_DIR, filename);
        const stats = await fs.promises.stat(filePath);
        return { filename, filePath, mtime: stats.mtime.getTime() };
      })
    );

    // Sort descending (newest first)
    fileStats.sort((a, b) => b.mtime - a.mtime);

    // Delete everything beyond maxToKeep
    const toDelete = fileStats.slice(maxToKeep);

    for (const file of toDelete) {
      await fs.promises.unlink(file.filePath);
      console.log(`[Backup Retention] Pruned old backup from local storage: ${file.filename}`);
    }
  } catch (err) {
    console.warn(`[Backup Retention] Error pruning backups:`, err.message);
  }
}

/**
 * Restore database from backup JSON data object
 * @param {Object} backupData
 */
export async function restoreDatabase(backupData) {
  if (!backupData || !backupData.data) {
    throw new Error('Invalid backup file format: missing "data" collection root.');
  }

  const { users, customers, orders, orderCounters } = backupData.data;

  let restoredCounts = {
    users: 0,
    customers: 0,
    orders: 0,
    orderCounters: 0,
  };

  // 1. Restore Users
  if (Array.isArray(users) && users.length > 0) {
    await User.deleteMany({});
    await User.insertMany(users);
    restoredCounts.users = users.length;
  }

  // 2. Restore Customers
  if (Array.isArray(customers) && customers.length > 0) {
    await Customer.deleteMany({});
    await Customer.insertMany(customers);
    restoredCounts.customers = customers.length;
  }

  // 3. Restore Orders
  if (Array.isArray(orders) && orders.length > 0) {
    await Order.deleteMany({});
    await Order.insertMany(orders);
    restoredCounts.orders = orders.length;
  }

  // 4. Restore Order Counters
  if (Array.isArray(orderCounters) && orderCounters.length > 0) {
    await OrderCounter.deleteMany({});
    await OrderCounter.insertMany(orderCounters);
    restoredCounts.orderCounters = orderCounters.length;
  }

  return {
    success: true,
    message: 'Database restored successfully from backup',
    restoredCounts,
    timestamp: new Date().toISOString(),
  };
}
