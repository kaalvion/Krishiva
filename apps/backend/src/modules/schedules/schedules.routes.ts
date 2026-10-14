import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { firestore } from '../../plugins/firebase.js';
import { HttpError, requireFarmMember } from '../farms/farms.helper.js';
import {
  ACTION_CAPABILITY_MAP,
  COMMAND_ACTIONS,
  type CommandAction,
} from '../commands/commands.service.js';

export const createScheduleSchema = z.object({
  deviceId: z.string({ required_error: 'deviceId is required' }).min(1, 'deviceId cannot be empty'),
  action: z.enum(COMMAND_ACTIONS, {
    required_error: `action is required. Must be one of: ${COMMAND_ACTIONS.join(', ')}`,
  }),
  time: z
    .string({ required_error: 'time is required' })
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'time must be in 24h format HH:MM (00:00 to 23:59)'),
  days: z
    .union([
      z.literal('daily'),
      z.array(z.number().int().min(0).max(6)).min(1, 'days array must contain at least one day (0-6)'),
    ])
    .default('daily'),
  durationSeconds: z.coerce
    .number()
    .int('durationSeconds must be an integer')
    .min(1, 'durationSeconds must be between 1 and 3600')
    .max(3600, 'durationSeconds must be between 1 and 3600')
    .optional(),
  enabled: z.boolean().default(true),
  name: z.string().max(60, 'name must be at most 60 characters').optional(),
});

export const updateScheduleSchema = z.object({
  name: z.string().max(60, 'name must be at most 60 characters').nullable().optional(),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'time must be in 24h format HH:MM (00:00 to 23:59)')
    .optional(),
  days: z
    .union([
      z.literal('daily'),
      z.array(z.number().int().min(0).max(6)).min(1, 'days array must contain at least one day (0-6)'),
    ])
    .optional(),
  durationSeconds: z.coerce
    .number()
    .int('durationSeconds must be an integer')
    .min(1, 'durationSeconds must be between 1 and 3600')
    .max(3600, 'durationSeconds must be between 1 and 3600')
    .nullable()
    .optional(),
  enabled: z.boolean().optional(),
  action: z.enum(COMMAND_ACTIONS).optional(),
});

const errorResponseSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'number' },
    error: { type: 'string' },
    message: { type: 'string' },
    issues: { type: 'array' },
  },
  additionalProperties: true,
};

export const schedulesRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/farms/:farmId/schedules
   * Lists all irrigation and device schedules for a farm (members only, sorted by time asc).
   */
  fastify.get<{ Params: { farmId: string } }>(
    '/farms/:farmId/schedules',
    {
      schema: {
        tags: ['Schedules'],
        summary: 'List farm schedules',
        description: 'Returns all configured schedules for the farm sorted by time ascending',
        security: [{ BearerAuth: [] }],
        params: {
          type: 'object',
          required: ['farmId'],
          properties: {
            farmId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'array',
            items: { type: 'object', additionalProperties: true },
          },
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const uid = request.user?.uid;
      if (!uid) throw new HttpError(401, 'Unauthorized');

      const { farmId } = request.params;
      await requireFarmMember(farmId, uid, 'viewer');

      const snap = await firestore().collection(`farms/${farmId}/schedules`).get();
      const schedules = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Sort by time ascending (e.g. 06:00 < 08:30 < 19:00)
      schedules.sort((a: any, b: any) => {
        const timeA = a.time || '';
        const timeB = b.time || '';
        return timeA.localeCompare(timeB);
      });

      return schedules;
    }
  );

  /**
   * POST /api/farms/:farmId/schedules
   * Creates a new automated schedule (owner or admin only). Max 20 schedules per farm.
   */
  fastify.post<{ Params: { farmId: string } }>(
    '/farms/:farmId/schedules',
    {
      schema: {
        tags: ['Schedules'],
        summary: 'Create a schedule',
        description: 'Creates a new device execution schedule (max 20 per farm)',
        security: [{ BearerAuth: [] }],
        params: {
          type: 'object',
          required: ['farmId'],
          properties: {
            farmId: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              scheduleId: { type: 'string' },
            },
          },
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const uid = request.user?.uid;
      if (!uid) throw new HttpError(401, 'Unauthorized');

      const { farmId } = request.params;
      await requireFarmMember(farmId, uid, 'admin');

      const parseResult = createScheduleSchema.safeParse(request.body);
      if (!parseResult.success) {
        const firstIssue = parseResult.error.issues[0];
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: firstIssue ? `${firstIssue.path.join('.')}: ${firstIssue.message}` : 'Invalid schedule creation payload',
          issues: parseResult.error.issues,
        });
      }

      const { deviceId, action, time, days, durationSeconds, enabled, name } = parseResult.data;

      // durationSeconds is only allowed for *_ON actions
      if (durationSeconds !== undefined && !action.endsWith('_ON')) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: `durationSeconds is only allowed for ON actions (${action} does not support durationSeconds)`,
        });
      }

      // Check max 20 schedules per farm
      const existingSnap = await firestore().collection(`farms/${farmId}/schedules`).get();
      if (existingSnap.size >= 20) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Maximum limit of 20 schedules reached for this farm',
        });
      }

      // Check target device exists in farm
      const deviceRef = firestore().doc(`farms/${farmId}/devices/${deviceId}`);
      const deviceSnap = await deviceRef.get();
      if (!deviceSnap.exists) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Device with ID "${deviceId}" not found in farm "${farmId}"`,
        });
      }

      // Verify device capability for the scheduled action
      const deviceData = deviceSnap.data();
      const capabilities: string[] = (deviceData?.capabilities || []).map((c: string) =>
        c.toLowerCase()
      );
      const requiredCapability = ACTION_CAPABILITY_MAP[action];

      if (!capabilities.includes(requiredCapability.toLowerCase())) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: `Device "${deviceId}" lacks required capability "${requiredCapability}" for action "${action}"`,
        });
      }

      const scheduleRef = firestore().collection(`farms/${farmId}/schedules`).doc();
      const scheduleId = scheduleRef.id;
      const now = new Date().toISOString();

      const scheduleData = {
        id: scheduleId,
        farmId,
        deviceId,
        action,
        time,
        days,
        durationSeconds: durationSeconds ?? null,
        enabled: enabled ?? true,
        name: name || null,
        createdBy: uid,
        createdAt: now,
        updatedAt: now,
        lastRunAt: null,
        lastRunStatus: null,
        lastRunCommandId: null,
      };

      await scheduleRef.set(scheduleData);

      return reply.status(201).send({ scheduleId });
    }
  );

  /**
   * PATCH /api/farms/:farmId/schedules/:scheduleId
   * Updates an existing schedule partially (owner or admin only).
   */
  fastify.patch<{
    Params: { farmId: string; scheduleId: string };
  }>(
    '/farms/:farmId/schedules/:scheduleId',
    {
      schema: {
        tags: ['Schedules'],
        summary: 'Update schedule',
        description: 'Updates partial configuration of a schedule',
        security: [{ BearerAuth: [] }],
        params: {
          type: 'object',
          required: ['farmId', 'scheduleId'],
          properties: {
            farmId: { type: 'string' },
            scheduleId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            additionalProperties: true,
          },
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const uid = request.user?.uid;
      if (!uid) throw new HttpError(401, 'Unauthorized');

      const { farmId, scheduleId } = request.params;
      await requireFarmMember(farmId, uid, 'admin');

      const parseResult = updateScheduleSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid schedule update payload',
          issues: parseResult.error.issues,
        });
      }

      const scheduleRef = firestore().doc(`farms/${farmId}/schedules/${scheduleId}`);
      const scheduleSnap = await scheduleRef.get();
      if (!scheduleSnap.exists) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Schedule with ID "${scheduleId}" not found`,
        });
      }

      const existing = scheduleSnap.data() as any;
      const body = parseResult.data;

      const targetAction: CommandAction = body.action || existing.action;
      const targetDuration =
        body.durationSeconds !== undefined ? body.durationSeconds : existing.durationSeconds;

      // Validate durationSeconds compatibility
      if (targetDuration !== null && targetDuration !== undefined && !targetAction.endsWith('_ON')) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: `durationSeconds is only allowed for ON actions (${targetAction} does not support durationSeconds)`,
        });
      }

      // If action is changing, re-validate device capability
      if (body.action && body.action !== existing.action) {
        const deviceRef = firestore().doc(`farms/${farmId}/devices/${existing.deviceId}`);
        const deviceSnap = await deviceRef.get();
        if (!deviceSnap.exists) {
          return reply.status(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: `Associated device "${existing.deviceId}" not found in farm`,
          });
        }

        const deviceData = deviceSnap.data();
        const capabilities: string[] = (deviceData?.capabilities || []).map((c: string) =>
          c.toLowerCase()
        );
        const requiredCapability = ACTION_CAPABILITY_MAP[body.action];

        if (!capabilities.includes(requiredCapability.toLowerCase())) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: `Device "${existing.deviceId}" lacks required capability "${requiredCapability}" for action "${body.action}"`,
          });
        }
      }

      const now = new Date().toISOString();
      const updates: Record<string, any> = {
        updatedAt: now,
      };

      if (body.name !== undefined) updates.name = body.name;
      if (body.time !== undefined) updates.time = body.time;
      if (body.days !== undefined) updates.days = body.days;
      if (body.durationSeconds !== undefined) updates.durationSeconds = body.durationSeconds;
      if (body.enabled !== undefined) updates.enabled = body.enabled;
      if (body.action !== undefined) updates.action = body.action;

      await scheduleRef.update(updates);

      return {
        id: scheduleId,
        ...existing,
        ...updates,
      };
    }
  );

  /**
   * DELETE /api/farms/:farmId/schedules/:scheduleId
   * Deletes a schedule (owner or admin only).
   */
  fastify.delete<{
    Params: { farmId: string; scheduleId: string };
  }>(
    '/farms/:farmId/schedules/:scheduleId',
    {
      schema: {
        tags: ['Schedules'],
        summary: 'Delete schedule',
        description: 'Permanently deletes a schedule',
        security: [{ BearerAuth: [] }],
        params: {
          type: 'object',
          required: ['farmId', 'scheduleId'],
          properties: {
            farmId: { type: 'string' },
            scheduleId: { type: 'string' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Schedule successfully deleted',
          },
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const uid = request.user?.uid;
      if (!uid) throw new HttpError(401, 'Unauthorized');

      const { farmId, scheduleId } = request.params;
      await requireFarmMember(farmId, uid, 'admin');

      const scheduleRef = firestore().doc(`farms/${farmId}/schedules/${scheduleId}`);
      const snap = await scheduleRef.get();
      if (!snap.exists) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Schedule with ID "${scheduleId}" not found`,
        });
      }

      await scheduleRef.delete();
      return reply.status(204).send();
    }
  );
};

export default schedulesRoutes;
