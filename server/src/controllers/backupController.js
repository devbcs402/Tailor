import fs from 'fs';
import {
  createBackup,
  listBackups,
  getLatestBackupData,
  getSafeBackupFilePath,
  deleteBackupFile,
  restoreDatabase,
} from '../services/backupService.js';
import { getCronStatus, executeScheduledBackup } from '../services/cronService.js';

/**
 * GET /api/backups
 * Returns cron scheduler status, local storage metrics, and list of backup files
 */
export async function getBackupsSummary(req, res, next) {
  try {
    const cron = getCronStatus();
    const storageInfo = await listBackups();

    return res.json({
      success: true,
      cron,
      storage: {
        backupDirectory: storageInfo.backupDirectory,
        totalCount: storageInfo.totalCount,
        totalSizeBytes: storageInfo.totalSizeBytes,
        totalSizeFormatted: storageInfo.totalSizeFormatted,
        maxRetention: storageInfo.maxRetention,
      },
      backups: storageInfo.backups,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/backups/trigger
 * Manually creates an immediate backup in server local storage
 */
export async function triggerBackup(req, res, next) {
  try {
    const { note, runCronJob } = req.body || {};

    let result;
    if (runCronJob) {
      result = await executeScheduledBackup('cron_7_days');
    } else {
      result = await createBackup({
        triggeredBy: 'manual',
        note: note || `Manual backup created by ${req.user?.name || 'Admin'}`,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Backup successfully created and saved to local storage.',
      backup: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/backups/latest-data
 * Returns the latest backup data payload directly so client can save to browser localStorage
 */
export async function getLatestBackup(req, res, next) {
  try {
    const latestData = await getLatestBackupData();

    return res.json({
      success: true,
      backup: latestData,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/backups/download/:filename
 * Download a backup JSON file from server local storage
 */
export async function downloadBackup(req, res, next) {
  try {
    const { filename } = req.params;
    const filePath = getSafeBackupFilePath(filename);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.download(filePath, filename);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/backups/restore/:filename
 * Restores the database from a backup file stored in server local storage
 */
export async function restoreFromLocalBackup(req, res, next) {
  try {
    const { filename } = req.params;
    const filePath = getSafeBackupFilePath(filename);

    const raw = await fs.promises.readFile(filePath, 'utf-8');
    const backupData = JSON.parse(raw);

    const result = await restoreDatabase(backupData);

    return res.json({
      success: true,
      message: `Database restored successfully from "${filename}".`,
      details: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/backups/restore-data
 * Restores the database from arbitrary uploaded JSON payload (or client localStorage payload)
 */
export async function restoreFromPayload(req, res, next) {
  try {
    const backupData = req.body;
    if (!backupData || !backupData.data) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload: backup must contain "data" object with collections.',
      });
    }

    const result = await restoreDatabase(backupData);

    return res.json({
      success: true,
      message: 'Database restored successfully from provided payload.',
      details: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/backups/:filename
 * Deletes a backup file from server local storage
 */
export async function deleteBackup(req, res, next) {
  try {
    const { filename } = req.params;
    const result = await deleteBackupFile(filename);

    return res.json({
      success: true,
      message: `Backup "${filename}" deleted from local storage.`,
      result,
    });
  } catch (error) {
    next(error);
  }
}
