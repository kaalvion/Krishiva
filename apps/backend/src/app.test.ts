import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';
import { initFirebase } from './plugins/firebase.js';

describe('Fastify Application Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    initFirebase();
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns status ok', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('GET /docs renders documentation', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/docs/',
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
  });

  it('GET /api/farms without a token returns 401 Unauthorized', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/farms',
    });
    expect(res.statusCode).toBe(401);
    const json = res.json();
    expect(json.statusCode).toBe(401);
    expect(json.error).toBe('Unauthorized');
  });
});
