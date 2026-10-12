import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { firestore } from '../../plugins/firebase.js';
import { HttpError, requireFarmMember } from '../farms/farms.helper.js';

export const registerDeviceSchema = z.object({
  nodeId: z.coerce
    .number({ required_error: 'nodeId is required' })
    .int('nodeId must be an integer')
    .min(1, 'nodeId must be between 1 and 4')
    .max(4, 'nodeId must be between 1 and 4'),
  name: z
    .string({ required_error: 'name is required' })
    .min(1, 'name cannot be empty')
    .max(100, 'name must be at most 100 characters')
    .trim(),
  type: z.enum(['sensor', 'sensor_actuator', 'gateway'], {
    required_error: 'type must be one of: sensor, sensor_actuator, gateway',
  }),
  location: z
    .object({
      zone: z.string().optional(),
      lat: z.number().min(-90).max(90).optional(),
      lng: z.number().min(-180).max(180).optional(),
    })
    .default({}),
  capabilities: z.array(z.string()).default([]),
});

export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;

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

export const devicesRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/farms/:farmId/devices
   * List all registered devices for a specific farm (members only).
   */
  fastify.get<{ Params: { farmId: string } }>(
    '/farms/:farmId/devices',
    {
      schema: {
        tags: ['Devices'],
        summary: 'List farm devices',
        description: 'Returns all devices registered to a farm (requires membership)',
        security: [{ BearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            farmId: { type: 'string' },
          },
          required: ['farmId'],
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: true,
            },
          },
          403: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const uid = request.user?.uid;
      if (!uid) {
        throw new HttpError(401, 'Unauthorized');
      }

      const { farmId } = request.params;
      await requireFarmMember(farmId, uid, 'viewer');

      const devicesSnapshot = await firestore()
        .collection(`farms/${farmId}/devices`)
        .get();

      return devicesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    }
  );

  /**
   * POST /api/farms/:farmId/devices
   * Register a new IoT device in a farm (owner or admin only).
   * Rejects duplicate nodeId within the farm with 409 Conflict.
   */
  fastify.post<{ Params: { farmId: string } }>(
    '/farms/:farmId/devices',
    {
      schema: {
        tags: ['Devices'],
        summary: 'Register a device',
        description: 'Registers a new IoT hardware node (requires owner or admin role)',
        security: [{ BearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            farmId: { type: 'string' },
          },
          required: ['farmId'],
        },
        response: {
          201: {
            type: 'object',
            additionalProperties: true,
          },
          400: errorResponseSchema,
          403: errorResponseSchema,
          409: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const uid = request.user?.uid;
      if (!uid) {
        throw new HttpError(401, 'Unauthorized');
      }

      const { farmId } = request.params;
      // Enforce admin or owner role
      await requireFarmMember(farmId, uid, 'admin');

      const parseResult = registerDeviceSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid device registration data',
          issues: parseResult.error.issues,
        });
      }

      const body = parseResult.data;

      // Check for duplicate nodeId in the same farm
      const duplicateQuery = await firestore()
        .collection(`farms/${farmId}/devices`)
        .where('nodeId', '==', body.nodeId)
        .limit(1)
        .get();

      if (!duplicateQuery.empty) {
        return reply.status(409).send({
          statusCode: 409,
          error: 'Conflict',
          message: `Device with nodeId ${body.nodeId} already exists in farm ${farmId}`,
        });
      }

      const deviceRef = firestore().collection(`farms/${farmId}/devices`).doc();
      const deviceId = deviceRef.id;
      const now = new Date().toISOString();

      const deviceData = {
        nodeId: body.nodeId,
        name: body.name,
        type: body.type,
        location: body.location,
        status: 'offline',
        capabilities: body.capabilities,
        createdAt: now,
      };

      await deviceRef.set(deviceData);

      return reply.status(201).send({
        deviceId,
        ...deviceData,
      });
    }
  );

  /**
   * GET /api/devices/:deviceId?farmId=X
   * Get single device detail including latest recorded telemetry (members only).
   */
  fastify.get<{
    Params: { deviceId: string };
    Querystring: { farmId?: string };
  }>(
    '/devices/:deviceId',
    {
      schema: {
        tags: ['Devices'],
        summary: 'Get device details and latest telemetry',
        description: 'Returns hardware configuration and latest telemetry readings for members',
        security: [{ BearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            deviceId: { type: 'string' },
          },
          required: ['deviceId'],
        },
        querystring: {
          type: 'object',
          properties: {
            farmId: { type: 'string' },
          },
          required: ['farmId'],
        },
        response: {
          200: {
            type: 'object',
            additionalProperties: true,
          },
          400: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const uid = request.user?.uid;
      if (!uid) {
        throw new HttpError(401, 'Unauthorized');
      }

      const { deviceId } = request.params;
      const { farmId } = request.query;

      if (!farmId) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Query parameter "farmId" is required',
        });
      }

      // Verify membership on the farm
      await requireFarmMember(farmId, uid, 'viewer');

      const deviceDoc = await firestore()
        .doc(`farms/${farmId}/devices/${deviceId}`)
        .get();

      if (!deviceDoc.exists) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Device ${deviceId} not found in farm ${farmId}`,
        });
      }

      // Fetch latest telemetry reading
      const latestDoc = await firestore()
        .doc(`farms/${farmId}/devices/${deviceId}/latest/current`)
        .get();

      return {
        id: deviceId,
        ...deviceDoc.data(),
        latest: latestDoc.exists ? latestDoc.data() : null,
      };
    }
  );
};

export default devicesRoutes;
