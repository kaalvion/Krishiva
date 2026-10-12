import cron, { type ScheduledTask } from 'node-cron';
import { logger } from '../utils/logger.js';

let heartbeatTask: ScheduledTask | null = null;

/**
 * Initializes scheduled cron jobs.
 * Starts a 1-minute heartbeat task.
 */
export function startScheduler(): ScheduledTask {
  if (heartbeatTask) {
    return heartbeatTask;
  }

  heartbeatTask = cron.schedule('* * * * *', () => {
    logger.debug({ timestamp: new Date().toISOString() }, 'Krishiva system heartbeat');
  });

  logger.info('Scheduler started');
  return heartbeatTask;
}

export function stopScheduler(): void {
  if (heartbeatTask) {
    heartbeatTask.stop();
    heartbeatTask = null;
    logger.info('Scheduler stopped');
  }
}

export default {
  startScheduler,
  stopScheduler,
};
