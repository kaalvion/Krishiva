import cron, { type ScheduledTask } from 'node-cron';
import { logger } from '../utils/logger.js';
import { sweepExpiredCommands } from '../modules/commands/commands.service.js';

let heartbeatTask: ScheduledTask | null = null;
let commandSweepTask: ScheduledTask | null = null;

/**
 * Initializes scheduled cron jobs.
 * Starts a 1-minute heartbeat task and a 1-minute command expiration sweep job.
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
  logger.info('Scheduler stopped');
}

export default {
  startScheduler,
  stopScheduler,
};

