import type { FastifyPluginAsync } from 'fastify';
import { firestore } from '../../plugins/firebase.js';
import { HttpError, requireFarmMember } from '../farms/farms.helper.js';
import { computeIrrigationPrediction } from './irrigation.service.js';

export const irrigationRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/farms/:farmId/devices/:deviceId/ai/irrigation
   * Retrieves the predictive irrigation document for a device on a farm.
   * If not yet cached, computes it on demand.
   */
  fastify.get<{
    Params: { farmId: string; deviceId: string };
  }>(
    '/farms/:farmId/devices/:deviceId/ai/irrigation',
    {
      schema: {
        tags: ['AI Intelligence'],
        summary: 'Get predictive irrigation forecast for device',
        description:
          'Returns linear soil depletion forecast (1h, 3h, 6h) and weather-aware action recommendation',
        security: [{ BearerAuth: [] }],
        params: {
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
            properties: {
              currentSoil: { type: 'number' },
              predicted1h: { type: 'number' },
              predicted3h: { type: 'number' },
              predicted6h: { type: 'number' },
              action: {
                type: 'string',
                enum: ['IRRIGATE_NOW', 'IRRIGATE_SOON', 'WAIT_FOR_RAIN', 'NO_ACTION'],
              },
              urgency: {
                type: 'string',
                enum: ['high', 'medium', 'low', 'none'],
              },
              message: { type: 'string' },
              computedAt: { type: 'string' },
            },
            additionalProperties: true,
          },
        },
      },
    },
    async (request, reply) => {
      const { farmId, deviceId } = request.params;
      const uid = request.user?.uid;

      if (!uid) {
        throw new HttpError(401, 'Unauthorized');
      }

      await requireFarmMember(farmId, uid, 'viewer');

      // Check for cached prediction document
      const docSnap = await firestore().doc(`farms/${farmId}/ai/irrigation`).get();
      if (docSnap.exists) {
        return docSnap.data();
      }

      // Compute on demand
      const computed = await computeIrrigationPrediction(farmId, deviceId);
      if (!computed) {
        throw new HttpError(404, 'Unable to compute irrigation prediction for device');
      }

      return computed;
    }
  );

  /**
   * GET /api/farms/:farmId/ai/irrigation
   * Farm-level predictive irrigation endpoint.
   */
  fastify.get<{
    Params: { farmId: string };
  }>(
    '/farms/:farmId/ai/irrigation',
    {
      schema: {
        tags: ['AI Intelligence'],
        summary: 'Get predictive irrigation forecast for farm',
        description: 'Returns latest farm-level predictive irrigation recommendation',
        security: [{ BearerAuth: [] }],
        params: {
          type: 'object',
          required: ['farmId'],
          properties: {
            farmId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { farmId } = request.params;
      const uid = request.user?.uid;

      if (!uid) {
        throw new HttpError(401, 'Unauthorized');
      }

      await requireFarmMember(farmId, uid, 'viewer');

      const docSnap = await firestore().doc(`farms/${farmId}/ai/irrigation`).get();
      if (docSnap.exists) {
        return docSnap.data();
      }

      const computed = await computeIrrigationPrediction(farmId);
      if (!computed) {
        throw new HttpError(404, 'No irrigation forecast available for farm');
      }

      return computed;
    }
  );
};

export default irrigationRoutes;

