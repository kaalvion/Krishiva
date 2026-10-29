import { firestore, initFirebase } from '../src/plugins/firebase.js';

initFirebase();
const db = firestore();

const FARM_ID = 'P05tYwJ9rho7xooYm67p';

interface DeviceConfig {
  id?: string;
  nodeId: number;
  name: string;
  type: string;
  capabilities: string[];
  location: { zone: string; lat: number; lng: number };
  moistureBaseOffset: number;
}

const DEVICES: DeviceConfig[] = [
  {
    nodeId: 1,
    name: 'Main Irrigation Pump & Sensor',
    type: 'sensor_actuator',
    capabilities: ['pump', 'soil_moisture', 'temperature', 'humidity'],
    location: { zone: 'Zone A - Nursery', lat: 30.7340, lng: 76.7800 },
    moistureBaseOffset: 2.5,
  },
  {
    nodeId: 2,
    name: 'Paddy Field Sensor (North)',
    type: 'sensor',
    capabilities: ['soil_moisture', 'temperature', 'humidity'],
    location: { zone: 'Zone B - North Field', lat: 30.7355, lng: 76.7812 },
    moistureBaseOffset: -1.0,
  },
  {
    nodeId: 3,
    name: 'Paddy Field Sensor (South)',
    type: 'sensor',
    capabilities: ['soil_moisture', 'temperature', 'humidity'],
    location: { zone: 'Zone C - South Field', lat: 30.7322, lng: 76.7788 },
    moistureBaseOffset: -3.5,
  },
];

async function main() {
  console.log(`Starting 30-day telemetry generation for farm ${FARM_ID}...`);

  const farmRef = db.collection('farms').doc(FARM_ID);
  const farmSnap = await farmRef.get();
  if (!farmSnap.exists) {
    throw new Error(`Farm ${FARM_ID} not found in Firestore!`);
  }
  console.log(`Farm found: "${farmSnap.data()?.name}" (Crop: ${farmSnap.data()?.cropType})`);

  // 1. Ensure devices exist
  const devicesSnap = await farmRef.collection('devices').get();
  const existingDevicesByNode = new Map<number, FirebaseFirestore.QueryDocumentSnapshot>();
  devicesSnap.forEach((doc) => {
    existingDevicesByNode.set(doc.data().nodeId, doc);
  });

  const resolvedDevices: { id: string; config: DeviceConfig }[] = [];

  for (const config of DEVICES) {
    const existing = existingDevicesByNode.get(config.nodeId);
    if (existing) {
      console.log(`Using existing device for Node ${config.nodeId} (ID: ${existing.id})`);
      resolvedDevices.push({ id: existing.id, config });
    } else {
      const newDevRef = farmRef.collection('devices').doc();
      const devPayload = {
        nodeId: config.nodeId,
        name: config.name,
        type: config.type,
        capabilities: config.capabilities,
        location: config.location,
        status: 'online',
        createdAt: new Date().toISOString(),
      };
      await newDevRef.set(devPayload);
      console.log(`Registered new device for Node ${config.nodeId}: ID ${newDevRef.id} (${config.name})`);
      resolvedDevices.push({ id: newDevRef.id, config });
    }
  }

  // 2. Generate 30 days of data at 15-minute intervals
  const now = new Date('2026-10-28T17:30:00Z');
  const INTERVAL_MINUTES = 15;
  const TOTAL_DAYS = 30;
  const TOTAL_INTERVALS = TOTAL_DAYS * 24 * (60 / INTERVAL_MINUTES); // 30 * 96 = 2,880
  const START_TIME = new Date(now.getTime() - TOTAL_DAYS * 24 * 60 * 60 * 1000);

  console.log(`Generating ${TOTAL_INTERVALS} readings per device from ${START_TIME.toISOString()} to ${now.toISOString()}...`);

  // Global sequence counter
  let baseSeq = 1000;

  for (const dev of resolvedDevices) {
    console.log(`\nGenerating time-series for Node ${dev.config.nodeId} (${dev.id})...`);
    let batch = db.batch();
    let batchCount = 0;
    let totalWritten = 0;

    let soilMoisture = 68.0 + dev.config.moistureBaseOffset;
    let daysSinceIrrigation = 0;

    let lastRecord: any = null;

    for (let step = 0; step < TOTAL_INTERVALS; step++) {
      const recordTime = new Date(START_TIME.getTime() + step * INTERVAL_MINUTES * 60 * 1000);
      const isoTime = recordTime.toISOString();
      const hourOfDay = recordTime.getUTCHours() + recordTime.getUTCMinutes() / 60;

      // Diurnal temperature curve (peaks ~14:00 UTC at ~32°C, dips ~05:00 UTC at ~21°C)
      const tempRadian = ((hourOfDay - 5) / 24) * 2 * Math.PI;
      const baseTemp = 26.5 + 5.5 * Math.sin(tempRadian - Math.PI / 2);
      const tempNoise = (Math.sin(step * 0.13) + Math.cos(step * 0.27)) * 0.4;
      const temperature = Math.round((baseTemp + tempNoise) * 10) / 10;

      // Humidity is inversely related to temperature
      const baseHumidity = 72 - 18 * Math.sin(tempRadian - Math.PI / 2);
      const humNoise = (Math.cos(step * 0.17) - Math.sin(step * 0.31)) * 1.5;
      const humidity = Math.min(100, Math.max(30, Math.round((baseHumidity + humNoise) * 10) / 10));

      // Soil moisture dynamics:
      // Dry down slowly over 3.5 days, then an irrigation event (e.g. pump turns on) replenishes it
      daysSinceIrrigation += INTERVAL_MINUTES / (24 * 60);
      if (daysSinceIrrigation > 3.5 || soilMoisture < 38) {
        // Irrigation event
        soilMoisture = 72.0 + dev.config.moistureBaseOffset + (Math.random() * 4 - 2);
        daysSinceIrrigation = 0;
      } else {
        // Natural drydown rate (~8-10% loss per day, faster during peak daytime heat)
        const dryRatePerStep = (hourOfDay >= 10 && hourOfDay <= 16 ? 0.14 : 0.06);
        soilMoisture = Math.max(25, soilMoisture - dryRatePerStep + (Math.random() * 0.04 - 0.02));
      }
      const roundedMoisture = Math.round(soilMoisture * 10) / 10;

      const seq = baseSeq + step;

      // UTC daily bucket name
      const yyyy = recordTime.getUTCFullYear();
      const mm = String(recordTime.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(recordTime.getUTCDate()).padStart(2, '0');
      const bucketName = `readings_${yyyy}_${mm}_${dd}`;

      const readingDocRef = farmRef
        .collection('devices')
        .doc(dev.id)
        .collection(bucketName)
        .doc(`seq_${seq}`);

      const readingRecord = {
        nodeId: dev.config.nodeId,
        temperature,
        humidity,
        soilMoisture: roundedMoisture,
        recordedAt: isoTime,
        receivedAt: new Date(recordTime.getTime() + 1200).toISOString(),
        seq,
      };

      batch.set(readingDocRef, readingRecord);
      batchCount++;
      lastRecord = readingRecord;

      if (batchCount >= 450) {
        await batch.commit();
        totalWritten += batchCount;
        batch = db.batch();
        batchCount = 0;
        process.stdout.write(`.`);
      }
    }

    if (batchCount > 0) {
      await batch.commit();
      totalWritten += batchCount;
    }

    console.log(`\n  Done: ${totalWritten} readings written for ${dev.id}.`);

    // 3. Update device singleton latest and device document
    if (lastRecord) {
      const latestRef = farmRef.collection('devices').doc(dev.id).collection('latest').doc('current');
      await latestRef.set({
        ...lastRecord,
        status: 'online',
      });

      await farmRef.collection('devices').doc(dev.id).update({
        lastSeenAt: lastRecord.recordedAt,
        status: 'online',
      });
      console.log(`  Updated latest reading and device status for ${dev.id}`);
    }

    baseSeq += TOTAL_INTERVALS + 100;
  }

  console.log(`\nSuccessfully populated 30 days of data for Farm ${FARM_ID}!`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  });

