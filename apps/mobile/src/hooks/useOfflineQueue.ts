import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActuatorAction } from '../types';

export interface QueuedCommand {
  id: string;
  farmId: string;
  deviceId: string;
  action: ActuatorAction;
  durationSeconds?: number;
  label: string;
  createdAt: string;
}

const STORAGE_KEY = '@krishiva_offline_queue';

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedCommand[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Load from AsyncStorage
  const loadQueue = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setQueue(Array.isArray(parsed) ? parsed : []);
      } else {
        setQueue([]);
      }
    } catch {
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Save to AsyncStorage
  const persistQueue = async (nextQueue: QueuedCommand[]) => {
    setQueue(nextQueue);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextQueue));
    } catch (err) {
      console.warn('Failed to save offline queue', err);
    }
  };

  // Add command to offline queue
  const queueCommand = useCallback(
    async (cmd: {
      farmId: string;
      deviceId: string;
      action: ActuatorAction;
      durationSeconds?: number;
      label?: string;
    }) => {
      const newCmd: QueuedCommand = {
        id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        farmId: cmd.farmId,
        deviceId: cmd.deviceId,
        action: cmd.action,
        durationSeconds: cmd.durationSeconds,
        label: cmd.label || `${cmd.action.replace('_', ' ')} (${cmd.deviceId})`,
        createdAt: new Date().toISOString(),
      };

      const next = [...queue, newCmd];
      await persistQueue(next);
      return newCmd;
    },
    [queue]
  );

  // Remove single command
  const removeCommand = useCallback(
    async (id: string) => {
      const next = queue.filter((item) => item.id !== id);
      await persistQueue(next);
    },
    [queue]
  );

  // Clear all
  const clearQueue = useCallback(async () => {
    await persistQueue([]);
  }, []);

  // Process all queued commands when reconnecting
  const processQueue = useCallback(
    async (executor: (cmd: QueuedCommand) => Promise<any>) => {
      if (queue.length === 0 || isProcessing) return { processed: 0, failed: 0 };
      setIsProcessing(true);

      const remaining: QueuedCommand[] = [];
      let processed = 0;
      let failed = 0;

      for (const cmd of queue) {
        try {
          await executor(cmd);
          processed++;
        } catch (err) {
          console.warn('Offline command execution failed:', err);
          remaining.push(cmd);
          failed++;
        }
      }

      await persistQueue(remaining);
      setIsProcessing(false);
      return { processed, failed };
    },
    [queue, isProcessing]
  );

  return {
    queue,
    queueCount: queue.length,
    loading,
    isProcessing,
    queueCommand,
    removeCommand,
    clearQueue,
    processQueue,
    reloadQueue: loadQueue,
  };
}
