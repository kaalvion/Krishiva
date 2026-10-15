import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  type CommandRecord,
  type IssueCommandInput,
  type IssueCommandResponse,
} from '../types';

export function useCommands(farmId: string | undefined, limit = 50, refetchInterval = 10000) {
  return useQuery<CommandRecord[]>({
    queryKey: ['commands', farmId, limit],
    queryFn: () => api.getCommandsHistory(farmId!, limit),
    enabled: !!farmId,
    refetchInterval,
  });
}

export function useIssueCommand() {
  const queryClient = useQueryClient();
  return useMutation<IssueCommandResponse, Error, IssueCommandInput>({
    mutationFn: (input: IssueCommandInput) => api.issueCommand(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['commands', variables.farmId] });
    },
  });
}

/**
 * Polls command status every 1.5s until final status ('acknowledged', 'failed', 'expired')
 * or until the 40-second timeout expires.
 */
export function useCommandPoll(
  commandId: string | null,
  farmId: string | undefined,
  deviceId: string | undefined,
  enabled: boolean
) {
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isTimedOut, setIsTimedOut] = useState(false);

  useEffect(() => {
    if (enabled && commandId) {
      setStartTime(Date.now());
      setIsTimedOut(false);
    } else {
      setStartTime(null);
      setIsTimedOut(false);
    }
  }, [enabled, commandId]);

  const query = useQuery<CommandRecord>({
    queryKey: ['commandStatus', commandId, farmId, deviceId],
    queryFn: () => api.getCommandStatus(commandId!, farmId!, deviceId!),
    enabled: enabled && !!commandId && !!farmId && !!deviceId && !isTimedOut,
    refetchInterval: (queryState) => {
      const data = queryState.state.data;
      if (!data) return 1500;
      if (['acknowledged', 'failed', 'expired'].includes(data.status)) {
        return false;
      }
      if (startTime && Date.now() - startTime >= 40000) {
        setIsTimedOut(true);
        return false;
      }
      return 1500;
    },
  });

  const isFinal =
    !!query.data && ['acknowledged', 'failed', 'expired'].includes(query.data.status);

  return {
    ...query,
    command: query.data,
    isFinal,
    isTimedOut,
  };
}
