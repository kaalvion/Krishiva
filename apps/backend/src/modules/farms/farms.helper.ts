import { firestore } from '../../plugins/firebase.js';

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'HttpError';
  }
}

export type FarmRole = 'owner' | 'admin' | 'viewer';

const roleRank: Record<FarmRole, number> = {
  viewer: 1,
  admin: 2,
  owner: 3,
};

/**
 * Shared helper to verify that a user is an active member of the specified farm
 * with at least the required role privilege.
 * 
 * @param farmId Farm identifier
 * @param uid User ID from verified token
 * @param minRole Minimum acceptable role ('viewer' | 'admin' | 'owner')
 * @returns Member role and displayName
 * @throws HttpError 403 if the user is not a member or lacks sufficient privileges
 */
export async function requireFarmMember(
  farmId: string,
  uid: string,
  minRole: FarmRole = 'viewer'
): Promise<{ role: FarmRole; displayName?: string }> {
  if (!farmId || !uid) {
    throw new HttpError(403, 'Forbidden: Missing farmId or user context');
  }

  const memberDoc = await firestore()
    .doc(`farms/${farmId}/members/${uid}`)
    .get();

  if (!memberDoc.exists) {
    throw new HttpError(403, 'Forbidden: You are not a member of this farm');
  }

  const memberData = memberDoc.data();
  const role = memberData?.role as FarmRole;

  if (!role || (roleRank[role] ?? 0) < (roleRank[minRole] ?? 0)) {
    throw new HttpError(
      403,
      `Forbidden: Requires at least "${minRole}" permissions for this farm`
    );
  }

  return {
    role,
    displayName: memberData?.displayName,
  };
}
