import Fastify, { type FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import authPlugin from './plugins/auth.js';
import farmsRoutes from './modules/farms/farms.routes.js';
import devicesRoutes from './modules/devices/devices.routes.js';
import telemetryRoutes from './modules/telemetry/telemetry.routes.js';
import commandsRoutes from './modules/commands/commands.routes.js';

/**
 * Builds and configures the Fastify application instance.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    loggerInstance: logger as any,
  });

  // Global error handler to format HttpErrors and validation errors cleanly
  app.setErrorHandler((error: any, request, reply) => {
    const statusCode = error?.statusCode && error.statusCode >= 400 && error.statusCode < 600
      ? error.statusCode
      : 500;

    if (statusCode >= 500) {
      logger.error({ err: error, url: request.url }, 'Unhandled server error');
    }

    reply.status(statusCode).send({
      statusCode,
      error:
        statusCode === 400
          ? 'Bad Request'
          : statusCode === 401
          ? 'Unauthorized'
          : statusCode === 403
          ? 'Forbidden'
          : statusCode === 404
          ? 'Not Found'
          : statusCode === 409
          ? 'Conflict'
          : 'Internal Server Error',
      message: error.message,
    });
  });

  // CORS configuration
  await app.register(fastifyCors, {
    origin:
      env.CORS_ORIGINS === '*'
        ? true
        : env.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
    credentials: true,
  });

  // OpenAPI / Swagger specification generator
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Krishiva Smart-Farm IoT API',
        description: 'REST API documentation for Krishiva Smart-Farm platform',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${env.PORT}`,
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Enter your Firebase ID token',
          },
        },
      },
    },
  });

  // Swagger UI documentation endpoint at /docs
  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    staticCSP: true,
  });

  // Authentication plugin (guards /api routes, leaves /health and /docs public)
  await app.register(authPlugin);

  // Health check endpoint
  app.get(
    '/health',
    {
      schema: {
        tags: ['System'],
        summary: 'System health check',
        description: 'Public health status verification endpoint',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string', example: 'ok' },
            },
          },
        },
      },
    },
    async () => {
      return { status: 'ok' };
    }
  );

  // Register domain module routes with specified prefixes
  await app.register(farmsRoutes, { prefix: '/api/farms' });
  await app.register(devicesRoutes, { prefix: '/api' });
  await app.register(telemetryRoutes, { prefix: '/api' });
  await app.register(commandsRoutes, { prefix: '/api' });

  return app;
}

export default buildApp;
