import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { initFirebase } from './plugins/firebase.js';
import { buildApp } from './app.js';
import { initMqtt, closeMqtt } from './plugins/mqtt.js';
import { startScheduler, stopScheduler } from './jobs/scheduler.js';

async function main() {
  try {
    // 1. Initialize Firebase Admin SDK
    initFirebase();

    // 2. Build and launch Fastify HTTP server
    const app = await buildApp();
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    logger.info(`Server listening at http://localhost:${env.PORT}`);
    logger.info(`API Documentation available at http://localhost:${env.PORT}/docs`);

    // 3. Connect to EMQX MQTT Broker & subscribe to topics
    initMqtt();

    // 4. Start scheduled cron jobs
    startScheduler();

    // 5. Graceful shutdown listeners
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Graceful shutdown initiated');
      stopScheduler();
      await closeMqtt();
      await app.close();
      logger.info('Server terminated cleanly');
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    logger.fatal({ err }, 'Fatal error during server startup');
    process.exit(1);
  }
}

main();
