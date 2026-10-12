import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { firestore } from '../../plugins/firebase.js';
import { HttpError, requireFarmMember } from './farms.helper.js';

export const createFarmSchema = z.object({
  name: z
    .string({ required_error: 'name is required' })
    .min(1, 'name must be between 1 and 100 characters')
    .max(100, 'name must be between 1 and 100 characters')
    .trim(),
  areaAcres: z
    .number({ required_error: 'areaAcres is required' })
    .gt(0, 'areaAcres must be greater than 0')
    .lte(1000, 'areaAcres must be at most 1000'),
  cropType: z
    .string({ required_error: 'cropType is required' })
    .min(1, 'cropType cannot be empty')
    .trim(),
  location: z.object({
    lat: z
      .number({ required_error: 'location.lat is required' })
      .min(-90, 'lat must be between -90 and 90')
      .max(90, 'lat must be between -90 and 90'),
    lng: z
      .number({ required_error: 'location.lng is required' })
      .min(-180, 'lng must be between -180 and 180')
      .max(180, 'lng must be between -180 and 180'),
  }),
  timezone: z.string().default('Asia/Kolkata'),
});

export type CreateFarmInput = z.infer<typeof createFarmSchema>;

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

export const farmsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/farms
   * List all farms where the authenticated user is a member using a collectionGroup query.
   */
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Farms'],
        summary: 'List user farms',
        description: 'Returns all farms where the authenticated user is an active member',
        security: [{ BearerAuth: [] }],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: true,
            },
          },
          401: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const uid = request.user?.uid;
      if (!uid) {
        throw new HttpError(401, 'Unauthorized');
      }

      let membersSnapshot;
      try {
        membersSnapshot = await firestore()
          .collectionGroup('members')
          .where('userId', '==', uid)
          .get();
      } catch (err: any) {
        // If collectionGroup index has not yet finished building in Firestore, fallback to direct query
        if (err?.code === 9 || err?.message?.includes('COLLECTION_GROUP')) {
          const ownedFarmsSnap = await firestore()
            .collection('farms')
            .where('ownerId', '==', uid)
            .get();

          return ownedFarmsSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            role: 'owner',
          }));
        }
        throw err;
      }

      if (membersSnapshot.empty) {
        return [];
      }

      // Fetch farm details for each membership
      const farmsWithRoles = await Promise.all(
        membersSnapshot.docs.map(async (memberDoc) => {
          const farmRef = memberDoc.ref.parent.parent;
          if (!farmRef) return null;

          const farmSnap = await farmRef.get();
          if (!farmSnap.exists) return null;

          const memberData = memberDoc.data();
          return {
            id: farmRef.id,
            ...farmSnap.data(),
            role: memberData.role,
          };
        })
      );

      return farmsWithRoles.filter((f) => f !== null);
    }
  );

  /**
   * POST /api/farms
   * Create a new farm and assign the caller as "owner" in an atomic batch.
   */
  fastify.post(
    '/',
    {
      schema: {
        tags: ['Farms'],
        summary: 'Create a new farm',
        description: 'Creates a farm entity and grants owner membership in a single atomic batch',
        security: [{ BearerAuth: [] }],
        response: {
          201: {
            type: 'object',
            properties: {
              farmId: { type: 'string' },
            },
          },
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const uid = request.user?.uid;
      if (!uid) {
        throw new HttpError(401, 'Unauthorized');
      }

      const parseResult = createFarmSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid request body',
          issues: parseResult.error.issues,
        });
      }

      const body = parseResult.data;
      const now = new Date().toISOString();

      const farmRef = firestore().collection('farms').doc();
      const farmId = farmRef.id;
      const memberRef = firestore().doc(`farms/${farmId}/members/${uid}`);

      const farmData = {
        name: body.name,
        ownerId: uid,
        location: body.location,
        areaAcres: body.areaAcres,
        cropType: body.cropType,
        timezone: body.timezone || 'Asia/Kolkata',
        createdAt: now,
        updatedAt: now,
      };

      const memberData = {
        userId: uid,
        role: 'owner',
        displayName: request.user?.name || request.user?.email || 'Farm Owner',
        joinedAt: now,
      };

      // Atomic batch write
      const batch = firestore().batch();
      batch.set(farmRef, farmData);
      batch.set(memberRef, memberData);
      await batch.commit();

      return reply.status(201).send({ farmId });
    }
  );

  /**
   * GET /api/farms/:farmId
   * Retrieve details of a specific farm.
   * Returns 404 if not found, 403 if user is not a member.
   */
  fastify.get<{ Params: { farmId: string } }>(
    '/:farmId',
    {
      schema: {
        tags: ['Farms'],
        summary: 'Get farm details',
        description: 'Returns farm metadata for authorized members',
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
            additionalProperties: true,
          },
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

      const { farmId } = request.params;
      const farmDoc = await firestore().doc(`farms/${farmId}`).get();

      if (!farmDoc.exists) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Farm with ID ${farmId} not found`,
        });
      }

      // Check membership (throws HttpError 403 if not member)
      const member = await requireFarmMember(farmId, uid, 'viewer');

      return {
        id: farmId,
        ...farmDoc.data(),
        role: member.role,
      };
    }
  );
};

export default farmsRoutes;
