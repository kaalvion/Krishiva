import type { FastifyPluginAsync } from 'fastify';
import { firestore } from '../../plugins/firebase.js';
import { HttpError, requireFarmMember } from '../farms/farms.helper.js';
import { generateFarmBrief, getLatestBrief } from './brief.service.js';
import { computeFarmHealth } from './health-score.service.js';
import { isGrokEnabled } from './grok.client.js';

export const aiRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/farms/:farmId/ai/brief/regenerate
   * Role: Owner or Admin
   * Forces regeneration of the farm brief using Grok.
   */
  fastify.post<{
    Params: { farmId: string };
  }>(
    '/farms/:farmId/ai/brief/regenerate',
    {
      schema: {
        tags: ['AI Intelligence'],
        summary: 'Force regenerate farm brief',
        description: 'Bypasses the 4-hour cache guard and calls Grok to create an updated brief',
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
              headline: { type: 'string' },
              body: { type: 'string' },
              actionNow: { type: 'string' },
              urgency: { type: 'string' },
              generatedAt: { type: 'string' },
              model: { type: 'string' },
              cachedUntil: { type: 'string' },
            },
            additionalProperties: true,
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

      await requireFarmMember(farmId, uid, 'admin');

      if (!isGrokEnabled()) {
        throw new HttpError(503, 'AI features are disabled on this server');
      }

      const brief = await generateFarmBrief(farmId, true);
      if (!brief) {
        throw new HttpError(500, 'Failed to generate farm brief');
      }

      return reply.status(200).send(brief);
    }
  );

  /**
   * GET /api/farms/:farmId/ai/brief
   * Role: Member (viewer, admin, owner)
   * Returns current cached brief.
   */
  fastify.get<{
    Params: { farmId: string };
  }>(
    '/farms/:farmId/ai/brief',
    {
      schema: {
        tags: ['AI Intelligence'],
        summary: 'Get latest farm brief',
        description: 'Returns the most recently generated morning/evening brief for the farm',
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
              headline: { type: 'string' },
              body: { type: 'string' },
              actionNow: { type: 'string' },
              urgency: { type: 'string' },
              generatedAt: { type: 'string' },
              model: { type: 'string' },
              cachedUntil: { type: 'string' },
            },
            additionalProperties: true,
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

      const brief = await getLatestBrief(farmId);
      if (!brief) {
        throw new HttpError(404, 'No brief available for this farm yet');
      }

      return reply.status(200).send(brief);
    }
  );

  /**
   * GET /api/farms/:farmId/ai/health
   * Role: Member
   * Returns current health score, color, and diagnostic reasons.
   */
  fastify.get<{
    Params: { farmId: string };
  }>(
    '/farms/:farmId/ai/health',
    {
      schema: {
        tags: ['AI Intelligence'],
        summary: 'Get farm health score',
        description: 'Returns rule-based health score (0-100), color indicator, and reasons',
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
              score: { type: 'number' },
              color: { type: 'string' },
              reasons: { type: 'array', items: { type: 'string' } },
              source: { type: 'string' },
              evaluatedAt: { type: 'string' },
              metrics: { type: 'object', additionalProperties: true },
            },
            additionalProperties: true,
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

      const healthSnap = await firestore().doc(`farms/${farmId}/ai/health`).get();
      if (healthSnap.exists) {
        return reply.status(200).send(healthSnap.data());
      }

      // Compute on demand if not yet computed
      const freshHealth = await computeFarmHealth(farmId);
      return reply.status(200).send(freshHealth);
    }
  );
};

export default aiRoutes;
