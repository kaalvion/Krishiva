import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  collectionGroup,
} from 'firebase/firestore';

const PROJECT_ID = 'krishiva-be6a1';
let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  const rulesPath = resolve(__dirname, '../firestore.rules');
  const rules = readFileSync(rulesPath, 'utf8');

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules,
    },
  });
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  // Seed baseline data using admin context (bypasses security rules)
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();

    // 1. User Profiles
    await setDoc(doc(adminDb, 'users', 'user_owner'), {
      displayName: 'Farm Owner',
      email: 'owner@krishiva.com',
      language: 'en',
    });
    await setDoc(doc(adminDb, 'users', 'user_viewer'), {
      displayName: 'Farm Viewer',
      email: 'viewer@krishiva.com',
      language: 'en',
    });
    await setDoc(doc(adminDb, 'users', 'user_beta'), {
      displayName: 'Beta Farmer',
      email: 'beta@krishiva.com',
      language: 'en',
    });

    // 2. Farm Alpha (Owned by user_owner, with user_admin as admin, user_viewer as viewer)
    await setDoc(doc(adminDb, 'farms', 'farm_alpha'), {
      name: 'Alpha Farm',
      ownerId: 'user_owner',
      cropType: 'Wheat',
      areaAcres: 50,
    });
    await setDoc(doc(adminDb, 'farms', 'farm_alpha', 'members', 'user_owner'), {
      userId: 'user_owner',
      role: 'owner',
      displayName: 'Farm Owner',
    });
    await setDoc(doc(adminDb, 'farms', 'farm_alpha', 'members', 'user_admin'), {
      userId: 'user_admin',
      role: 'admin',
      displayName: 'Farm Admin',
    });
    await setDoc(doc(adminDb, 'farms', 'farm_alpha', 'members', 'user_viewer'), {
      userId: 'user_viewer',
      role: 'viewer',
      displayName: 'Farm Viewer',
    });

    // Subcollections under Farm Alpha
    await setDoc(doc(adminDb, 'farms', 'farm_alpha', 'devices', 'dev_alpha'), {
      nodeId: 1,
      name: 'Alpha Pump Sensor',
      type: 'sensor_actuator',
      status: 'online',
    });
    await setDoc(doc(adminDb, 'farms', 'farm_alpha', 'devices', 'dev_alpha', 'latest', 'current'), {
      temperature: 24.5,
      humidity: 60.0,
      soilMoisture: 45.2,
      status: 'online',
    });
    await setDoc(
      doc(adminDb, 'farms', 'farm_alpha', 'devices', 'dev_alpha', 'readings_2026_10_29', 'seq_101'),
      {
        nodeId: 1,
        temperature: 24.5,
        humidity: 60.0,
        soilMoisture: 45.2,
        recordedAt: '2026-10-29T10:00:00Z',
      }
    );
    await setDoc(doc(adminDb, 'farms', 'farm_alpha', 'devices', 'dev_alpha', 'commands', 'cmd_1'), {
      action: 'PUMP_ON',
      status: 'acknowledged',
    });
    await setDoc(doc(adminDb, 'farms', 'farm_alpha', 'alerts', 'alert_1'), {
      type: 'SOIL_MOISTURE_CRITICAL',
      severity: 'critical',
      acknowledged: false,
    });
    await setDoc(doc(adminDb, 'farms', 'farm_alpha', 'schedules', 'sched_1'), {
      time: '06:00',
      action: 'PUMP_ON',
      enabled: true,
    });
    await setDoc(doc(adminDb, 'farms', 'farm_alpha', 'schedule_runs', 'run_1'), {
      executedAt: '2026-10-29T06:00:00Z',
      status: 'success',
    });

    // 3. Farm Beta (Owned by user_beta; completely isolated from user_owner / user_viewer)
    await setDoc(doc(adminDb, 'farms', 'farm_beta'), {
      name: 'Beta Farm',
      ownerId: 'user_beta',
      cropType: 'Rice',
      areaAcres: 25,
    });
    await setDoc(doc(adminDb, 'farms', 'farm_beta', 'members', 'user_beta'), {
      userId: 'user_beta',
      role: 'owner',
      displayName: 'Beta Farmer',
    });
  });
});

describe('Firestore Security Rules: Authentication & Isolation', () => {
  it('unauthenticated user cannot read anything', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();

    await assertFails(getDoc(doc(unauthDb, 'users', 'user_owner')));
    await assertFails(getDoc(doc(unauthDb, 'farms', 'farm_alpha')));
    await assertFails(getDoc(doc(unauthDb, 'farms', 'farm_alpha', 'devices', 'dev_alpha')));
    await assertFails(getDoc(doc(unauthDb, 'farms', 'farm_alpha', 'devices', 'dev_alpha', 'latest', 'current')));
    await assertFails(getDoc(doc(unauthDb, 'farms', 'farm_alpha', 'devices', 'dev_alpha', 'readings_2026_10_29', 'seq_101')));
    await assertFails(getDoc(doc(unauthDb, 'farms', 'farm_alpha', 'devices', 'dev_alpha', 'commands', 'cmd_1')));
    await assertFails(getDoc(doc(unauthDb, 'farms', 'farm_alpha', 'alerts', 'alert_1')));
    await assertFails(getDoc(doc(unauthDb, 'farms', 'farm_alpha', 'schedules', 'sched_1')));
    await assertFails(getDoc(doc(unauthDb, 'farms', 'farm_alpha', 'members', 'user_owner')));
    await assertFails(getDoc(doc(unauthDb, 'farms', 'farm_alpha', 'schedule_runs', 'run_1')));
  });

  it('user can read their own user document, but not another user document', async () => {
    const ownerDb = testEnv.authenticatedContext('user_owner').firestore();

    // Can read own profile
    await assertSucceeds(getDoc(doc(ownerDb, 'users', 'user_owner')));

    // Cannot read another user's profile
    await assertFails(getDoc(doc(ownerDb, 'users', 'user_viewer')));
    await assertFails(getDoc(doc(ownerDb, 'users', 'user_beta')));
  });

  it('a member of farm A cannot read farm B', async () => {
    const viewerDb = testEnv.authenticatedContext('user_viewer').firestore();

    // Member of farm_alpha CAN read farm_alpha
    await assertSucceeds(getDoc(doc(viewerDb, 'farms', 'farm_alpha')));

    // Member of farm_alpha CANNOT read farm_beta
    await assertFails(getDoc(doc(viewerDb, 'farms', 'farm_beta')));
    await assertFails(getDoc(doc(viewerDb, 'farms', 'farm_beta', 'members', 'user_beta')));
  });

  it('non-member cannot read farm, devices, latest, readings, commands, alerts, schedules or members', async () => {
    const outsiderDb = testEnv.authenticatedContext('user_outsider').firestore();

    await assertFails(getDoc(doc(outsiderDb, 'farms', 'farm_alpha')));
    await assertFails(getDoc(doc(outsiderDb, 'farms', 'farm_alpha', 'devices', 'dev_alpha')));
    await assertFails(getDoc(doc(outsiderDb, 'farms', 'farm_alpha', 'devices', 'dev_alpha', 'latest', 'current')));
    await assertFails(getDoc(doc(outsiderDb, 'farms', 'farm_alpha', 'devices', 'dev_alpha', 'readings_2026_10_29', 'seq_101')));
    await assertFails(getDoc(doc(outsiderDb, 'farms', 'farm_alpha', 'devices', 'dev_alpha', 'commands', 'cmd_1')));
    await assertFails(getDoc(doc(outsiderDb, 'farms', 'farm_alpha', 'alerts', 'alert_1')));
    await assertFails(getDoc(doc(outsiderDb, 'farms', 'farm_alpha', 'schedules', 'sched_1')));
    await assertFails(getDoc(doc(outsiderDb, 'farms', 'farm_alpha', 'members', 'user_owner')));
  });
});

describe('Firestore Security Rules: Farm Member Role Permissions', () => {
  it('viewer CAN read all telemetry, devices, alerts, schedules, commands and own membership', async () => {
    const viewerDb = testEnv.authenticatedContext('user_viewer').firestore();

    await assertSucceeds(getDoc(doc(viewerDb, 'farms', 'farm_alpha')));
    await assertSucceeds(getDoc(doc(viewerDb, 'farms', 'farm_alpha', 'devices', 'dev_alpha')));
    await assertSucceeds(getDoc(doc(viewerDb, 'farms', 'farm_alpha', 'devices', 'dev_alpha', 'latest', 'current')));
    await assertSucceeds(getDoc(doc(viewerDb, 'farms', 'farm_alpha', 'devices', 'dev_alpha', 'readings_2026_10_29', 'seq_101')));
    await assertSucceeds(getDoc(doc(viewerDb, 'farms', 'farm_alpha', 'devices', 'dev_alpha', 'commands', 'cmd_1')));
    await assertSucceeds(getDoc(doc(viewerDb, 'farms', 'farm_alpha', 'alerts', 'alert_1')));
    await assertSucceeds(getDoc(doc(viewerDb, 'farms', 'farm_alpha', 'schedules', 'sched_1')));
    await assertSucceeds(getDoc(doc(viewerDb, 'farms', 'farm_alpha', 'members', 'user_viewer')));
  });

  it('admin CAN read all farm subcollections and any member document', async () => {
    const adminDb = testEnv.authenticatedContext('user_admin').firestore();

    await assertSucceeds(getDoc(doc(adminDb, 'farms', 'farm_alpha')));
    await assertSucceeds(getDoc(doc(adminDb, 'farms', 'farm_alpha', 'devices', 'dev_alpha')));
    await assertSucceeds(getDoc(doc(adminDb, 'farms', 'farm_alpha', 'devices', 'dev_alpha', 'latest', 'current')));
    await assertSucceeds(getDoc(doc(adminDb, 'farms', 'farm_alpha', 'devices', 'dev_alpha', 'readings_2026_10_29', 'seq_101')));
    await assertSucceeds(getDoc(doc(adminDb, 'farms', 'farm_alpha', 'alerts', 'alert_1')));
    await assertSucceeds(getDoc(doc(adminDb, 'farms', 'farm_alpha', 'schedules', 'sched_1')));
    await assertSucceeds(getDoc(doc(adminDb, 'farms', 'farm_alpha', 'members', 'user_viewer')));
    await assertSucceeds(getDoc(doc(adminDb, 'farms', 'farm_alpha', 'members', 'user_owner')));
  });

  it('owner CAN read all farm subcollections and any member document', async () => {
    const ownerDb = testEnv.authenticatedContext('user_owner').firestore();

    await assertSucceeds(getDoc(doc(ownerDb, 'farms', 'farm_alpha')));
    await assertSucceeds(getDoc(doc(ownerDb, 'farms', 'farm_alpha', 'devices', 'dev_alpha')));
    await assertSucceeds(getDoc(doc(ownerDb, 'farms', 'farm_alpha', 'devices', 'dev_alpha', 'latest', 'current')));
    await assertSucceeds(getDoc(doc(ownerDb, 'farms', 'farm_alpha', 'devices', 'dev_alpha', 'readings_2026_10_29', 'seq_101')));
    await assertSucceeds(getDoc(doc(ownerDb, 'farms', 'farm_alpha', 'alerts', 'alert_1')));
    await assertSucceeds(getDoc(doc(ownerDb, 'farms', 'farm_alpha', 'schedules', 'sched_1')));
    await assertSucceeds(getDoc(doc(ownerDb, 'farms', 'farm_alpha', 'members', 'user_admin')));
  });

  it('only owner/admin can list all members of a farm; viewer cannot', async () => {
    const ownerDb = testEnv.authenticatedContext('user_owner').firestore();
    const adminDb = testEnv.authenticatedContext('user_admin').firestore();
    const viewerDb = testEnv.authenticatedContext('user_viewer').firestore();
    const outsiderDb = testEnv.authenticatedContext('user_outsider').firestore();

    const membersColOwner = collection(ownerDb, 'farms', 'farm_alpha', 'members');
    const membersColAdmin = collection(adminDb, 'farms', 'farm_alpha', 'members');
    const membersColViewer = collection(viewerDb, 'farms', 'farm_alpha', 'members');
    const membersColOutsider = collection(outsiderDb, 'farms', 'farm_alpha', 'members');

    // Owner and Admin can list all members
    await assertSucceeds(getDocs(membersColOwner));
    await assertSucceeds(getDocs(membersColAdmin));

    // Viewer cannot list members of the farm
    await assertFails(getDocs(membersColViewer));

    // Non-member outsider cannot list members
    await assertFails(getDocs(membersColOutsider));
  });

  it('schedule_runs subcollection is unreadable by any client (including owner and admin)', async () => {
    const ownerDb = testEnv.authenticatedContext('user_owner').firestore();
    const adminDb = testEnv.authenticatedContext('user_admin').firestore();
    const viewerDb = testEnv.authenticatedContext('user_viewer').firestore();

    await assertFails(getDoc(doc(ownerDb, 'farms', 'farm_alpha', 'schedule_runs', 'run_1')));
    await assertFails(getDoc(doc(adminDb, 'farms', 'farm_alpha', 'schedule_runs', 'run_1')));
    await assertFails(getDoc(doc(viewerDb, 'farms', 'farm_alpha', 'schedule_runs', 'run_1')));
  });
});

describe('Firestore Security Rules: Collection Group Queries', () => {
  it('collection group query for members with user own uid succeeds', async () => {
    const viewerDb = testEnv.authenticatedContext('user_viewer').firestore();
    const ownerDb = testEnv.authenticatedContext('user_owner').firestore();

    // Query for user_viewer's own memberships
    const viewerQuery = query(
      collectionGroup(viewerDb, 'members'),
      where('userId', '==', 'user_viewer')
    );
    await assertSucceeds(getDocs(viewerQuery));

    // Query for user_owner's own memberships
    const ownerQuery = query(
      collectionGroup(ownerDb, 'members'),
      where('userId', '==', 'user_owner')
    );
    await assertSucceeds(getDocs(ownerQuery));
  });

  it('collection group query for members without filter or for another user fails', async () => {
    const viewerDb = testEnv.authenticatedContext('user_viewer').firestore();

    // Unfiltered collection group query fails
    const unfilteredQuery = query(collectionGroup(viewerDb, 'members'));
    await assertFails(getDocs(unfilteredQuery));

    // Query for another user's memberships fails
    const foreignQuery = query(
      collectionGroup(viewerDb, 'members'),
      where('userId', '==', 'user_owner')
    );
    await assertFails(getDocs(foreignQuery));
  });
});

describe('Firestore Security Rules: Strict Zero-Client-Write Enforcement', () => {
  it('nobody (including the owner) can create, update, or delete farms', async () => {
    const ownerDb = testEnv.authenticatedContext('user_owner').firestore();
    const viewerDb = testEnv.authenticatedContext('user_viewer').firestore();

    // Owner create farm -> DENIED
    await assertFails(
      setDoc(doc(ownerDb, 'farms', 'farm_malicious'), {
        name: 'Hacked Farm',
        ownerId: 'user_owner',
      })
    );

    // Owner update farm -> DENIED
    await assertFails(
      updateDoc(doc(ownerDb, 'farms', 'farm_alpha'), {
        name: 'Updated Name',
      })
    );

    // Owner delete farm -> DENIED
    await assertFails(deleteDoc(doc(ownerDb, 'farms', 'farm_alpha')));

    // Viewer mutate farm -> DENIED
    await assertFails(deleteDoc(doc(viewerDb, 'farms', 'farm_alpha')));
  });

  it('nobody can write, update, or delete devices, latest, readings, commands, alerts, or schedules', async () => {
    const ownerDb = testEnv.authenticatedContext('user_owner').firestore();

    // Create / update device
    await assertFails(
      setDoc(doc(ownerDb, 'farms', 'farm_alpha', 'devices', 'dev_new'), {
        nodeId: 4,
        name: 'Rogue Device',
      })
    );
    await assertFails(
      updateDoc(doc(ownerDb, 'farms', 'farm_alpha', 'devices', 'dev_alpha'), {
        status: 'offline',
      })
    );

    // Create latest telemetry snapshot
    await assertFails(
      setDoc(doc(ownerDb, 'farms', 'farm_alpha', 'devices', 'dev_alpha', 'latest', 'current'), {
        temperature: 999,
      })
    );

    // Inject fake daily telemetry reading
    await assertFails(
      setDoc(
        doc(ownerDb, 'farms', 'farm_alpha', 'devices', 'dev_alpha', 'readings_2026_10_29', 'seq_fake'),
        { temperature: 999 }
      )
    );

    // Create command record
    await assertFails(
      setDoc(doc(ownerDb, 'farms', 'farm_alpha', 'devices', 'dev_alpha', 'commands', 'cmd_fake'), {
        action: 'PUMP_ON',
      })
    );

    // Create / acknowledge alert
    await assertFails(
      setDoc(doc(ownerDb, 'farms', 'farm_alpha', 'alerts', 'alert_fake'), {
        type: 'FAKE',
      })
    );
    await assertFails(
      updateDoc(doc(ownerDb, 'farms', 'farm_alpha', 'alerts', 'alert_1'), {
        acknowledged: true,
      })
    );

    // Create / mutate schedule
    await assertFails(
      setDoc(doc(ownerDb, 'farms', 'farm_alpha', 'schedules', 'sched_fake'), {
        time: '12:00',
      })
    );

    // Create / mutate members
    await assertFails(
      setDoc(doc(ownerDb, 'farms', 'farm_alpha', 'members', 'user_malicious'), {
        role: 'owner',
      })
    );

    // Mutate user profile
    await assertFails(
      updateDoc(doc(ownerDb, 'users', 'user_owner'), {
        displayName: 'Hacked Name',
      })
    );
  });
});

