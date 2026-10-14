import { firestore } from '../../plugins/firebase.js';
import { logger } from '../../utils/logger.js';
import { issueCommand, type CommandAction } from '../commands/commands.service.js';

export interface ScheduleRunResult {
  totalChecked: number;
  executedCount: number;
  skippedCount: number;
  errorCount: number;
}

/**
 * Extracts the 24-hour time "HH:MM" and weekday number (0=Sunday to 6=Saturday)
 * in the specified target timezone using Intl.DateTimeFormat.
 */
export function getTimeAndDayInTimezone(
  date: Date,
  timeZone: string
): { time: string; day: number } {
  try {
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    const parts = timeFormatter.formatToParts(date);
    const hour = parts.find((p) => p.type === 'hour')?.value.padStart(2, '0') ?? '00';
    const minute = parts.find((p) => p.type === 'minute')?.value.padStart(2, '0') ?? '00';
    const time = `${hour}:${minute}`;

    const dayFormatter = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' });
    const dayStr = dayFormatter.format(date);
    const dayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    const day = dayMap[dayStr] ?? date.getUTCDay();

    return { time, day };
  } catch (err) {
    logger.warn({ err, timeZone }, 'Invalid timezone specified, falling back to UTC');
    const hour = String(date.getUTCHours()).padStart(2, '0');
    const minute = String(date.getUTCMinutes()).padStart(2, '0');
    return { time: `${hour}:${minute}`, day: date.getUTCDay() };
  }
}

/**
 * Formats date as YYYYMMDDHHmm in the specified timezone for idempotency run slot doc ID.
 */
export function getRunSlotInTimezone(date: Date, timeZone: string): string {
  try {
    const f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    const parts = f.formatToParts(date);
    const y = parts.find((p) => p.type === 'year')?.value ?? '1970';
    const m = (parts.find((p) => p.type === 'month')?.value ?? '01').padStart(2, '0');
    const d = (parts.find((p) => p.type === 'day')?.value ?? '01').padStart(2, '0');
    const h = (parts.find((p) => p.type === 'hour')?.value ?? '00').padStart(2, '0');
    const min = (parts.find((p) => p.type === 'minute')?.value ?? '00').padStart(2, '0');
    return `${y}${m}${d}${h}${min}`;
  } catch {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    const h = String(date.getUTCHours()).padStart(2, '0');
    const min = String(date.getUTCMinutes()).padStart(2, '0');
    return `${y}${m}${d}${h}${min}`;
  }
}

/**
 * Runs due irrigation and device schedules for the given instant.
 *
 * SAFETY PRINCIPLE:
 * We deliberately execute schedules ONLY matching the current minute.
 * We strictly avoid catching up or executing missed schedules after server restarts.
 * Executing missed commands out-of-order or in accumulated bursts could over-irrigate crops,
 * drain water reservoirs, or cause electrical overload on pumps.
 */
export async function runDueSchedules(now: Date = new Date()): Promise<ScheduleRunResult> {
  const result: ScheduleRunResult = {
    totalChecked: 0,
    executedCount: 0,
    skippedCount: 0,
    errorCount: 0,
  };

  let scheduleDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];

  try {
    const snap = await firestore()
      .collectionGroup('schedules')
      .where('enabled', '==', true)
      .get();
    scheduleDocs = snap.docs;
  } catch (err: any) {
    if (err?.code === 9 || err?.message?.includes('index') || err?.message?.includes('COLLECTION_GROUP')) {
      logger.info('collectionGroup schedules index missing/building, falling back to per-farm query');
      const farmsSnap = await firestore().collection('farms').get();
      for (const farmDoc of farmsSnap.docs) {
        try {
          const sSnap = await farmDoc.ref.collection('schedules').where('enabled', '==', true).get();
          scheduleDocs.push(...sSnap.docs);
        } catch {
          // ignore
        }
      }
    } else {
      logger.error({ err }, 'Failed to query enabled schedules collectionGroup');
      return result;
    }
  }

  result.totalChecked = scheduleDocs.length;
  if (scheduleDocs.length === 0) {
    return result;
  }

  // Cache farm timezones for this execution run
  const farmTimezoneCache = new Map<string, string>();

  for (const doc of scheduleDocs) {
    const scheduleId = doc.id;
    const schedule = doc.data();

    try {
      const farmId = schedule.farmId || doc.ref.parent.parent?.id;
      if (!farmId) {
        logger.warn({ scheduleId }, 'Schedule is missing farmId reference, skipping');
        result.skippedCount++;
        continue;
      }

      // Retrieve and cache farm timezone
      let farmTimezone = farmTimezoneCache.get(farmId);
      if (!farmTimezone) {
        const farmDoc = await firestore().doc(`farms/${farmId}`).get();
        farmTimezone = (farmDoc.exists && farmDoc.data()?.timezone) ? farmDoc.data()?.timezone : 'UTC';
        farmTimezoneCache.set(farmId, farmTimezone as string);
      }
      const safeTimezone = farmTimezone || 'UTC';

      // Calculate current time & day in farm's local timezone
      const { time: currentFarmTime, day: currentFarmDay } = getTimeAndDayInTimezone(
        now,
        safeTimezone
      );

      // Check time match (HH:MM)
      if (schedule.time !== currentFarmTime) {
        result.skippedCount++;
        continue;
      }

      // Check day match
      if (schedule.days !== 'daily') {
        if (!Array.isArray(schedule.days) || !schedule.days.includes(currentFarmDay)) {
          result.skippedCount++;
          continue;
        }
      }

      // Formulate unique slot identifier for idempotency
      const runSlot = getRunSlotInTimezone(now, safeTimezone);
      const runDocId = `${scheduleId}_${runSlot}`;
      const runRef = firestore().doc(`farms/${farmId}/schedule_runs/${runDocId}`);

      // a) IDEMPOTENCY: create run doc using .create()
      try {
        await runRef.create({
          scheduleId,
          farmId,
          deviceId: schedule.deviceId,
          action: schedule.action,
          slot: runSlot,
          executedAt: now.toISOString(),
        });
      } catch (err: any) {
        // Document already exists (code 6) -> another worker or run already handled this minute
        if (
          err?.code === 6 ||
          err?.message?.includes('ALREADY_EXISTS') ||
          err?.details?.includes('Already exists')
        ) {
          logger.debug(
            { scheduleId, runDocId },
            'Schedule run document already exists for this slot, skipping (idempotent)'
          );
          result.skippedCount++;
          continue;
        }
        throw err;
      }

      // Verify device still exists in farm
      const deviceRef = firestore().doc(`farms/${farmId}/devices/${schedule.deviceId}`);
      const deviceSnap = await deviceRef.get();
      if (!deviceSnap.exists) {
        logger.warn(
          { scheduleId, farmId, deviceId: schedule.deviceId },
          'Scheduled device no longer exists in farm'
        );
        await doc.ref.update({
          lastRunAt: now.toISOString(),
          lastRunStatus: 'error',
        });
        result.errorCount++;
        continue;
      }

      // b) Dispatch command
      try {
        const cmdRes = await issueCommand({
          farmId,
          deviceId: schedule.deviceId,
          action: schedule.action as CommandAction,
          requestedBy: `schedule:${scheduleId}`,
          source: 'scheduler',
          durationSeconds: schedule.durationSeconds ?? null,
        });

        // Update schedule metadata
        await doc.ref.update({
          lastRunAt: now.toISOString(),
          lastRunStatus: 'issued',
          lastRunCommandId: cmdRes.commandId,
        });

        logger.info(
          { scheduleId, commandId: cmdRes.commandId, farmId, action: schedule.action },
          `Scheduled action ${schedule.action} successfully issued for device ${schedule.deviceId}`
        );
        result.executedCount++;
      } catch (issueErr: any) {
        logger.error(
          { issueErr: issueErr.message, scheduleId, farmId, deviceId: schedule.deviceId },
          'Failed to issue scheduled command'
        );

        await doc.ref.update({
          lastRunAt: now.toISOString(),
          lastRunStatus: 'error',
        });
        result.errorCount++;
      }
    } catch (scheduleErr: any) {
      logger.error({ scheduleErr, scheduleId }, 'Unhandled error processing schedule');
      result.errorCount++;
    }
  }

  return result;
}
