import mqtt from 'mqtt';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';

// Load .env from backend or root directory
const envCandidatePaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'apps/backend/.env'),
  path.resolve(process.cwd(), '..', '.env'),
  path.resolve(process.cwd(), '..', '..', '.env'),
];

for (const envPath of envCandidatePaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const farmId = args[0];
  const deviceId = args[1];
  const nodeIdStr = args[2];

  if (!farmId || !deviceId || !nodeIdStr) {
    console.error('Error: Missing required arguments.');
    console.error('Usage: npm run sim:device -- <farmId> <deviceId> <nodeId>');
    console.error('Example: npm run sim:device -- farm-abc dev-123 1');
    process.exit(1);
  }

  const nodeId = parseInt(nodeIdStr, 10);
  if (isNaN(nodeId) || nodeId < 1 || nodeId > 4) {
    console.error('Error: nodeId must be an integer between 1 and 4.');
    process.exit(1);
  }

  const host = process.env.EMQX_HOST || 'broker.emqx.io';
  const port = parseInt(process.env.EMQX_PORT || '8883', 10);
  const username = process.env.EMQX_USERNAME;
  const password = process.env.EMQX_PASSWORD;

  if (!username || !password) {
    console.error('Error: EMQX_USERNAME and EMQX_PASSWORD must be configured in .env.');
    process.exit(1);
  }

  const brokerUrl = `mqtts://${host}:${port}`;
  const clientId = `sim-${deviceId.substring(0, 8)}-${Math.random().toString(16).substring(2, 8)}`;

  console.log('----------------------------------------------------');
  console.log('Krishiva IoT Hardware Simulator');
  console.log(`Farm ID   : ${farmId}`);
  console.log(`Device ID : ${deviceId}`);
  console.log(`Node ID   : ${nodeId}`);
  console.log(`Broker    : ${host}:${port} (TLS)`);
  console.log(`Client ID : ${clientId}`);
  console.log('----------------------------------------------------');

  const client = mqtt.connect(brokerUrl, {
    clientId,
    username,
    password,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 30000,
    rejectUnauthorized: false,
  });

  const telemetryTopic = `krishiva/${farmId}/${deviceId}/telemetry`;
  const commandTopic = `krishiva/${farmId}/${deviceId}/command`;
  const ackTopic = `krishiva/${farmId}/${deviceId}/ack`;

  // Simulation State
  let temperature = 28.5; // Drift smoothly 24 - 36
  let humidity = 62.0;    // Drift smoothly 40 - 80
  let soilMoisture = 45.0; // 20 - 70: drops slowly, rises during pump active
  let pumpActive = false;
  let pumpEndTime = 0;

  let telemetryInterval: NodeJS.Timeout | null = null;

  // Clean shutdown
  const shutdown = () => {
    console.log('\n[Simulator] Stopping device simulation cleanly...');
    if (telemetryInterval) clearInterval(telemetryInterval);
    client.end(false, () => {
      console.log('[Simulator] MQTT disconnected. Goodbye.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  client.on('connect', () => {
    console.log('[Simulator] Connected to EMQX broker successfully.');

    // Subscribe to actuator commands
    client.subscribe(commandTopic, { qos: 1 }, (err) => {
      if (err) {
        console.error(`[Simulator] Failed to subscribe to ${commandTopic}:`, err.message);
      } else {
        console.log(`[Simulator] Subscribed to command topic: ${commandTopic}`);
      }
    });

    // Start publishing telemetry every 10 seconds
    const publishTelemetry = () => {
      const now = Date.now();

      // Check pump status
      if (pumpActive) {
        if (now >= pumpEndTime) {
          pumpActive = false;
          pumpEndTime = 0;
          console.log('[Simulator] Pump cycle duration expired. Pump is now OFF.');
        } else {
          // Pump raises soilMoisture by ~2 points per 10s cycle
          soilMoisture = Math.min(70.0, soilMoisture + 2.0);
        }
      } else {
        // Naturally drying: drops slowly (~0.2 per cycle)
        soilMoisture = Math.max(20.0, soilMoisture - 0.2);
      }

      // Smooth random walk for temperature (24 - 36)
      const tDelta = (Math.random() - 0.5) * 0.5;
      temperature = Math.max(24.0, Math.min(36.0, temperature + tDelta));

      // Smooth random walk for humidity (40 - 80)
      const hDelta = (Math.random() - 0.5) * 1.5;
      humidity = Math.max(40.0, Math.min(80.0, humidity + hDelta));

      const payload = {
        nodeId,
        temperature: Number(temperature.toFixed(1)),
        humidity: Math.round(humidity),
        soilMoisture: Math.round(soilMoisture),
        recordedAt: new Date().toISOString(),
      };

      client.publish(telemetryTopic, JSON.stringify(payload), { qos: 1 }, (err) => {
        if (err) {
          console.error('[Simulator] Telemetry publish error:', err.message);
        } else {
          const pumpStatus = pumpActive
            ? `PUMP ON (${Math.max(0, Math.round((pumpEndTime - now) / 1000))}s left)`
            : 'PUMP OFF';
          console.log(
            `[${payload.recordedAt.substring(11, 19)}] Published -> Moisture: ${payload.soilMoisture}% | Temp: ${payload.temperature}°C | Humidity: ${payload.humidity}% | ${pumpStatus}`
          );
        }
      });
    };

    // Publish first packet immediately, then every 10 seconds
    publishTelemetry();
    telemetryInterval = setInterval(publishTelemetry, 10000);
  });

  client.on('error', (err) => {
    console.error('[Simulator] MQTT connection error:', err.message);
  });

  // Handle incoming actuator commands
  client.on('message', (topic, rawMessage) => {
    if (topic !== commandTopic) return;

    try {
      const messageStr = rawMessage.toString('utf8');
      const cmd = JSON.parse(messageStr);
      const { commandId, action, durationSeconds } = cmd;

      console.log(
        `\n[Simulator] >>> Command Received: ${action} (ID: ${commandId}) Duration: ${durationSeconds ?? 'none'}s`
      );

      // Requirement: wait 2 seconds, then publish ACK to krishiva/{farmId}/{deviceId}/ack
      setTimeout(() => {
        const ackPayload = {
          commandId,
          success: true,
        };

        client.publish(ackTopic, JSON.stringify(ackPayload), { qos: 1 }, (err) => {
          if (err) {
            console.error('[Simulator] Failed to publish command ACK:', err.message);
          } else {
            console.log(`[Simulator] <<< Published ACK for command ${commandId} (success: true)`);
          }
        });

        // Update simulator state
        if (action === 'PUMP_ON') {
          pumpActive = true;
          const duration = durationSeconds || 900;
          pumpEndTime = Date.now() + duration * 1000;
          console.log(`[Simulator] Pump activated! Will run for ${duration}s, raising soil moisture.`);
        } else if (action === 'PUMP_OFF') {
          pumpActive = false;
          pumpEndTime = 0;
          console.log('[Simulator] Pump deactivated by command.');
        } else {
          console.log(`[Simulator] Executed action ${action}.`);
        }
      }, 2000);
    } catch (parseErr) {
      console.error('[Simulator] Failed to parse incoming command message:', parseErr);
    }
  });
}

main().catch((err) => {
  console.error('Simulator unhandled error:', err);
  process.exit(1);
});
