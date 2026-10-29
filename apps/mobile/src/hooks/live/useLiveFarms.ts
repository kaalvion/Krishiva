import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collectionGroup,
  query,
  where,
  onSnapshot,
  getDoc,
  doc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { loadSnapshot, saveSnapshot } from '../../services/snapshotCache';
import { useIsScreenFocused } from '../useIsScreenFocused';
import type { Farm, FarmRole } from '../../types';

export interface UseLiveFarmsResult {
  farms: Farm[];
  loading: boolean;
  error: Error | null;
  fromCache: boolean;
  lastSyncedAt: string | null;
  refetch: () => void;
}

export function useLiveFarms(): UseLiveFarmsResult {
  const isFocused = useIsScreenFocused();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const currentUser = auth.currentUser;
  const uid = currentUser?.uid;

  // Load cached snapshot on startup / mount
  useEffect(() => {
    if (!uid) return;
    loadSnapshot<Farm[]>(uid, 'farms').then((cached) => {
      if (cached && cached.data) {
        setFarms((prev) => (prev.length === 0 ? cached.data : prev));
        setFromCache(true);
        setLastSyncedAt(cached.savedAt);
        setLoading(false);
      }
    });
  }, [uid]);

  const subscribe = useCallback(() => {
    if (!uid || !isFocused) {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return;
    }

    try {
      const q = query(
        collectionGroup(db, 'members'),
        where('userId', '==', uid)
      );

      unsubscribeRef.current = onSnapshot(
        q,
        async (snapshot) => {
          try {
            const memberDocs = snapshot.docs;
            const farmPromises = memberDocs.map(async (mDoc) => {
              const farmRef = mDoc.ref.parent.parent;
              if (!farmRef) return null;

              const memberData = mDoc.data();
              const farmSnap = await getDoc(farmRef);
              if (!farmSnap.exists()) return null;

              const farmData = farmSnap.data();
              const farm: Farm = {
                id: farmSnap.id,
                name: farmData.name ?? 'Unnamed Farm',
                ownerId: farmData.ownerId,
                areaAcres: farmData.areaAcres ?? 0,
                cropType: farmData.cropType ?? 'Other',
                location: farmData.location ?? { lat: 0, lng: 0 },
                timezone: farmData.timezone ?? 'Asia/Kolkata',
                role: (memberData.role as FarmRole) ?? 'viewer',
                createdAt: farmData.createdAt,
                updatedAt: farmData.updatedAt,
              };
              return farm;
            });

            const resolvedFarms = (await Promise.all(farmPromises)).filter(
              (f): f is Farm => f !== null
            );

            // Sort alphabetically by name
            resolvedFarms.sort((a, b) => a.name.localeCompare(b.name));

            setFarms(resolvedFarms);
            setLoading(false);
            setFromCache(false);
            setError(null);
            const now = new Date().toISOString();
            setLastSyncedAt(now);

            // Persist to offline snapshot cache
            await saveSnapshot(uid, 'farms', resolvedFarms);
          } catch (fetchErr) {
            setError(fetchErr instanceof Error ? fetchErr : new Error(String(fetchErr)));
            setLoading(false);
          }
        },
        (snapErr) => {
          // Gracefully fallback to cache on permission or network errors
          setError(snapErr);
          setLoading(false);
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    }
  }, [uid, isFocused]);

  useEffect(() => {
    subscribe();
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [subscribe]);

  const refetch = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    setLoading(true);
    subscribe();
  }, [subscribe]);

  return {
    farms,
    loading,
    error,
    fromCache,
    lastSyncedAt,
    refetch,
  };
}

