import cron, { type ScheduledTask } from 'node-cron';
import { logger } from '../utils/logger.js';
import { sweepExpiredCommands } from '../modules/commands/commands.service.js';
import { runDueSchedules } from '../modules/schedules/schedules.runner.js';
import { detectOfflineDevices } from './offline-detector.js';
import { fetchWeatherForAllActiveFarms } from '../modules/weather/weather.service.js';
import { computeHealthForAllFarms } from '../modules/ai/health-score.service.js';
import { generateBriefsForAllFarms } from '../modules/ai/brief.service.js';
import { processAlertQueue } from '../modules/ai/alert-explainer.service.js';
import { rebuildBaselines } from '../modules/ai/anomaly.service.js';
import { computeIrrigationForAllFarms } from '../modules/ai/irrigation.service.js';
import { computeWaterReportsForAllFarms } from '../modules/ai/water-optimizer.service.js';
import { predictYieldForAllFarms } from '../modules/ai/yield-predictor.service.js';
import { isGrokEnabled } from '../modules/ai/grok.client.js';

let heartbeatTask: ScheduledTask | null = null;
let commandSweepTask: ScheduledTask | null = null;
let scheduleRunnerTask: ScheduledTask | null = null;
let offlineDetectorTask: ScheduledTask | null = null;
let weatherTask: ScheduledTask | null = null;
let healthScoreTask: ScheduledTask | null = null;
let briefTask: ScheduledTask | null = null;
let alertQueueTask: ScheduledTask | null = null;
let baselineRebuildTask: ScheduledTask | null = null;
let irrigationTask: ScheduledTask | null = null;
let weeklyReportsTask: ScheduledTask | null = null;

/**
 * Checks if the current time in a given IANA timezone matches target hours (06:00 or 18:00).
 */
function isTargetHour(timezone: string, targetHours: number[] = [6, 18]): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hourCycle: 'h23',
    });
    const currentHour = parseInt(formatter.format(new Date()), 10);
    return targetHours.includes(currentHour);
  } catch {
    const currentUtcHour = new Date().getUTCHours();
    return targetHours.includes(currentUtcHour);
  }
}

/**
 * Initializes scheduled cron jobs:
 * 1. 1-minute system heartbeat
 * 2. 1-minute command expiration sweep
 * 3. 1-minute irrigation and device schedule execution runner
 * 4. 1-minute hardware node offline detection
 * 5. 3-hour weather forecast fetch for active farms (also runs on boot)
 * 6. 5-minute farm health score calculation (also runs on boot)
 * 7. Hourly brief check (fires at 06:00 and 18:00 farm time, plus boot catch-up)
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

  // Weather: every 3 hours
  weatherTask = cron.schedule('0 */3 * * *', async () => {
    try {
      await fetchWeatherForAllActiveFarms();
    } catch (err) {
      logger.error({ err }, 'Failed to execute fetchWeatherForAllActiveFarms cron task');
    }
  });

  // Health Score: every 5 minutes
  healthScoreTask = cron.schedule('*/5 * * * *', async () => {
    try {
      await computeHealthForAllFarms();
    } catch (err) {
      logger.error({ err }, 'Failed to execute computeHealthForAllFarms cron task');
    }
  });

  // Farm Brief: check hourly for local 06:00 and 18:00 windows
  briefTask = cron.schedule('0 * * * *', async () => {
    if (!isGrokEnabled()) return;
    try {
      // generateBriefsForAllFarms checks 4-hour cache guard internally
      await generateBriefsForAllFarms(false);
    } catch (err) {
      logger.error({ err }, 'Failed to execute brief generator cron task');
    }
  });

  // Alert AI explanation queue processor: every 1 minute
  alertQueueTask = cron.schedule('* * * * *', async () => {
    try {
      await processAlertQueue();
    } catch (err) {
      logger.error({ err }, 'Failed to execute processAlertQueue cron task');
    }
  });

  // Z-Score Baseline rebuild: daily at 2:00 AM
  baselineRebuildTask = cron.schedule('0 2 * * *', async () => {
    try {
      await rebuildBaselines();
    } catch (err) {
      logger.error({ err }, 'Failed to execute rebuildBaselines cron task');
    }
  });

  // Irrigation prediction: every 1 hour
  irrigationTask = cron.schedule('0 * * * *', async () => {
    try {
      await computeIrrigationForAllFarms();
    } catch (err) {
      logger.error({ err }, 'Failed to execute computeIrrigationForAllFarms cron task');
    }
  });

  // Weekly reports (water optimization & yield prediction): Sunday at 2:00 AM
  weeklyReportsTask = cron.schedule('0 2 * * 0', async () => {
    try {
      logger.info('Starting weekly water and yield report generation for all farms');
      await computeWaterReportsForAllFarms();
      await predictYieldForAllFarms();
      logger.info('Weekly report generation complete');
    } catch (err) {
      logger.error({ err }, 'Failed to execute weekly reports cron task');
    }
  });

  // Run initial boot passes asynchronously without blocking startup in production/dev
  if (process.env.NODE_ENV !== 'test') {
    setTimeout(async () => {
      try {
        logger.info('Running on-boot weather and health score passes...');
        await fetchWeatherForAllActiveFarms();
        await computeHealthForAllFarms();
        await computeIrrigationForAllFarms();
        if (isGrokEnabled()) {
          await generateBriefsForAllFarms(false);
        }
      } catch (err) {
        logger.warn({ err }, 'Initial on-boot tasks encountered an error');
      }
    }, 2000);
  }

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
  if (weatherTask) {
    weatherTask.stop();
    weatherTask = null;
  }
  if (healthScoreTask) {
    healthScoreTask.stop();
    healthScoreTask = null;
  }
  if (briefTask) {
    briefTask.stop();
    briefTask = null;
  }
  if (alertQueueTask) {
    alertQueueTask.stop();
    alertQueueTask = null;
  }
  if (baselineRebuildTask) {
    baselineRebuildTask.stop();
    baselineRebuildTask = null;
  }
  if (irrigationTask) {
    irrigationTask.stop();
    irrigationTask = null;
  }
  if (weeklyReportsTask) {
    weeklyReportsTask.stop();
    weeklyReportsTask = null;
  }
  logger.info('Scheduler stopped');
}

export default {
  startScheduler,
  stopScheduler,
};
