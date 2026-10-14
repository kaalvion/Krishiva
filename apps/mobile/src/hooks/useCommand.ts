import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCommand, issueCommand } from '../services/api';
import type {
  CommandRecord,
  IssueCommandInput,
  IssueCommandResponse,
} from '../types';

export const FINAL_STATUSES = ['acknowledged', 'failed', 'expired'] as const;

export interface UseCommandPollingOptions {
  enabled?: boolean;
  maxPollSeconds?: number;
  onSettled?: (finalRecord: CommandRecord) => void;
}

/**
 * Hook to poll command status every 1.5s until final or timeout (default 40s).
 */
export function useCommandStatus(
  commandId: string | null | undefined,
  farmId: string | null | undefined,
  deviceId: string | null | undefined,
  options: UseCommandPollingOptions = {}
) {
  const { maxPollSeconds = 40, onSettled } = options;
  const [startTime] = useState<number>(() => Date.now());
  const [isTimedOut, setIsTimedOut] = useState<boolean>(false);
  const settledCalledRef = useRef<boolean>(false);

  const query = useQuery<CommandRecord>({
    queryKey: ['command', farmId, deviceId, commandId],
    queryFn: () => getCommand(commandId!, farmId!, deviceId!),
    enabled: Boolean(commandId) && Boolean(farmId) && Boolean(deviceId) && !isTimedOut,
    refetchInterval: (queryResult) => {
      if (isTimedOut) return false;

      const record = queryResult.state.data;
      if (!record) return 1500;

      // Stop polling once acknowledged, failed, or expired
      if (FINAL_STATUSES.includes(record.status as (typeof FINAL_STATUSES)[number])) {
        return false;
      }

      // Check if 40 seconds elapsed
      if (Date.now() - startTime > maxPollSeconds * 1000) {
        setIsTimedOut(true);
        return false;
      }

      return 1500; // Poll every 1.5s
    },
    staleTime: 0,
  });

  // Call onSettled callback when terminal state reached
  useEffect(() => {
    if (query.data && !settledCalledRef.current) {
      if (FINAL_STATUSES.includes(query.data.status as (typeof FINAL_STATUSES)[number])) {
        settledCalledRef.current = true;
        onSettled?.(query.data);
      }
    }
  }, [query.data, onSettled]);

  return {
    ...query,
    isTimedOut,
  };
}

/**
 * Mutation hook to issue an actuator command and invalidate farm commands query.
 */
export function useIssueCommand() {
  const queryClient = useQueryClient();

  return useMutation<IssueCommandResponse, Error, IssueCommandInput>({
    mutationFn: (data: IssueCommandInput) => issueCommand(data),
    onSuccess: (_, variables) => {
      // Invalidate recent commands for farm
      queryClient.invalidateQueries({
        queryKey: ['farmCommands', variables.farmId],
      });
    },
  });
}
