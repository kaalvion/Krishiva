import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { firestore } from '../../plugins/firebase.js';
import { HttpError, requireFarmMember } from '../farms/farms.helper.js';

export const latestQuerySchema = z.object({
  farmId: z.string({ required_error: 'Query parameter "farmId" is required' }).min(1),
});

export const historyQuerySchema = z.object({
  farmId: z.string({ required_error: 'Query parameter "farmId" is required' }).min(1),
  hours: z.coerce
    .number()
    .int('hours must be an integer')
    .min(1, 'hours must be between 1 and 168')
    .max(168, 'hours must be at most 168')
    .default(24),
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

/**
 * Computes UTC daily bucket names between two timestamps (inclusive).
 * Format: readings_YYYY_MM_DD
 */
export function getDailyBucketNames(startTime: Date, endTime: Date): string[] {
  const buckets: string[] = [];
  const current = new Date(
    Date.UTC(startTime.getUTCFullYear(), startTime.getUTCMonth(), startTime.getUTCDate())
  );
  const end = new Date(
    Date.UTC(endTime.getUTCFullYear(), endTime.getUTCMonth(), endTime.getUTCDate())
  );

  while (current <= end) {
    const yyyy = current.getUTCFullYear();
    const mm = String(current.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(current.getUTCDate()).padStart(2, '0');
    buckets.push(`readings_${yyyy}_${mm}_${dd}`);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return buckets;
}

export const telemetryRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/devices/:deviceId/latest?farmId=X
   * Retrieves the current/latest reading snapshot for a device.
   */
  fastify.get<{
    Params: { deviceId: string };
    Querystring: { farmId?: string };
  }>(
    '/devices/:deviceId/latest',
    {
      schema: {
        tags: ['Telemetry'],
        summary: 'Get latest device reading',
        description: 'Returns the most recently recorded telemetry values for a device',
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
      if (!uid) throw new HttpError(401, 'Unauthorized');

      const parseResult = latestQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid query parameters',
          issues: parseResult.error.issues,
        });
      }

      const { deviceId } = request.params;
      const { farmId } = parseResult.data;

      // Check member access
      await requireFarmMember(farmId, uid, 'viewer');

      // Verify device exists
      const deviceDoc = await firestore().doc(`farms/${farmId}/devices/${deviceId}`).get();
      if (!deviceDoc.exists) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Device ${deviceId} not found in farm ${farmId}`,
        });
      }

      const latestDoc = await firestore()
        .doc(`farms/${farmId}/devices/${deviceId}/latest/current`)
        .get();

      if (!latestDoc.exists) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `No telemetry reading recorded yet for device ${deviceId}`,
        });
      }

      return {
        deviceId,
        ...latestDoc.data(),
      };
    }
  );

  /**
   * GET /api/devices/:deviceId/history?farmId=X&hours=24
   * Queries historical telemetry points across daily bucket collections for the past N hours.
   */
  fastify.get<{
    Params: { deviceId: string };
    Querystring: { farmId?: string; hours?: string | number };
  }>(
    '/devices/:deviceId/history',
    {
      schema: {
        tags: ['Telemetry'],
        summary: 'Query device telemetry history',
        description: 'Returns historical readings from daily buckets for the last N hours',
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
            hours: { type: 'number' },
          },
          required: ['farmId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              deviceId: { type: 'string' },
              hours: { type: 'number' },
              count: { type: 'number' },
              readings: {
                type: 'array',
                items: { type: 'object', additionalProperties: true },
              },
            },
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
      if (!uid) throw new HttpError(401, 'Unauthorized');

      const parseResult = historyQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid query parameters',
          issues: parseResult.error.issues,
        });
      }

      const { deviceId } = request.params;
      const { farmId, hours } = parseResult.data;

      // Access control
      await requireFarmMember(farmId, uid, 'viewer');

      // Verify device exists
      const deviceDoc = await firestore().doc(`farms/${farmId}/devices/${deviceId}`).get();
      if (!deviceDoc.exists) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Device ${deviceId} not found in farm ${farmId}`,
        });
      }

      const now = new Date();
      const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
      const startIso = startTime.toISOString();
      const bucketNames = getDailyBucketNames(startTime, now);

      const allReadings: any[] = [];

      // Query only the relevant daily buckets
      await Promise.all(
        bucketNames.map(async (bucket) => {
          try {
            const snap = await firestore()
              .collection(`farms/${farmId}/devices/${deviceId}/${bucket}`)
              .where('recordedAt', '>=', startIso)
              .get();

            for (const doc of snap.docs) {
              allReadings.push(doc.data());
            }
          } catch {
            // Bucket collection may not exist yet if no data was received on that day
          }
        })
      );

      // Filter and sort ascending by recordedAt
      const filtered = allReadings.filter(
        (r) => r.recordedAt && r.recordedAt >= startIso && r.recordedAt <= now.toISOString()
      );
      filtered.sort(
        (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
      );

      // Cap at 1000 data points (downsample evenly if count > 1000)
      let finalReadings = filtered;
      if (finalReadings.length > 1000) {
        const step = finalReadings.length / 1000;
        const downsampled: any[] = [];
        for (let i = 0; i < 1000; i++) {
          const idx = Math.min(Math.floor(i * step), finalReadings.length - 1);
          downsampled.push(finalReadings[idx]);
        }
        finalReadings = downsampled;
      }

      return {
        deviceId,
        hours,
        count: finalReadings.length,
        readings: finalReadings,
      };
    }
  );

  /**
   * GET /api/farms/:farmId/heatmap
   * Retrieves current metric readings for all devices in a farm to render spatial heatmaps.
   */
  fastify.get<{ Params: { farmId: string } }>(
    '/farms/:farmId/heatmap',
    {
      schema: {
        tags: ['Telemetry'],
        summary: 'Farm spatial telemetry heatmap',
        description: 'Returns latest sensor readings mapped across all farm devices',
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
            type: 'object',
            properties: {
              cells: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    deviceId: { type: 'string' },
                    name: { type: 'string', nullable: true },
                    nodeId: { type: 'number' },
                    zone: { type: 'string', nullable: true },
                    lat: { type: 'number', nullable: true },
                    lng: { type: 'number', nullable: true },
                    soilMoisture: { type: 'number', nullable: true },
                    temperature: { type: 'number', nullable: true },
                    humidity: { type: 'number', nullable: true },
                    status: { type: 'string' },
                    recordedAt: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
          403: errorResponseSchema,
          404: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const uid = request.user?.uid;
      if (!uid) throw new HttpError(401, 'Unauthorized');

      const { farmId } = request.params;
      await requireFarmMember(farmId, uid, 'viewer');

      const farmDoc = await firestore().doc(`farms/${farmId}`).get();
      if (!farmDoc.exists) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Farm ${farmId} not found`,
        });
      }

      const devicesSnap = await firestore().collection(`farms/${farmId}/devices`).get();

      const cells = await Promise.all(
        devicesSnap.docs.map(async (devDoc) => {
          const devData = devDoc.data();
          const deviceId = devDoc.id;

          const latestSnap = await firestore()
            .doc(`farms/${farmId}/devices/${deviceId}/latest/current`)
            .get();
          const latestData = latestSnap.exists ? latestSnap.data() : null;

          return {
            deviceId,
            name: devData.name || null,
            nodeId: devData.nodeId,
            zone: devData.location?.zone || null,
            lat: devData.location?.lat ?? null,
            lng: devData.location?.lng ?? null,
            soilMoisture: latestData?.soilMoisture ?? null,
            temperature: latestData?.temperature ?? null,
            humidity: latestData?.humidity ?? null,
            status: latestData?.status || devData.status || 'offline',
            recordedAt: latestData?.recordedAt || null,
          };
        })
      );

      return { cells };
    }
  );
};

export default telemetryRoutes;
