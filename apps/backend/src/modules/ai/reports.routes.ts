import type { FastifyPluginAsync } from 'fastify';
import { firestore } from '../../plugins/firebase.js';
import { HttpError, requireFarmMember } from '../farms/farms.helper.js';
import { computeWaterReportForFarm } from './water-optimizer.service.js';
import { predictYieldForFarm } from './yield-predictor.service.js';

export const reportsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/farms/:farmId/ai/water-report
   * Retrieves water usage optimization report for a farm.
   */
  fastify.get<{
    Params: { farmId: string };
    Querystring: { force?: string };
  }>(
    '/farms/:farmId/ai/water-report',
    {
      schema: {
        tags: ['AI Intelligence'],
        summary: 'Get water usage optimization report',
        description:
          'Returns actual vs optimal litres, efficiency %, and irrigation recommendations',
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
            force: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              actualLitres: { type: 'number' },
              optimalLitres: { type: 'number' },
              efficiencyPct: { type: 'number' },
              suggestion: { type: 'string' },
              totalPumpSeconds: { type: 'number' },
              pumpSessionsCount: { type: 'number' },
              et0SumMm: { type: 'number' },
              cropCoefficient: { type: 'number' },
              cropType: { type: 'string' },
              areaAcres: { type: 'number' },
              computedAt: { type: 'string' },
            },
            additionalProperties: true,
          },
        },
      },
    },
    async (request, reply) => {
      const { farmId } = request.params;
      const { force } = request.query;
      const uid = request.user?.uid;

      if (!uid) {
        throw new HttpError(401, 'Unauthorized');
      }

      await requireFarmMember(farmId, uid, 'viewer');

      const docRef = firestore().doc(`farms/${farmId}/ai/water_report`);
      if (force !== 'true') {
        const snap = await docRef.get();
        if (snap.exists) {
          return reply.code(200).send(snap.data());
        }
      }

      const report = await computeWaterReportForFarm(farmId);
      if (!report) {
        throw new HttpError(404, 'Failed to generate water report: farm not found');
      }

      return reply.code(200).send(report);
    }
  );

  /**
   * GET /api/farms/:farmId/ai/yield-report
   * Retrieves crop yield prediction report based on GDD and stress events.
   */
  fastify.get<{
    Params: { farmId: string };
    Querystring: { force?: string };
  }>(
    '/farms/:farmId/ai/yield-report',
    {
      schema: {
        tags: ['AI Intelligence'],
        summary: 'Get crop yield prediction report',
        description:
          'Returns predicted yield, base yield, stress events and GDD calculations',
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
            force: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              crop: { type: 'string' },
              baseYield: { type: 'number' },
              predictedYield: { type: 'number' },
              yieldLossPct: { type: 'number' },
              stressEvents: {
                type: 'object',
                properties: {
                  droughtDays: { type: 'number' },
                  heatStressDays: { type: 'number' },
                  floodDays: { type: 'number' },
                  accumulatedGDD: { type: 'number' },
                },
                additionalProperties: true,
              },
              confidencePct: { type: 'number' },
              message: { type: 'string' },
              computedAt: { type: 'string' },
            },
            additionalProperties: true,
          },
        },
      },
    },
    async (request, reply) => {
      const { farmId } = request.params;
      const { force } = request.query;
      const uid = request.user?.uid;

      if (!uid) {
        throw new HttpError(401, 'Unauthorized');
      }

      await requireFarmMember(farmId, uid, 'viewer');

      const docRef = firestore().doc(`farms/${farmId}/ai/yield_report`);
      if (force !== 'true') {
        const snap = await docRef.get();
        if (snap.exists) {
          return reply.code(200).send(snap.data());
        }
      }

      const report = await predictYieldForFarm(farmId);
      if (!report) {
        throw new HttpError(404, 'Failed to generate yield report: farm not found');
      }

      return reply.code(200).send(report);
    }
  );
};
