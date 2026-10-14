import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Plus,
  Clock,
  Cpu,
  Calendar,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  Layers,
} from 'lucide-react-native';
import { useActiveFarm } from '../../../src/context/FarmContext';
import { useDevices } from '../../../src/hooks/useDevices';
import {
  useSchedules,
  useUpdateSchedule,
} from '../../../src/hooks/useSchedules';
import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';
import { ErrorView } from '../../../src/components/ErrorView';
import { LoadingView } from '../../../src/components/LoadingView';
import { colors } from '../../../src/theme/colors';
import type { Schedule, ScheduleDays, ActuatorAction } from '../../../src/types';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatTime12h(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return time24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  const minStr = m < 10 ? `0${m}` : `${m}`;
  return `${hour12}:${minStr} ${ampm}`;
}

export function formatReadableAction(
  action: ActuatorAction,
  durationSeconds?: number | null
): string {
  const isPump = action.startsWith('PUMP');
  const isValve = action.startsWith('VALVE');
  const isLight = action.startsWith('LIGHT');
  const isSiren = action.startsWith('SIREN');
  const isOn = action.endsWith('_ON');

  const target = isPump ? 'Pump' : isValve ? 'Valve' : isLight ? 'Light' : isSiren ? 'Siren' : action;

  if (isOn) {
    if (durationSeconds && durationSeconds > 0) {
      const mins = Math.round(durationSeconds / 60);
      return `${target} ON for ${mins} min`;
    }
    return `${target} ON`;
  }
  return `${target} OFF`;
}

export function formatRelativeTime(timestamp: string): string {
  try {
    const now = Date.now();
    const past = new Date(timestamp).getTime();
    const diffSec = Math.floor((now - past) / 1000);

    if (isNaN(diffSec) || diffSec < 0) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDays = Math.floor(diffHour / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    const d = new Date(timestamp);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return timestamp;
  }
}

export default function ScheduleScreen() {
  const router = useRouter();
  const { activeFarm } = useActiveFarm();
  const farmId = activeFarm?.id;

  const isOwnerOrAdmin = activeFarm?.role === 'owner' || activeFarm?.role === 'admin';

  const {
    data: schedules,
    isLoading: schedulesLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useSchedules(farmId);

  const { data: devices } = useDevices(farmId);
  const updateScheduleMutation = useUpdateSchedule(farmId);

  // Device lookup map
  const deviceMap = useMemo(() => {
    const map = new Map<string, string>();
    if (devices) {
      for (const d of devices) {
        map.set(d.id, d.name);
      }
    }
    return map;
  }, [devices]);

  // Sort schedules by time ascending ("06:00" < "18:00")
  const sortedSchedules = useMemo(() => {
    if (!schedules) return [];
    return [...schedules].sort((a, b) => a.time.localeCompare(b.time));
  }, [schedules]);

  const handleToggle = (schedule: Schedule, newValue: boolean) => {
    if (!isOwnerOrAdmin) return;
    updateScheduleMutation.mutate({
      scheduleId: schedule.id,
      data: { enabled: newValue },
    });
  };

  const handleEdit = (schedule: Schedule) => {
    if (!isOwnerOrAdmin) return;
    router.push({
      pathname: '/(app)/(farm)/schedule-edit',
      params: { scheduleId: schedule.id },
    });
  };

  const handleAddSchedule = () => {
    router.push('/(app)/(farm)/schedule-edit');
  };

  const renderScheduleCard = ({ item }: { item: Schedule }) => {
    const devName = deviceMap.get(item.deviceId) || `Device ${item.deviceId.slice(0, 8)}`;
    const readableAction = formatReadableAction(item.action, item.durationSeconds);
    const time12 = formatTime12h(item.time);
    const displayTitle = item.name || `${readableAction} at ${time12}`;

    const isDaily = item.days === 'daily';
    const dayIndices = Array.isArray(item.days) ? item.days : [];

    const hasLastRun = Boolean(item.lastRunAt);
    const lastRunStatus = item.lastRunStatus || 'issued';

    return (
      <TouchableOpacity
        activeOpacity={isOwnerOrAdmin ? 0.7 : 1}
        onPress={() => isOwnerOrAdmin && handleEdit(item)}
      >
        <Card style={[styles.card, !item.enabled && styles.cardDisabled]}>
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <Text
                style={[styles.cardTitle, !item.enabled && styles.textDisabled]}
                numberOfLines={1}
              >
                {displayTitle}
              </Text>
              <View style={styles.metaRow}>
                <Cpu size={12} color={colors.textMuted} />
                <Text style={styles.deviceName} numberOfLines={1}>
                  {devName}
                </Text>
                <Text style={styles.dotSeparator}>•</Text>
                <Text style={styles.actionBadge}>{readableAction}</Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              <Switch
                value={item.enabled}
                onValueChange={(val) => handleToggle(item, val)}
                disabled={!isOwnerOrAdmin}
                trackColor={{ false: '#D1D5DB', true: colors.primaryLight }}
                thumbColor={item.enabled ? colors.primary : '#9CA3AF'}
              />
            </View>
          </View>

          {/* Time & Days Row */}
          <View style={styles.timeAndDaysRow}>
            <View style={styles.timeBadge}>
              <Clock size={14} color={colors.primaryDark} />
              <Text style={styles.timeText}>{time12}</Text>
            </View>

            <View style={styles.dayChipsContainer}>
              {isDaily ? (
                <View style={styles.dailyChip}>
                  <Text style={styles.dailyChipText}>Daily</Text>
                </View>
              ) : (
                dayIndices.map((dayIdx) => (
                  <View key={dayIdx} style={styles.dayChip}>
                    <Text style={styles.dayChipText}>{DAY_LABELS[dayIdx]}</Text>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* Last run status info */}
          {hasLastRun && (
            <View style={styles.lastRunRow}>
              {lastRunStatus === 'issued' ? (
                <CheckCircle2 size={13} color={colors.success} />
              ) : lastRunStatus === 'error' ? (
                <XCircle size={13} color={colors.error} />
              ) : (
                <Info size={13} color={colors.textMuted} />
              )}
              <Text style={styles.lastRunText}>
                Last run: {formatRelativeTime(item.lastRunAt!)} •{' '}
                <Text
                  style={{
                    fontWeight: '700',
                    color:
                      lastRunStatus === 'issued'
                        ? colors.success
                        : lastRunStatus === 'error'
                        ? colors.error
                        : colors.textMuted,
                  }}
                >
                  {lastRunStatus.toUpperCase()}
                </Text>
              </Text>
            </View>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  if (!activeFarm) {
    return (
      <View style={styles.noFarmContainer}>
        <EmptyState
          icon={<Layers size={32} color={colors.primary} />}
          title="No Farm Selected"
          description="Please select a farm to manage irrigation schedules."
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Bar with Timezone Note & Add Button */}
      <View style={styles.topBar}>
        <View style={styles.topBarInfo}>
          <Text style={styles.timezoneNote}>
            Times use the farm's timezone ({activeFarm.timezone || 'Asia/Kolkata'})
          </Text>
          {!isOwnerOrAdmin && (
            <Text style={styles.viewerNotice}>
              Only owners and admins can change schedules
            </Text>
          )}
        </View>

        {isOwnerOrAdmin && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddSchedule}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Add New Schedule"
          >
            <Plus size={18} color={colors.textInverse} />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main Content */}
      {schedulesLoading ? (
        <LoadingView label="Loading irrigation schedules..." />
      ) : isError ? (
        <ErrorView
          message={error instanceof Error ? error.message : 'Failed to load schedules'}
          onRetry={refetch}
        />
      ) : (
        <FlatList
          data={sortedSchedules}
          keyExtractor={(item) => item.id}
          renderItem={renderScheduleCard}
          contentContainerStyle={[
            styles.listContent,
            sortedSchedules.length === 0 && styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<Calendar size={40} color={colors.primary} />}
              title="No schedules yet"
              description="Automate pump, valve, and light timers with scheduled cycles."
              actionTitle={isOwnerOrAdmin ? 'Add Schedule' : undefined}
              onAction={isOwnerOrAdmin ? handleAddSchedule : undefined}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  noFarmContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  topBarInfo: {
    flex: 1,
    marginRight: 12,
  },
  timezoneNote: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  viewerNotice: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textInverse,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    padding: 16,
    borderRadius: 14,
  },
  cardDisabled: {
    opacity: 0.65,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    marginRight: 10,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  textDisabled: {
    color: colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  deviceName: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  dotSeparator: {
    fontSize: 12,
    color: colors.textMuted,
  },
  actionBadge: {
    fontSize: 11,
    color: colors.primaryDark,
    backgroundColor: colors.primarySurface,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    fontWeight: '600',
  },
  timeAndDaysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: 8,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySurface,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  dayChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  dailyChip: {
    backgroundColor: '#EEF2EE',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  dailyChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  dayChip: {
    backgroundColor: '#EEF2EE',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 5,
  },
  dayChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  lastRunRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  lastRunText: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
