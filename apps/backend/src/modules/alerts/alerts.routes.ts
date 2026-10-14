import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { firestore } from '../../plugins/firebase.js';
import { HttpError, requireFarmMember } from '../farms/farms.helper.js';

export const alertsQuerySchema = z.object({
  acknowledged: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  limit: z.coerce
    .number()
    .int('limit must be an integer')
    .min(1, 'limit must be between 1 and 100')
    .max(100, 'limit must be between 1 and 100')
    .default(50),
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

export const alertsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/farms/:farmId/alerts?acknowledged=false|true&limit=50
   * Retrieves alerts for a farm (members only) newest first, enriched with deviceName,
   * along with total unacknowledged count.
   */
  fastify.get<{
    Params: { farmId: string };
    Querystring: { acknowledged?: string; limit?: number };
  }>(
    '/farms/:farmId/alerts',
    {
      schema: {
        tags: ['Alerts'],
        summary: 'List farm alerts',
        description: 'Returns alerts for a farm with optional acknowledged filter and total unacknowledged count',
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
            acknowledged: { type: 'string', enum: ['true', 'false'] },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              alerts: {
                type: 'array',
                items: { type: 'object', additionalProperties: true },
              },
              unacknowledgedCount: { type: 'number' },
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
      if (!uid) throw new HttpError(401, 'Unauthorized');

      const { farmId } = request.params;
      await requireFarmMember(farmId, uid, 'viewer');

      const parseResult = alertsQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid query parameters',
          issues: parseResult.error.issues,
        });
      }

      const { acknowledged, limit } = parseResult.data;

      // 1. Fetch devices mapping to look up deviceName
      const devicesSnap = await firestore().collection(`farms/${farmId}/devices`).get();
      const deviceNameMap = new Map<string, string>();
      for (const devDoc of devicesSnap.docs) {
        const d = devDoc.data();
        deviceNameMap.set(devDoc.id, d.name || `Node #${d.nodeId}`);
      }

      // 2. Fetch unacknowledged count
      const unackSnap = await firestore()
        .collection(`farms/${farmId}/alerts`)
        .where('acknowledged', '==', false)
        .get();
      const unacknowledgedCount = unackSnap.size;

      // 3. Query alerts
      let queryRef: FirebaseFirestore.Query = firestore().collection(`farms/${farmId}/alerts`);

      if (acknowledged !== undefined) {
        queryRef = queryRef.where('acknowledged', '==', acknowledged);
      }

      let alertDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
      try {
        const snap = await queryRef.orderBy('createdAt', 'desc').limit(limit).get();
        alertDocs = snap.docs;
      } catch (err: any) {
        // Fallback in case composite index is still building in Firestore
        const snap = await queryRef.limit(limit * 2).get();
        alertDocs = snap.docs;
        alertDocs.sort((a, b) => {
          const tA = new Date(a.data().createdAt || 0).getTime();
          const tB = new Date(b.data().createdAt || 0).getTime();
          return tB - tA;
        });
        alertDocs = alertDocs.slice(0, limit);
      }

      const alerts = alertDocs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          deviceId: data.deviceId,
          deviceName: deviceNameMap.get(data.deviceId) || 'Unknown Device',
          type: data.type,
          severity: data.severity,
          message: data.message,
          value: data.value ?? null,
          threshold: data.threshold ?? null,
          acknowledged: data.acknowledged ?? false,
          acknowledgedBy: data.acknowledgedBy || null,
          acknowledgedAt: data.acknowledgedAt || null,
          createdAt: data.createdAt,
        };
      });

      return {
        alerts,
        unacknowledgedCount,
      };
    }
  );

  /**
   * POST /api/farms/:farmId/alerts/:alertId/acknowledge
   * Marks a single alert as acknowledged (owner or admin only). Idempotent.
   */
  fastify.post<{
    Params: { farmId: string; alertId: string };
  }>(
    '/farms/:farmId/alerts/:alertId/acknowledge',
    {
      schema: {
        tags: ['Alerts'],
        summary: 'Acknowledge an alert',
        description: 'Marks an alert as acknowledged (requires admin or owner role)',
        security: [{ BearerAuth: [] }],
        params: {
          type: 'object',
          required: ['farmId', 'alertId'],
          properties: {
            farmId: { type: 'string' },
            alertId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            additionalProperties: true,
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

      const { farmId, alertId } = request.params;
      await requireFarmMember(farmId, uid, 'admin');

      const alertRef = firestore().doc(`farms/${farmId}/alerts/${alertId}`);
      const alertSnap = await alertRef.get();
      if (!alertSnap.exists) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Alert with ID "${alertId}" not found in farm "${farmId}"`,
        });
      }

      const existingData = alertSnap.data() as any;

      // Idempotency: if already acknowledged, return existing state
      if (existingData.acknowledged) {
        return {
          id: alertId,
          ...existingData,
        };
      }

      const now = new Date().toISOString();
      const updates = {
        acknowledged: true,
        acknowledgedBy: uid,
        acknowledgedAt: now,
      };

      await alertRef.update(updates);

      return {
        id: alertId,
        ...existingData,
        ...updates,
      };
    }
  );

  /**
   * POST /api/farms/:farmId/alerts/acknowledge-all
   * Marks all unacknowledged alerts as acknowledged in batches (owner or admin only).
   */
  fastify.post<{
    Params: { farmId: string };
  }>(
    '/farms/:farmId/alerts/acknowledge-all',
    {
      schema: {
        tags: ['Alerts'],
        summary: 'Acknowledge all alerts',
        description: 'Marks all unacknowledged alerts as acknowledged in batch (up to 400)',
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
            type: 'object',
            properties: {
              count: { type: 'number' },
            },
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
      await requireFarmMember(farmId, uid, 'admin');

      const unackSnap = await firestore()
        .collection(`farms/${farmId}/alerts`)
        .where('acknowledged', '==', false)
        .limit(400)
        .get();

      if (unackSnap.empty) {
        return { count: 0 };
      }

      const batch = firestore().batch();
      const now = new Date().toISOString();

      for (const doc of unackSnap.docs) {
        batch.update(doc.ref, {
          acknowledged: true,
          acknowledgedBy: uid,
          acknowledgedAt: now,
        });
      }

      await batch.commit();

      return { count: unackSnap.size };
    }
  );
};

export default alertsRoutes;
