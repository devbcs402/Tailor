import cron from 'node-cron';
import { createBackup } from './backupService.js';

// Default: Every 7 days (Weekly on Sunday at 02:00 AM).
// Can be customized via BACKUP_CRON_SCHEDULE in .env (e.g. '0 2 * * 0' or '0 0 */7 * *')
const DEFAULT_SCHEDULE = '0 2 * * 0';
const CRON_EXPRESSION = process.env.BACKUP_CRON_SCHEDULE || DEFAULT_SCHEDULE;

// In-memory status & run history for dashboard monitoring
const cronState = {
  schedule: CRON_EXPRESSION,
  scheduleDescription: 'Every 7 days (Weekly on Sunday at 02:00 AM)',
  isRunning: false,
  lastRun: null,
  lastStatus: 'PENDING',
  lastError: null,
  lastBackupFile: null,
  history: [],
};

let scheduledTask = null;

/**
 * Execute the 7-day backup routine
 * @param {'cron_7_days'|'manual_test'} triggeredBy
 */
export async function executeScheduledBackup(triggeredBy = 'cron_7_days') {
  const startedAt = new Date();
  console.log(`[Cron Backup] ==========================================`);
  console.log(`[Cron Backup] Starting 7-day automated backup job at ${startedAt.toISOString()}`);

  try {
    const backupResult = await createBackup({
      triggeredBy,
      note: triggeredBy === 'cron_7_days'
        ? 'Automated 7-day recurring backup job'
        : 'Manual test trigger of 7-day backup job',
    });

    cronState.lastRun = startedAt.toISOString();
    cronState.lastStatus = 'SUCCESS';
    cronState.lastError = null;
    cronState.lastBackupFile = backupResult.filename;

    // Record in history (keep last 10 execution logs)
    cronState.history.unshift({
      timestamp: startedAt.toISOString(),
      status: 'SUCCESS',
      filename: backupResult.filename,
      sizeFormatted: backupResult.sizeFormatted,
      records: backupResult.meta.stats.totalRecords,
      triggeredBy,
    });
    if (cronState.history.length > 10) {
      cronState.history.pop();
    }

    console.log(`[Cron Backup] ✓ Backup stored in local storage: ${backupResult.filename}`);
    console.log(`[Cron Backup] ✓ Size: ${backupResult.sizeFormatted} | Total records: ${backupResult.meta.stats.totalRecords}`);
    console.log(`[Cron Backup] ==========================================`);

    return backupResult;
  } catch (error) {
    cronState.lastRun = startedAt.toISOString();
    cronState.lastStatus = 'FAILED';
    cronState.lastError = error.message;

    cronState.history.unshift({
      timestamp: startedAt.toISOString(),
      status: 'FAILED',
      error: error.message,
      triggeredBy,
    });
    if (cronState.history.length > 10) {
      cronState.history.pop();
    }

    console.error(`[Cron Backup] ✗ Automated backup job failed:`, error.message);
    console.log(`[Cron Backup] ==========================================`);
    throw error;
  }
}

/**
 * Initialize and start the recurring 7-day backup cron job.
 * Runs once every 7 days (e.g. Weekly on Sunday at 02:00 AM).
 * Does NOT execute the backup on server startup or restart.
 */
export function initBackupCron() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }

  if (!cron.validate(CRON_EXPRESSION)) {
    console.error(`[Cron Backup] Invalid cron expression: "${CRON_EXPRESSION}". Cron job not started.`);
    return;
  }

  // Schedule the task to run once every 7 days (does NOT run immediately on startup)
  scheduledTask = cron.schedule(CRON_EXPRESSION, async () => {
    try {
      await executeScheduledBackup('cron_7_days');
    } catch (err) {
      // Error already logged in executeScheduledBackup
    }
  });

  cronState.isRunning = true;
  console.log(`[Cron Backup] ✓ 7-Day Backup Cron scheduled: "${CRON_EXPRESSION}" (${cronState.scheduleDescription}).`);
  console.log(`[Cron Backup] ✓ Backup runs once every 7 days. Will NOT run on server restart.`);
}

/**
 * Get current status of the backup cron job
 */
export function getCronStatus() {
  return {
    ...cronState,
    schedule: CRON_EXPRESSION,
    scheduleDescription:
      CRON_EXPRESSION === DEFAULT_SCHEDULE
        ? 'Every 7 days (Weekly on Sunday at 02:00 AM)'
        : `Custom schedule: "${CRON_EXPRESSION}"`,
  };
}
