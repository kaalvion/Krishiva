import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { firestore } from '../../plugins/firebase.js';
import { HttpError, requireFarmMember } from '../farms/farms.helper.js';
import {
  ACTION_CAPABILITY_MAP,
  COMMAND_ACTIONS,
  issueCommand,
  type CommandAction,
} from './commands.service.js';

export const postCommandSchema = z.object({
  farmId: z
    .string({ required_error: 'farmId is required' })
    .min(1, 'farmId cannot be empty'),
  deviceId: z
    .string({ required_error: 'deviceId is required' })
    .min(1, 'deviceId cannot be empty'),
  action: z.enum(COMMAND_ACTIONS, {
    required_error: `action is required. Must be one of: ${COMMAND_ACTIONS.join(', ')}`,
  }),
  durationSeconds: z.coerce
    .number()
    .int('durationSeconds must be an integer')
    .min(1, 'durationSeconds must be between 1 and 3600')
    .max(3600, 'durationSeconds must be between 1 and 3600')
    .optional(),
});

export type PostCommandInput = z.infer<typeof postCommandSchema>;

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

export const commandsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/commands
   * Issues an actuator command to an IoT device.
   * Requires owner or admin farm role.
   */
  fastify.post(
    '/commands',
    {
      schema: {
        tags: ['Commands'],
        summary: 'Issue actuator command',
        description:
          'Queues and publishes an actuator command via MQTT with capability validation and 30s timeout',
        security: [{ BearerAuth: [] }],
        body: {
          type: 'object',
          required: ['farmId', 'deviceId', 'action'],
          properties: {
            farmId: { type: 'string' },
            deviceId: { type: 'string' },
            action: { type: 'string', enum: [...COMMAND_ACTIONS] },
            durationSeconds: { type: 'number', minimum: 1, maximum: 3600 },
          },
        },
        response: {
          202: {
            type: 'object',
            properties: {
              commandId: { type: 'string' },
              status: { type: 'string', example: 'pending' },
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
      if (!uid) {
        throw new HttpError(401, 'Unauthorized');
      }

      const parseResult = postCommandSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid request body',
          issues: parseResult.error.issues,
        });
      }

      const { farmId, deviceId, action, durationSeconds } = parseResult.data;

      // Validate durationSeconds constraint: only allowed for *_ON actions
      if (durationSeconds !== undefined && !action.endsWith('_ON')) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: `durationSeconds is only allowed for ON actions (${action} does not support durationSeconds)`,
        });
      }

      // Check user permissions: require admin or owner (viewers get 403)
      await requireFarmMember(farmId, uid, 'admin');

      // Verify that device exists in farm
      const deviceRef = firestore().doc(`farms/${farmId}/devices/${deviceId}`);
      const deviceSnap = await deviceRef.get();
      if (!deviceSnap.exists) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Device with ID "${deviceId}" not found in farm "${farmId}"`,
        });
      }

      // Verify device capability
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

      // Issue command through service
      const result = await issueCommand({
        farmId,
        deviceId,
        action,
        requestedBy: uid,
        source: 'admin',
        durationSeconds: durationSeconds ?? null,
      });

      return reply.status(202).send(result);
    }
  );

  /**
   * GET /api/commands/:commandId?farmId=X&deviceId=Y
   * Retrieves the current status and metadata of a specific command.
   */
  fastify.get<{
    Params: { commandId: string };
    Querystring: { farmId?: string; deviceId?: string };
  }>(
    '/commands/:commandId',
    {
      schema: {
        tags: ['Commands'],
        summary: 'Get command status',
        description: 'Retrieves status and audit history of a specific command',
        security: [{ BearerAuth: [] }],
        params: {
          type: 'object',
          required: ['commandId'],
          properties: {
            commandId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          required: ['farmId', 'deviceId'],
          properties: {
            farmId: { type: 'string' },
            deviceId: { type: 'string' },
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
      if (!uid) {
        throw new HttpError(401, 'Unauthorized');
      }

      const { commandId } = request.params;
      const { farmId, deviceId } = request.query;

      if (!farmId || !deviceId) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Both farmId and deviceId query parameters are required',
        });
      }

      // Validate membership (viewer, admin, or owner)
      await requireFarmMember(farmId, uid, 'viewer');

      const commandRef = firestore().doc(`farms/${farmId}/devices/${deviceId}/commands/${commandId}`);
      const commandSnap = await commandRef.get();

      if (!commandSnap.exists) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Command with ID "${commandId}" not found`,
        });
      }

      return {
        id: commandSnap.id,
        ...commandSnap.data(),
      };
    }
  );

  /**
   * GET /api/farms/:farmId/commands?limit=50
   * Retrieves command history across all devices for the farm (newest first).
   */
  fastify.get<{
    Params: { farmId: string };
    Querystring: { limit?: string | number };
  }>(
    '/farms/:farmId/commands',
    {
      schema: {
        tags: ['Commands'],
        summary: 'List farm command history',
        description: 'Retrieves chronological command history across devices for the farm',
        security: [{ BearerAuth: [] }],
        params: {
          type: 'object',
          required: ['farmId'],
          properties: {
            farmId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: true,
            },
          },
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const uid = request.user?.uid;
      if (!uid) {
        throw new HttpError(401, 'Unauthorized');
      }

      const { farmId } = request.params;
      const rawLimit = request.query.limit !== undefined ? Number(request.query.limit) : 50;
      const limit = Number.isInteger(rawLimit) && rawLimit >= 1 && rawLimit <= 100 ? rawLimit : 50;

      // Validate membership
      await requireFarmMember(farmId, uid, 'viewer');

      try {
        const snap = await firestore()
          .collectionGroup('commands')
          .where('farmId', '==', farmId)
          .orderBy('createdAt', 'desc')
          .limit(limit)
          .get();

        return snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (err: any) {
        // Fallback in case collectionGroup composite index is building in Firestore
        if (err?.code === 9 || err?.message?.includes('index') || err?.message?.includes('COLLECTION_GROUP')) {
          const devicesSnap = await firestore().collection(`farms/${farmId}/devices`).get();
          const allCommands: any[] = [];

          for (const devDoc of devicesSnap.docs) {
            const cmdSnap = await devDoc.ref
              .collection('commands')
              .orderBy('createdAt', 'desc')
              .limit(limit)
              .get();
            for (const cmdDoc of cmdSnap.docs) {
              allCommands.push({
                id: cmdDoc.id,
                ...cmdDoc.data(),
              });
            }
          }

          allCommands.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          return allCommands.slice(0, limit);
        }
        throw err;
      }
    }
  );

  /**
   * POST /api/farms/:farmId/devices/:deviceId/message
   * Sends an instant message or direct command to the hardware gateway / actuator.
   */
  fastify.post<{
    Params: { farmId: string; deviceId: string };
    Body: { message: string };
  }>(
    '/farms/:farmId/devices/:deviceId/message',
    {
      schema: {
        tags: ['Commands'],
        summary: 'Send instant message to hardware',
        description: 'Sends an instant message/command directly to the master hardware gateway',
        security: [{ BearerAuth: [] }],
        params: {
          type: 'object',
          required: ['farmId', 'deviceId'],
          properties: {
            farmId: { type: 'string' },
            deviceId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['message'],
          properties: {
            message: { type: 'string', minLength: 1, maxLength: 500 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              sentAt: { type: 'string' },
            },
            additionalProperties: true,
          },
        },
      },
    },
    async (request, reply) => {
      const uid = request.user?.uid;
      if (!uid) {
        throw new HttpError(401, 'Unauthorized');
      }

      const { farmId, deviceId } = request.params;
      const { message } = request.body;

      await requireFarmMember(farmId, uid, 'admin');

      const now = new Date().toISOString();

      // 1. Update legacy MASTER/COMMANDS if exists
      let masterCommandsRef = firestore().doc(`farms/${farmId}/DEVICES/${deviceId}/MASTER/COMMANDS`);
      let masterSnap = await masterCommandsRef.get();

      if (!masterSnap.exists) {
        const devicesSnap = await firestore().collection(`farms/${farmId}/DEVICES`).get();
        for (const d of devicesSnap.docs) {
          const candidateRef = d.ref.collection('MASTER').doc('COMMANDS');
          const candidateSnap = await candidateRef.get();
          if (candidateSnap.exists) {
            masterCommandsRef = candidateRef;
            masterSnap = candidateSnap;
            break;
          }
        }
      }

      if (masterSnap.exists) {
        await masterCommandsRef.update({
          MESSAGE: message,
          MESSAGE_AT: now,
          MESSAGE_SOURCE: 'APP',
        });
      }

      // 2. Also log as a command in v2 schema
      const cmdId = `msg-${Date.now()}`;
      await firestore().doc(`farms/${farmId}/devices/${deviceId}/commands/${cmdId}`).set({
        id: cmdId,
        commandId: cmdId,
        farmId,
        deviceId,
        action: `MESSAGE: ${message}`,
        status: 'acknowledged',
        requestedBy: uid,
        source: 'mobile',
        createdAt: now,
        acknowledgedAt: now,
      });

      return reply.code(200).send({
        success: true,
        message,
        sentAt: now,
      });
    }
  );
};

export default commandsRoutes;
