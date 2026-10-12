import mqtt, { type MqttClient } from 'mqtt';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { handleTelemetryMessage } from '../modules/telemetry/telemetry.handler.js';
import { handleAckMessage } from '../modules/commands/commands.handler.js';

let client: MqttClient | null = null;

const TOPIC_TELEMETRY = 'krishiva/+/+/telemetry';
const TOPIC_ACK = 'krishiva/+/+/ack';

/**
 * Initializes and connects the MQTT client to EMQX over TLS.
 */
export function initMqtt(): MqttClient {
  if (client) {
    return client;
  }

  const brokerUrl = `mqtts://${env.EMQX_HOST}:${env.EMQX_PORT}`;
  const clientId = `${env.MQTT_CLIENT_ID_PREFIX}-${Math.random().toString(16).substring(2, 10)}`;

  logger.info({ host: env.EMQX_HOST, port: env.EMQX_PORT, clientId }, 'Connecting to EMQX broker...');

  client = mqtt.connect(brokerUrl, {
    clientId,
    username: env.EMQX_USERNAME,
    password: env.EMQX_PASSWORD,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 30000,
    rejectUnauthorized: false,
  });

  client.on('connect', () => {
    logger.info('MQTT connected');

    client?.subscribe([TOPIC_TELEMETRY, TOPIC_ACK], { qos: 1 }, (err) => {
      if (err) {
        logger.error({ err }, 'Failed to subscribe to MQTT topics');
      } else {
        logger.info('MQTT subscribed');
      }
    });
  });

  client.on('reconnect', () => {
    logger.debug('MQTT attempting auto-reconnect...');
  });

  client.on('error', (err) => {
    logger.error({ message: err.message }, 'MQTT client error');
  });

  client.on('message', async (topic, payload) => {
    try {
      if (topic.endsWith('/telemetry')) {
        await handleTelemetryMessage(topic, payload);
      } else if (topic.endsWith('/ack')) {
        await handleAckMessage(topic, payload);
      }
    } catch (err) {
      logger.error({ err, topic }, 'Error processing incoming MQTT message');
    }
  });

  return client;
}

export function getMqttClient(): MqttClient | null {
  return client;
}

/**
 * Publishes an actuator command to krishiva/{farmId}/{deviceId}/command with QoS 1.
 * Returns a promise and rejects if MQTT is not connected.
 */
export function publishCommand(
  farmId: string,
  deviceId: string,
  payload: unknown
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!client || !client.connected) {
      return reject(new Error('MQTT client is not connected to broker'));
    }

    const topic = `krishiva/${farmId}/${deviceId}/command`;
    const message = typeof payload === 'string' ? payload : JSON.stringify(payload);

    client.publish(topic, message, { qos: 1 }, (err) => {
      if (err) {
        logger.error({ err, topic }, 'Failed to publish MQTT command');
        return reject(err);
      }
      logger.info({ topic }, 'MQTT command published successfully');
      resolve();
    });
  });
}

export async function closeMqtt(): Promise<void> {
  if (client) {
    return new Promise((resolve) => {
      client?.end(false, {}, () => {
        logger.info('MQTT client disconnected gracefully');
        client = null;
        resolve();
      });
    });
  }
}

export default {
  initMqtt,
  getMqttClient,
  publishCommand,
  closeMqtt,
};

