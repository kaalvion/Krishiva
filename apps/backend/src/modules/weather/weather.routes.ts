import type { FastifyPluginAsync } from 'fastify';
import { firestore } from '../../plugins/firebase.js';
import { HttpError, requireFarmMember } from '../farms/farms.helper.js';
import { fetchWeatherForFarm, getLatestWeather } from './weather.service.js';

export const weatherRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/farms/:farmId/weather
   * Returns cached weather forecast from farms/{farmId}/weather/latest.
   * Supports optional query ?force=true for owners/admins to trigger an on-demand refresh.
   */
  fastify.get<{
    Params: { farmId: string };
    Querystring: { force?: string };
  }>(
    '/farms/:farmId/weather',
    {
      schema: {
        tags: ['Weather'],
        summary: 'Get farm weather forecast',
        description: 'Returns latest 3-day agrometeorological forecast for the farm location',
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
            force: { type: 'string', enum: ['true', 'false'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              fetchedAt: { type: 'string' },
              timezone: { type: 'string' },
              source: { type: 'string' },
              rainNext6hMm: { type: 'number' },
              rainNext24hMm: { type: 'number' },
              hourly: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    time: { type: 'string' },
                    tempC: { type: 'number' },
                    humidity: { type: 'number' },
                    precipMm: { type: 'number' },
                    precipProb: { type: 'number' },
                    et0Mm: { type: 'number' },
                  },
                },
              },
              dailySummary: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    date: { type: 'string' },
                    tempMin: { type: 'number' },
                    tempMax: { type: 'number' },
                    precipSumMm: { type: 'number' },
                    maxPrecipProb: { type: 'number' },
                  },
                },
              },
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

      const shouldForce = request.query.force === 'true';

      if (shouldForce) {
        await requireFarmMember(farmId, uid, 'admin');

        const farmDoc = await firestore().doc(`farms/${farmId}`).get();
        if (!farmDoc.exists) {
          throw new HttpError(404, `Farm ${farmId} not found`);
        }

        const farmData = farmDoc.data();
        const location = farmData?.location as { lat: number; lng: number } | undefined;
        const timezone = (farmData?.timezone as string) || 'Asia/Kolkata';

        if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
          throw new HttpError(400, 'Farm does not have valid coordinates configured');
        }

        const freshWeather = await fetchWeatherForFarm(farmId, location, timezone);
        return reply.status(200).send(freshWeather);
      }

      await requireFarmMember(farmId, uid, 'viewer');

      const weather = await getLatestWeather(farmId);
      if (!weather) {
        throw new HttpError(404, 'Weather data not available for this farm yet');
      }

      return reply.status(200).send(weather);
    }
  );
};

export default weatherRoutes;

