import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { auth } from './firebase.js';
import { logger } from '../utils/logger.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: DecodedIdToken;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/**
 * Fastify preHandler to verify Firebase ID token from Authorization header.
 * Attaches decoded user payload to request.user.
 * Returns 401 Unauthorized if token is missing, invalid, or expired.
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization header. Expected Bearer token.',
    });
    return;
  }

  const token = authHeader.substring(7).trim();

  if (!token) {
    reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Token string is empty.',
    });
    return;
  }

  try {
    const decodedToken = await auth().verifyIdToken(token);
    request.user = decodedToken;
  } catch (err) {
    logger.debug({ err }, 'Failed to verify Firebase ID token');
    reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Invalid or expired Firebase ID token.',
    });
    return;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('authenticate', authenticate);

  // Global preHandler hook that protects all /api routes while keeping /health and /docs public
  fastify.addHook('preHandler', async (request, reply) => {
    const path = request.url.split('?')[0];

    // Public routes
    if (
      path === '/health' ||
      path.startsWith('/docs') ||
      path.startsWith('/static')
    ) {
      return;
    }

    // Protect all /api endpoints
    if (path.startsWith('/api')) {
      await authenticate(request, reply);
    }
  });
};

export default fp(authPlugin);
