import cron, { type ScheduledTask } from 'node-cron';
import { logger } from '../utils/logger.js';
import { sweepExpiredCommands } from '../modules/commands/commands.service.js';
import { runDueSchedules } from '../modules/schedules/schedules.runner.js';
import { detectOfflineDevices } from './offline-detector.js';

let heartbeatTask: ScheduledTask | null = null;
let commandSweepTask: ScheduledTask | null = null;
let scheduleRunnerTask: ScheduledTask | null = null;
let offlineDetectorTask: ScheduledTask | null = null;

/**
 * Initializes scheduled cron jobs:
 * 1. 1-minute system heartbeat
 * 2. 1-minute command expiration sweep
 * 3. 1-minute irrigation and device schedule execution runner
 * 4. 1-minute hardware node offline detection
 */
export function startScheduler(): ScheduledTask {
  if (heartbeatTask) {
    return heartbeatTask;
  }

  heartbeatTask = cron.schedule('* * * * *', () => {
    logger.debug({ timestamp: new Date().toISOString() }, 'Krishiva system heartbeat');
  });

  commandSweepTask = cron.schedule('* * * * *', async () => {
    try {
      await sweepExpiredCommands();
    } catch (err) {
      logger.error({ err }, 'Failed to run sweepExpiredCommands cron task');
    }
  });

  scheduleRunnerTask = cron.schedule('* * * * *', async () => {
    try {
      await runDueSchedules(new Date());
    } catch (err) {
      logger.error({ err }, 'Failed to execute runDueSchedules cron task');
    }
  });

  offlineDetectorTask = cron.schedule('* * * * *', async () => {
    try {
      await detectOfflineDevices(new Date());
    } catch (err) {
      logger.error({ err }, 'Failed to execute detectOfflineDevices cron task');
    }
  });

  logger.info('Scheduler started');
  return heartbeatTask;
}

export function stopScheduler(): void {
  if (heartbeatTask) {
    heartbeatTask.stop();
    heartbeatTask = null;
  }
  if (commandSweepTask) {
    commandSweepTask.stop();
    commandSweepTask = null;
  }
  if (scheduleRunnerTask) {
    scheduleRunnerTask.stop();
    scheduleRunnerTask = null;
  }
  if (offlineDetectorTask) {
    offlineDetectorTask.stop();
    offlineDetectorTask = null;
  }
  logger.info('Scheduler stopped');
}

export default {
  startScheduler,
  stopScheduler,
};
