import { firestore, initFirebase } from '../src/plugins/firebase.js';

initFirebase();
const db = firestore();

async function run() {
  const farmId = 'P05tYwJ9rho7xooYm67p';
  const devicesSnap = await db.collection(`farms/${farmId}/devices`).get();
  console.log(`Devices in Testing farm (${devicesSnap.size}):`);

  for (const d of devicesSnap.docs) {
    const dev = d.data();
    const latestDoc = await d.ref.collection('latest').doc('current').get();
    const latest = latestDoc.data();
    console.log(`\n• Device: "${dev.name}" (ID: ${d.id}, Node: ${dev.nodeId})`);
    console.log(`  Zone: ${dev.location?.zone} | Status: ${dev.status} | Last Seen: ${dev.lastSeenAt}`);
    if (latest) {
      console.log(`  Latest Snapshot -> Temp: ${latest.temperature}°C | Humidity: ${latest.humidity}% | Moisture: ${latest.soilMoisture}% | Time: ${latest.recordedAt}`);
    }
  }
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
