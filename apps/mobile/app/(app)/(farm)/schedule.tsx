import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Plus,
  Clock,
  Radio,
  Calendar,
  CheckCircle2,
  XCircle,
  Layers,
  ChevronRight,
  Droplets,
  PowerOff,
  Sliders,
  Sun,
  Moon,
  Bell,
  MapPin,
  ArrowUpRight,
} from 'lucide-react-native';
import { useActiveFarm } from '../../../src/context/FarmContext';
import { useServerStatus, ServerStatusBanner } from '../../../src/context/ServerStatusContext';
import { useLiveDevices, useLiveSchedules } from '../../../src/hooks/live';
import { useUpdateSchedule } from '../../../src/hooks/useSchedules';
import { EmptyState } from '../../../src/components/EmptyState';
import { ErrorView } from '../../../src/components/ErrorView';
import { LoadingView } from '../../../src/components/LoadingView';
import type { Schedule, ActuatorAction } from '../../../src/types';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatTime12h(time24: string): string {
  const [hStr, mStr] = (time24 || '06:00').split(':');
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
  const { serverOnline } = useServerStatus();
  const farmId = activeFarm?.id;

  const isOwnerOrAdmin = activeFarm?.role === 'owner' || activeFarm?.role === 'admin';

  // Live Firestore schedules
  const {
    schedules,
    loading: schedulesLoading,
    error: schedulesErr,
    refresh: refreshSchedules,
  } = useLiveSchedules(farmId);

  const {
    devices,
    refresh: refreshDevices,
  } = useLiveDevices(farmId);

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

  // Sort schedules by time ascending
  const sortedSchedules = useMemo(() => {
    if (!schedules) return [];
    return [...schedules].sort((a, b) => a.time.localeCompare(b.time));
  }, [schedules]);

  const handleRefresh = async () => {
    refreshSchedules();
    refreshDevices();
  };

  const handleToggle = (schedule: Schedule, newValue: boolean) => {
    if (!serverOnline) {
      Alert.alert('Notice', 'Updating schedule offline status...');
    }
    updateScheduleMutation.mutate({
      scheduleId: schedule.id,
      data: { enabled: newValue },
    });
  };

  const handleEdit = (schedule: Schedule) => {
    router.push({
      pathname: '/(app)/(farm)/schedule-edit',
      params: { scheduleId: schedule.id },
    });
  };

  const handleAddSchedule = () => {
    router.push('/(app)/(farm)/schedule-edit');
  };

  const getActionIcon = (action: ActuatorAction) => {
    if (action.startsWith('PUMP')) return <Droplets size={20} color="#161e00" />;
    if (action.startsWith('VALVE')) return <Sliders size={20} color="#161e00" />;
    if (action.startsWith('LIGHT')) return <Sun size={20} color="#161e00" />;
    if (action.startsWith('SIREN')) return <Bell size={20} color="#161e00" />;
    return <Clock size={20} color="#161e00" />;
  };

  const renderScheduleCard = ({ item }: { item: Schedule }) => {
    const devName = deviceMap.get(item.deviceId) || `GSM Master Controller`;
    const readableAction = formatReadableAction(item.action, item.durationSeconds);
    const time12 = formatTime12h(item.time);
    const displayTitle = item.name || `${readableAction} at ${time12}`;

    const isDaily = item.days === 'daily';
    const dayIndices = Array.isArray(item.days) ? item.days : [];
    const hasLastRun = Boolean(item.lastRunAt);
    const lastRunStatus = item.lastRunStatus || 'issued';

    return (
      <TouchableOpacity
        style={[styles.scheduleCard, !item.enabled && styles.cardDisabled]}
        onPress={() => handleEdit(item)}
        activeOpacity={0.85}
      >
        {/* Top Row: Icon + Title + Toggle Switch */}
        <View style={styles.cardTopRow}>
          <View style={styles.cardTopLeft}>
            <View style={styles.actionIconCircle}>
              {getActionIcon(item.action)}
            </View>
            <View style={styles.cardTitleCol}>
              <Text
                style={[styles.cardTitle, !item.enabled && styles.textDisabled]}
                numberOfLines={1}
              >
                {displayTitle}
              </Text>
              <Text style={styles.cardSubtext} numberOfLines={1}>
                {devName} • {readableAction}
              </Text>
            </View>
          </View>

          {/* Toggle Switch */}
          <TouchableOpacity
            style={[
              styles.switchTrack,
              item.enabled ? styles.switchTrackOn : styles.switchTrackOff,
            ]}
            onPress={(e) => {
              e.stopPropagation();
              handleToggle(item, !item.enabled);
            }}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.switchThumb,
                item.enabled ? styles.switchThumbOn : styles.switchThumbOff,
              ]}
            />
          </TouchableOpacity>
        </View>

        {/* Middle Row: Execution Time & Day Badges */}
        <View style={styles.timeAndDaysRow}>
          <View style={styles.timeBadge}>
            <Clock size={13} color="#191c1b" />
            <Text style={styles.timeBadgeText}>{time12}</Text>
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

          <View style={styles.editArrowButton}>
            <ArrowUpRight size={16} color="#556253" />
          </View>
        </View>

        {/* Bottom Row: Last run status */}
        <View style={styles.lastRunRow}>
          {lastRunStatus === 'issued' ? (
            <CheckCircle2 size={13} color="#516600" />
          ) : lastRunStatus === 'error' ? (
            <XCircle size={13} color="#ba1a1a" />
          ) : (
            <Clock size={13} color="#556253" />
          )}
          <Text style={styles.lastRunText}>
            {hasLastRun
              ? `Last run: ${formatRelativeTime(item.lastRunAt!)} • `
              : 'Scheduled • '}
            <Text
              style={{
                fontFamily: 'Manrope_700Bold',
                color:
                  lastRunStatus === 'issued'
                    ? '#516600'
                    : lastRunStatus === 'error'
                    ? '#ba1a1a'
                    : '#556253',
              }}
            >
              {lastRunStatus.toUpperCase()}
            </Text>
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerBlock}>
      <ServerStatusBanner />

      {/* Screen Context Banner */}
      <View style={styles.contextHeader}>
        <View style={styles.contextLeft}>
          <View style={styles.titleRow}>
            <Text style={styles.screenTitle}>SCHEDULES</Text>
            <View style={styles.liveHubBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.liveHubText}>LIVE SCHEDULER</Text>
            </View>
          </View>
          <View style={styles.locationRow}>
            <MapPin size={13} color="#516600" />
            <Text style={styles.locationText}>
              {activeFarm?.name || 'Green Valley Farms'} • {sortedSchedules.length} Automations Active
            </Text>
          </View>
        </View>
      </View>

      {/* Timezone Sync Banner */}
      <View style={styles.timezoneBanner}>
        <View style={styles.timezoneIconCircle}>
          <Clock size={18} color="#516600" />
        </View>
        <Text style={styles.timezoneText}>
          Times follow the farm’s automated local timezone{' '}
          <Text style={styles.timezoneBold}>
            ({activeFarm?.timezone || 'Asia/Kolkata, UTC+5:30'}).
          </Text>
        </Text>
      </View>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footerBlock}>
      {/* Add New Schedule Card Button */}
      <TouchableOpacity
        style={styles.addScheduleCard}
        onPress={handleAddSchedule}
        activeOpacity={0.85}
      >
        <View style={styles.addIconCircle}>
          <Plus size={22} color="#161e00" />
        </View>
        <View style={styles.addTextColumn}>
          <Text style={styles.addTitle}>+ Add New Automation Schedule</Text>
          <Text style={styles.addSubtitle}>
            Configure timing, target device and run duration
          </Text>
        </View>
        <ChevronRight size={20} color="#556253" />
      </TouchableOpacity>
    </View>
  );

  if (!activeFarm) {
    return (
      <View style={styles.noFarmContainer}>
        <EmptyState
          icon={<Layers size={32} color="#516600" />}
          title="No Farm Selected"
          description="Please select a farm to manage irrigation schedules."
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {schedulesLoading && sortedSchedules.length === 0 ? (
        <LoadingView label="Loading irrigation schedules..." />
      ) : schedulesErr && sortedSchedules.length === 0 ? (
        <ErrorView
          message={schedulesErr instanceof Error ? schedulesErr.message : 'Failed to load schedules'}
          onRetry={handleRefresh}
        />
      ) : (
        <FlatList
          data={sortedSchedules}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          renderItem={renderScheduleCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={handleRefresh}
              tintColor="#C6E85A"
              colors={['#C6E85A']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <EmptyState
                icon={<Calendar size={32} color="#516600" />}
                title="No Schedules Yet"
                description="Tap below to set up your first automatic pump or valve schedule."
              />
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9faf8',
  },
  noFarmContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#f9faf8',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  headerBlock: {
    marginBottom: 8,
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 6,
  },
  contextLeft: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  screenTitle: {
    fontSize: 24,
    fontFamily: 'Manrope_300Light',
    color: '#191c1b',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  liveHubBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#C6E85A',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 99,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#516600',
  },
  liveHubText: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    color: '#161e00',
    letterSpacing: 0.8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
  },
  timezoneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(211, 225, 166, 0.4)',
    padding: 12,
    borderRadius: 16,
    marginBottom: 14,
  },
  timezoneIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  timezoneText: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    color: '#454937',
    flex: 1,
    lineHeight: 17,
  },
  timezoneBold: {
    fontFamily: 'Manrope_700Bold',
    color: '#191c1b',
  },
  scheduleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  cardDisabled: {
    opacity: 0.75,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  actionIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#C6E85A',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitleCol: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
  },
  textDisabled: {
    color: '#757965',
  },
  cardSubtext: {
    fontSize: 11,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
    marginTop: 2,
  },
  switchTrack: {
    width: 48,
    height: 26,
    borderRadius: 13,
    padding: 2,
    justifyContent: 'center',
  },
  switchTrackOn: {
    backgroundColor: '#C6E85A',
    alignItems: 'flex-end',
  },
  switchTrackOff: {
    backgroundColor: '#e2e3e1',
    alignItems: 'flex-start',
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbOn: {
    backgroundColor: '#1E2A1E',
  },
  switchThumbOff: {
    backgroundColor: '#ffffff',
  },
  timeAndDaysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f2',
    marginTop: 2,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f3f4f2',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 99,
  },
  timeBadgeText: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    color: '#191c1b',
  },
  dayChipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  dailyChip: {
    backgroundColor: 'rgba(211, 225, 166, 0.45)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 99,
  },
  dailyChipText: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    color: '#404b1f',
  },
  dayChip: {
    backgroundColor: '#f3f4f2',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 99,
  },
  dayChipText: {
    fontSize: 10,
    fontFamily: 'Manrope_600SemiBold',
    color: '#556253',
  },
  editArrowButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f3f4f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastRunRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  lastRunText: {
    fontSize: 11,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
  },
  footerBlock: {
    marginTop: 6,
    marginBottom: 20,
  },
  addScheduleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  addIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#C6E85A',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  addTextColumn: {
    flex: 1,
  },
  addTitle: {
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
  },
  addSubtitle: {
    fontSize: 11,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
    marginTop: 2,
  },
  emptyContainer: {
    paddingVertical: 20,
  },
});
