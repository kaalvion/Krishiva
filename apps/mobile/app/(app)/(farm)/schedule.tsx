import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Plus,
  ArrowUpRight,
  Droplets,
  Sliders,
  Sun,
  Moon,
  Volume2,
  Clock,
  Calendar,
  Hourglass,
  Repeat,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react-native';
import { useActiveFarm } from '../../../src/context/FarmContext';
import { useServerStatus, ServerStatusBanner } from '../../../src/context/ServerStatusContext';
import { useLiveDevices, useLiveSchedules } from '../../../src/hooks/live';
import { useUpdateSchedule } from '../../../src/hooks/useSchedules';
import { LoadingView } from '../../../src/components/LoadingView';
import { ErrorView } from '../../../src/components/ErrorView';
import type { Schedule, ActuatorAction } from '../../../src/types';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatTimeParts(time24: string): { time: string; period: string } {
  const [hStr, mStr] = (time24 || '06:00').split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return { time: time24 || '06:00', period: 'AM' };
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  const minStr = m < 10 ? `0${m}` : `${m}`;
  const hourStr = hour12 < 10 ? `0${hour12}` : `${hour12}`;
  return { time: `${hourStr}:${minStr}`, period: ampm };
}

export function formatActionLabel(action: ActuatorAction): { label: string; icon: 'pump' | 'valve' | 'light' | 'siren' } {
  switch (action) {
    case 'PUMP_ON':
      return { label: 'Turn ON • Borewell Pump', icon: 'pump' };
    case 'PUMP_OFF':
      return { label: 'Turn OFF • Borewell Pump', icon: 'pump' };
    case 'VALVE_ON':
      return { label: 'Open Valve • Drip North', icon: 'valve' };
    case 'VALVE_OFF':
      return { label: 'Close Valve • Drip North', icon: 'valve' };
    case 'LIGHT_ON':
      return { label: 'Turn ON • Perimeter Flood', icon: 'light' };
    case 'LIGHT_OFF':
      return { label: 'Turn OFF • Perimeter Light', icon: 'light' };
    case 'SIREN_ON':
      return { label: 'Sonic Blast • Siren', icon: 'siren' };
    case 'SIREN_OFF':
      return { label: 'Disarm • Siren', icon: 'siren' };
    default:
      return { label: String(action).replace('_', ' '), icon: 'pump' };
  }
}

export default function ScheduleScreen() {
  const router = useRouter();
  const { activeFarm } = useActiveFarm();
  const { serverOnline } = useServerStatus();
  const farmId = activeFarm?.id;

  const [activeTab, setActiveTab] = useState<'active' | 'paused'>('active');

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

  // Device map
  const deviceMap = useMemo(() => {
    const map = new Map<string, string>();
    if (devices) {
      for (const d of devices) {
        map.set(d.id, d.name);
      }
    }
    return map;
  }, [devices]);

  // Sort schedules by time
  const sortedSchedules = useMemo(() => {
    if (!schedules) return [];
    return [...schedules].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }, [schedules]);

  // Active / Paused counts
  const activeCount = useMemo(() => {
    return sortedSchedules.filter((s) => s.enabled !== false).length;
  }, [sortedSchedules]);

  const pausedCount = sortedSchedules.length - activeCount;

  // Filtered list based on active tab
  const displayedSchedules = useMemo(() => {
    return sortedSchedules.filter((s) => {
      const isEnabled = s.enabled !== false;
      return activeTab === 'active' ? isEnabled : !isEnabled;
    });
  }, [sortedSchedules, activeTab]);

  // Next scheduled time
  const nextScheduledTime = useMemo(() => {
    const active = sortedSchedules.filter((s) => s.enabled !== false);
    if (active.length === 0) return 'None';
    const { time, period } = formatTimeParts(active[0].time);
    return `${time} ${period}`;
  }, [sortedSchedules]);

  // Week Calendar days (Sun -> Sat of current week)
  const weekDays = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const labels = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const days = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - currentDay + i);
      days.push({
        label: labels[i],
        date: d.getDate(),
        isToday: i === currentDay,
      });
    }
    return days;
  }, []);

  const handleRefresh = async () => {
    refreshSchedules();
    refreshDevices();
  };

  const handleToggle = (schedule: Schedule, newValue: boolean) => {
    updateScheduleMutation.mutate({
      scheduleId: schedule.id,
      data: { enabled: newValue },
    });
  };

  const handleEdit = (scheduleId: string) => {
    router.push({
      pathname: '/(app)/(farm)/schedule-edit',
      params: { scheduleId },
    });
  };

  const handleAddSchedule = () => {
    router.push('/(app)/(farm)/schedule-edit');
  };

  const renderActionIcon = (type: 'pump' | 'valve' | 'light' | 'siren', isEnabled: boolean) => {
    const color = isEnabled ? '#516600' : '#556253';
    switch (type) {
      case 'pump':
        return <Droplets size={16} color={color} />;
      case 'valve':
        return <Sliders size={16} color={color} />;
      case 'light':
        return <Sun size={16} color={color} />;
      case 'siren':
        return <Volume2 size={16} color={color} />;
    }
  };

  const renderScheduleCard = (item: Schedule) => {
    const isEnabled = item.enabled !== false;
    const { time, period } = formatTimeParts(item.time);
    const actionInfo = formatActionLabel(item.action);
    const devName = deviceMap.get(item.deviceId) || 'GSM Master Controller';

    const durationText = item.durationSeconds
      ? `${Math.round(item.durationSeconds / 60)} min`
      : item.action.includes('LIGHT')
      ? 'Till Dawn • 9h'
      : item.action.includes('SIREN')
      ? '30 sec pulse'
      : '15 min';

    const frequencyText =
      item.days === 'daily'
        ? 'Daily'
        : Array.isArray(item.days)
        ? item.days.map((d) => DAY_LABELS[d]).join(', ')
        : 'Daily';

    // Subtitle & Zone
    const zoneName = item.name?.includes('Sugarcane')
      ? 'SUGARCANE BLOCK • SECTOR 2'
      : item.name?.includes('Greenhouse') || item.name?.includes('Drip')
      ? 'CONTROLLED FLORA • POLYHOUSE'
      : item.name?.includes('Perimeter')
      ? 'BORDER SECURITY • RIDGE'
      : 'FAUNA PROTECTION • BOUNDARY 3';

    const rightPillText = isEnabled
      ? item.action.includes('LIGHT')
        ? 'Sunset Sensor Link'
        : item.name?.includes('Sugarcane')
        ? 'Est. 210L • Zone North'
        : 'Plot 4B • Low Pres. Safe'
      : 'Paused Manually';

    return (
      <View
        key={item.id}
        style={[
          styles.scheduleCard,
          !isEnabled && styles.scheduleCardPaused,
        ]}
      >
        {/* Header Row: Zone & Pill */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.zoneText}>{zoneName}</Text>
            <Text style={styles.scheduleTitle} numberOfLines={1}>
              {item.name || `${actionInfo.label} at ${time} ${period}`}
            </Text>
          </View>

          <View
            style={[
              styles.telemetryPill,
              !isEnabled && styles.telemetryPillPaused,
            ]}
          >
            <Text
              style={[
                styles.telemetryPillText,
                !isEnabled && styles.telemetryPillTextPaused,
              ]}
            >
              {rightPillText}
            </Text>
          </View>
        </View>

        {/* Time Row */}
        <View style={styles.timeRow}>
          <View style={styles.timeGroup}>
            <Text style={styles.timeLarge}>{time}</Text>
            <Text style={styles.timePeriod}>{period}</Text>
          </View>

          {isEnabled ? (
            <View style={styles.nextCountdownBadge}>
              <Clock size={13} color="#516600" />
              <Text style={styles.nextCountdownText}>In 3h 18m</Text>
            </View>
          ) : (
            <Text style={styles.utcTimeText}>{item.time} UTC+5:30</Text>
          )}
        </View>

        {/* Detail Chips */}
        <View style={styles.detailChipsRow}>
          {/* Action Chip */}
          <View style={styles.chip}>
            {renderActionIcon(actionInfo.icon, isEnabled)}
            <Text style={styles.chipText}>{actionInfo.label}</Text>
          </View>

          {/* Duration Chip */}
          <View style={styles.chip}>
            <Hourglass size={15} color="#556253" />
            <Text style={styles.chipText}>{durationText}</Text>
          </View>

          {/* Frequency Chip */}
          <View style={styles.chip}>
            <Repeat size={15} color="#556253" />
            <Text style={styles.chipText}>{frequencyText}</Text>
          </View>
        </View>

        {/* Card Footer: Toggle & Signature Dark Forest Arrow */}
        <View style={styles.cardFooter}>
          {/* Auto-Armed Toggle */}
          <TouchableOpacity
            style={styles.toggleContainer}
            onPress={() => handleToggle(item, !isEnabled)}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.switchTrack,
                isEnabled ? styles.switchTrackOn : styles.switchTrackOff,
              ]}
            >
              <View
                style={[
                  styles.switchThumb,
                  isEnabled ? styles.switchThumbOn : styles.switchThumbOff,
                ]}
              />
            </View>
            <Text
              style={[
                styles.toggleLabel,
                isEnabled && styles.toggleLabelOn,
              ]}
            >
              {isEnabled ? 'Auto-Armed' : 'Standby'}
            </Text>
          </TouchableOpacity>

          {/* Signature 45deg Vector Action Button */}
          <TouchableOpacity
            style={styles.arrowButton}
            onPress={() => handleEdit(item.id)}
            activeOpacity={0.8}
            accessibilityLabel="Open Schedule Details"
          >
            <ArrowUpRight size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={handleRefresh}
            colors={['#C6E85A']}
            tintColor="#C6E85A"
          />
        }
      >
        <ServerStatusBanner />

        {/* 1. Header & Top Bar */}
        <View style={styles.headerBar}>
          <View style={styles.headerTitleCol}>
            <Text style={styles.screenTitle}>SCHEDULES</Text>
            <View style={styles.statusRow}>
              <View style={styles.pulseDot} />
              <Text style={styles.statusText}>
                {sortedSchedules.length} AUTOMATIONS CONFIGURED • NEXT: {nextScheduledTime}
              </Text>
            </View>
          </View>

          {/* Signature Dark Forest Add Button (44px) */}
          <TouchableOpacity
            style={styles.darkAddButton}
            onPress={handleAddSchedule}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Add new schedule"
          >
            <Plus size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* 2. Segmented Filter Control */}
        <View style={styles.segmentedTrack}>
          <TouchableOpacity
            style={[
              styles.segmentTab,
              activeTab === 'active' && styles.segmentTabActive,
            ]}
            onPress={() => setActiveTab('active')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === 'active' && styles.segmentTextActive,
              ]}
            >
              Active ({activeCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentTab,
              activeTab === 'paused' && styles.segmentTabActive,
            ]}
            onPress={() => setActiveTab('paused')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === 'paused' && styles.segmentTextActive,
              ]}
            >
              Paused ({pausedCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3. Week Calendar Strip */}
        <View style={styles.weekCalendarCard}>
          <View style={styles.weekCalendarRow}>
            {weekDays.map((item, idx) => (
              <View
                key={`${item.label}-${idx}`}
                style={[
                  styles.dayColumn,
                  item.isToday && styles.dayColumnToday,
                ]}
              >
                <Text
                  style={[
                    styles.dayLabel,
                    item.isToday && styles.dayLabelToday,
                  ]}
                >
                  {item.label}
                </Text>
                <Text
                  style={[
                    styles.dayNumber,
                    item.isToday && styles.dayNumberToday,
                  ]}
                >
                  {item.date}
                </Text>
                <View
                  style={[
                    styles.dayDot,
                    item.isToday && styles.dayDotToday,
                  ]}
                />
              </View>
            ))}
          </View>
        </View>

        {/* 4. Schedule Cards List */}
        {schedulesLoading && sortedSchedules.length === 0 ? (
          <LoadingView label="Loading irrigation automations..." />
        ) : schedulesErr && sortedSchedules.length === 0 ? (
          <ErrorView
            message={schedulesErr.message || 'Failed to load schedules'}
            onRetry={handleRefresh}
          />
        ) : displayedSchedules.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Calendar size={32} color="#516600" />
            </View>
            <Text style={styles.emptyTitle}>
              No {activeTab === 'active' ? 'Active' : 'Paused'} Schedules
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'active'
                ? 'All automations are paused or none have been created yet.'
                : 'No schedules are currently paused.'}
            </Text>
            <TouchableOpacity
              style={styles.emptyCreateBtn}
              onPress={handleAddSchedule}
              activeOpacity={0.8}
            >
              <Plus size={16} color="#161e00" />
              <Text style={styles.emptyCreateText}>Create Automation</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.schedulesFeed}>
            {displayedSchedules.map(renderScheduleCard)}
          </View>
        )}

        {/* 5. Smart Flow Banner */}
        <View style={styles.smartFlowBanner}>
          <View style={styles.smartFlowTop}>
            <View style={styles.smartFlowIconCircle}>
              <Zap size={20} color="#1E2A1E" />
            </View>
            <View style={styles.smartFlowTextCol}>
              <Text style={styles.smartFlowTitle}>
                Precision Soil Sync Ready
              </Text>
              <Text style={styles.smartFlowSubtitle}>
                No overlapping water cycles or valve pressure conflicts.
              </Text>
            </View>
          </View>

          <View style={styles.smartFlowBottom}>
            <Text style={styles.smartFlowTag}>SMART FLOW ENGINE</Text>
            <TouchableOpacity
              style={styles.smartFlowButton}
              onPress={handleAddSchedule}
              activeOpacity={0.85}
            >
              <Text style={styles.smartFlowButtonText}>Create Automation</Text>
              <ArrowRight size={16} color="#1E2A1E" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9faf8',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginBottom: 10,
  },
  headerTitleCol: {
    flex: 1,
    marginRight: 8,
  },
  screenTitle: {
    fontSize: 24,
    fontFamily: 'Manrope_300Light',
    color: '#191c1b',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C6E85A',
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    color: '#556253',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  darkAddButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E2A1E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  segmentedTrack: {
    flexDirection: 'row',
    backgroundColor: '#e7e8e6',
    borderRadius: 99,
    padding: 4,
    marginBottom: 14,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentTabActive: {
    backgroundColor: '#C6E85A',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: '#556253',
  },
  segmentTextActive: {
    color: '#1E2A1E',
    fontFamily: 'Manrope_700Bold',
  },
  weekCalendarCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  weekCalendarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 99,
  },
  dayColumnToday: {
    backgroundColor: '#C6E85A',
    transform: [{ scale: 1.05 }],
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  dayLabel: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    color: '#556253',
    textTransform: 'uppercase',
  },
  dayLabelToday: {
    color: '#1E2A1E',
  },
  dayNumber: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
    marginTop: 3,
  },
  dayNumberToday: {
    color: '#1E2A1E',
    fontFamily: 'Manrope_700Bold',
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d8e7d4',
    marginTop: 4,
  },
  dayDotToday: {
    backgroundColor: '#1E2A1E',
  },
  schedulesFeed: {
    gap: 14,
    marginBottom: 18,
  },
  scheduleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  scheduleCardPaused: {
    opacity: 0.85,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },
  zoneText: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    color: '#556253',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  scheduleTitle: {
    fontSize: 15,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
    marginTop: 2,
  },
  telemetryPill: {
    backgroundColor: 'rgba(216, 231, 212, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  telemetryPillPaused: {
    backgroundColor: '#e7e8e6',
  },
  telemetryPillText: {
    fontSize: 10,
    fontFamily: 'Manrope_600SemiBold',
    color: '#3d4a3c',
  },
  telemetryPillTextPaused: {
    color: '#556253',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  timeGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  timeLarge: {
    fontSize: 28,
    fontFamily: 'Manrope_300Light',
    color: '#191c1b',
    letterSpacing: -0.5,
  },
  timePeriod: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: '#556253',
  },
  nextCountdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(211, 225, 166, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  nextCountdownText: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    color: '#516600',
  },
  utcTimeText: {
    fontSize: 11,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
  },
  detailChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f3f4f2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  chipText: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: '#454937',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f2',
    marginTop: 4,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
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
  toggleLabel: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: '#556253',
  },
  toggleLabelOn: {
    color: '#191c1b',
    fontFamily: 'Manrope_600SemiBold',
  },
  arrowButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E2A1E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  smartFlowBanner: {
    backgroundColor: '#f3f4f2',
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  smartFlowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  smartFlowIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(198, 232, 90, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smartFlowTextCol: {
    flex: 1,
  },
  smartFlowTitle: {
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
  },
  smartFlowSubtitle: {
    fontSize: 11,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
    marginTop: 2,
  },
  smartFlowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
  },
  smartFlowTag: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    color: '#556253',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  smartFlowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#C6E85A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
  },
  smartFlowButtonText: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    color: '#1E2A1E',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    marginVertical: 10,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(211, 225, 166, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
    textAlign: 'center',
    maxWidth: 240,
    marginBottom: 16,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#C6E85A',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 99,
  },
  emptyCreateText: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    color: '#1E2A1E',
  },
});
