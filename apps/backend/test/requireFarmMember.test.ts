import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { firestore, initFirebase } from '../src/plugins/firebase.js';
import { requireFarmMember, HttpError } from '../src/modules/farms/farms.helper.js';

describe('requireFarmMember Authorization Helper', () => {
  const farmId = 'testFarmAuthHelper';
  const ownerUid = 'userOwner1';
  const viewerUid = 'userViewer1';
  const strangerUid = 'userStranger1';

  beforeAll(async () => {
    initFirebase();

    // Setup farm and test members
    const batch = firestore().batch();
    batch.set(firestore().doc(`farms/${farmId}`), {
      name: 'Helper Test Farm',
      ownerId: ownerUid,
      createdAt: new Date().toISOString(),
    });
    batch.set(firestore().doc(`farms/${farmId}/members/${ownerUid}`), {
      userId: ownerUid,
      role: 'owner',
      displayName: 'Farm Owner',
    });
    batch.set(firestore().doc(`farms/${farmId}/members/${viewerUid}`), {
      userId: viewerUid,
      role: 'viewer',
      displayName: 'Farm Viewer',
    });
    await batch.commit();
  });

  afterAll(async () => {
    // Clean up
    await firestore().doc(`farms/${farmId}/members/${ownerUid}`).delete();
    await firestore().doc(`farms/${farmId}/members/${viewerUid}`).delete();
    await firestore().doc(`farms/${farmId}`).delete();
  });

  it('returns member role for authorized member', async () => {
    const result = await requireFarmMember(farmId, viewerUid, 'viewer');
    expect(result.role).toBe('viewer');
    expect(result.displayName).toBe('Farm Viewer');
  });

  it('returns 403 for non-member', async () => {
    await expect(requireFarmMember(farmId, strangerUid, 'viewer')).rejects.toThrow(
      HttpError
    );
    try {
      await requireFarmMember(farmId, strangerUid, 'viewer');
    } catch (err: any) {
      expect(err.statusCode).toBe(403);
    }
  });

  it('returns 403 when user lacks required role privilege', async () => {
    // viewerUid trying to access an admin-level operation
    try {
      await requireFarmMember(farmId, viewerUid, 'admin');
      expect.fail('Should have thrown HttpError 403');
    } catch (err: any) {
      expect(err.statusCode).toBe(403);
      expect(err.message).toContain('permissions');
    }
  });

  it('owner satisfies admin minimum role requirement', async () => {
    const result = await requireFarmMember(farmId, ownerUid, 'admin');
    expect(result.role).toBe('owner');
  });
});
