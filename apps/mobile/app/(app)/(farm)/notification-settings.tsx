import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Animated,
  Platform,
  Vibration,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  User,
  Bell,
  MessageSquare,
  MessageCircle,
  Info,
  Droplets,
  Thermometer,
  AlertTriangle,
  WifiOff,
  CheckCircle2,
  Sprout,
  Moon,
  Sun,
  BarChart2,
  Clock,
  ChevronDown,
  Vibrate,
  CloudCheck,
  ArrowUpRight,
  Volume2,
} from 'lucide-react-native';

import { TimePickerModal } from '../../../src/components/TimePickerModal';

const PREFS_STORAGE_KEY = '@notification_prefs';

type VolumeProfile = 'silent' | 'default' | 'loud';
type TimePickerTarget = 'quietFrom' | 'quietTo' | 'summaryTime' | null;

interface NotificationPrefs {
  pushNotifications: boolean;
  whatsAppAlerts: boolean;
  smsAlerts: boolean;

  lowSoilMoisture: boolean;
  highTemperature: boolean;
  sensorFault: boolean;
  deviceOffline: boolean;
  scheduleCompleted: boolean;
  diseaseRisk: boolean;

  quietHoursEnabled: boolean;
  quietHoursFrom: string; // "22:00"
  quietHoursTo: string;   // "06:00"

  dailySummaryEnabled: boolean;
  dailySummaryTime: string; // "08:00"

  volumeProfile: VolumeProfile;
  vibrateForAlarms: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  pushNotifications: true,
  whatsAppAlerts: true,
  smsAlerts: false,

  lowSoilMoisture: true,
  highTemperature: true,
  sensorFault: true,
  deviceOffline: true,
  scheduleCompleted: false,
  diseaseRisk: true,

  quietHoursEnabled: true,
  quietHoursFrom: '22:00',
  quietHoursTo: '06:00',

  dailySummaryEnabled: true,
  dailySummaryTime: '08:00',

  volumeProfile: 'default',
  vibrateForAlarms: true,
};

// Helper: 24h "HH:MM" to "H:MM AM/PM"
function formatTime12h(timeStr: string): string {
  const [hStr, mStr] = (timeStr || '06:00').split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Time picker state
  const [timePickerTarget, setTimePickerTarget] = useState<TimePickerTarget>(null);
  const [pickerInitialDate, setPickerInitialDate] = useState<Date>(new Date());

  // Load preferences from AsyncStorage on mount
  useEffect(() => {
    async function loadStoredPrefs() {
      try {
        const raw = await AsyncStorage.getItem(PREFS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setPrefs({ ...DEFAULT_PREFS, ...parsed });
        }
      } catch (err) {
        console.warn('Failed to load notification preferences:', err);
      }
    }
    loadStoredPrefs();
  }, []);

  // Generic toggle helper
  const toggleKey = (key: keyof NotificationPrefs) => {
    if (Platform.OS !== 'web') Vibration.vibrate(25);
    setPrefs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Open TimePicker for given target
  const openTimePicker = (target: TimePickerTarget, timeStr: string) => {
    const [h, m] = (timeStr || '06:00').split(':').map(Number);
    const d = new Date();
    d.setHours(h ?? 6, m ?? 0, 0, 0);
    setPickerInitialDate(d);
    setTimePickerTarget(target);
  };

  // Confirm TimePicker time
  const handleTimeConfirm = (time: Date) => {
    const h = String(time.getHours()).padStart(2, '0');
    const m = String(time.getMinutes()).padStart(2, '0');
    const timeStr = `${h}:${m}`;

    if (timePickerTarget === 'quietFrom') {
      setPrefs((prev) => ({ ...prev, quietHoursFrom: timeStr }));
    } else if (timePickerTarget === 'quietTo') {
      setPrefs((prev) => ({ ...prev, quietHoursTo: timeStr }));
    } else if (timePickerTarget === 'summaryTime') {
      setPrefs((prev) => ({ ...prev, dailySummaryTime: timeStr }));
    }
    setTimePickerTarget(null);
  };

  // Save preferences
  const handleSavePreferences = async () => {
    try {
      if (Platform.OS !== 'web') Vibration.vibrate(40);
      await AsyncStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      Alert.alert('Preferences Saved', 'Notification settings synchronized with local sensor hub.');
    } catch {
      Alert.alert('Save Failed', 'Unable to persist preferences.');
    }
  };

  // Count active triggers
  const activeTriggersCount = [
    prefs.lowSoilMoisture,
    prefs.highTemperature,
    prefs.sensorFault,
    prefs.deviceOffline,
    prefs.scheduleCompleted,
    prefs.diseaseRisk,
  ].filter(Boolean).length;

  const activeChannelsCount = [
    prefs.pushNotifications,
    prefs.whatsAppAlerts,
    prefs.smsAlerts,
  ].filter(Boolean).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityLabel="Back"
          >
            <ArrowLeft size={22} color="#191c1b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notification Settings</Text>
        </View>

        <TouchableOpacity
          style={styles.profileAvatar}
          onPress={() => router.push('/(app)/(farm)/profile')}
          activeOpacity={0.8}
        >
          <User size={16} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 40) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Subtitle / Context Note */}
        <View style={styles.contextHeader}>
          <View>
            <Text style={styles.contextTag}>KRISHIVA PRECISION HUB</Text>
            <Text style={styles.contextSubtitle}>
              Customized for Nashik North Block • 12 Active Sensors
            </Text>
          </View>
          <View style={styles.telemetryLiveBadge}>
            <View style={styles.pulseGreenDot} />
            <Text style={styles.telemetryLiveText}>TELEMETRY LIVE</Text>
          </View>
        </View>

        {/* 1. SECTION: CHANNELS */}
        <View style={styles.sectionGroup}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>ALERT DELIVERY CHANNELS</Text>
            <Text style={styles.sectionCountText}>{activeChannelsCount} of 3 enabled</Text>
          </View>

          <View style={styles.cardContainer}>
            {/* Row 1: Push Notifications */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeftGroup}>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(219, 233, 174, 0.5)' }]}>
                  <Bell size={18} color="#586435" />
                </View>
                <View style={styles.textGroup}>
                  <Text style={styles.rowTitle}>Push notifications</Text>
                  <Text style={styles.rowSubtitle}>Instant alerts on this device</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.switchTrack, prefs.pushNotifications ? styles.switchOn : styles.switchOff]}
                onPress={() => toggleKey('pushNotifications')}
                activeOpacity={0.85}
              >
                <View style={[styles.switchThumb, prefs.pushNotifications ? styles.thumbRight : styles.thumbLeft]} />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Row 2: WhatsApp Alerts */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeftGroup}>
                <View style={[styles.iconCircle, { backgroundColor: '#d8e7d4' }]}>
                  <MessageSquare size={18} color="#516600" />
                </View>
                <View style={styles.textGroup}>
                  <View style={styles.rowTitleBadgeRow}>
                    <Text style={styles.rowTitle}>WhatsApp alerts</Text>
                    <View style={styles.primaryPill}>
                      <Text style={styles.primaryPillText}>Primary</Text>
                    </View>
                  </View>
                  <Text style={styles.rowSubtitle}>Direct alerts to +91 98234 •••••</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.switchTrack, prefs.whatsAppAlerts ? styles.switchOn : styles.switchOff]}
                onPress={() => toggleKey('whatsAppAlerts')}
                activeOpacity={0.85}
              >
                <View style={[styles.switchThumb, prefs.whatsAppAlerts ? styles.thumbRight : styles.thumbLeft]} />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Row 3: SMS Alerts */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeftGroup}>
                <View style={[styles.iconCircle, { backgroundColor: '#e7e8e6' }]}>
                  <MessageCircle size={18} color="#454937" />
                </View>
                <View style={styles.textGroup}>
                  <View style={styles.rowTitleBadgeRow}>
                    <Text style={styles.rowTitle}>SMS alerts</Text>
                    <View style={styles.chargesPill}>
                      <Info size={11} color="#576334" />
                      <Text style={styles.chargesPillText}>Charges may apply</Text>
                    </View>
                  </View>
                  <Text style={styles.rowSubtitle}>Carrier fallback only</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.switchTrack, prefs.smsAlerts ? styles.switchOn : styles.switchOff]}
                onPress={() => toggleKey('smsAlerts')}
                activeOpacity={0.85}
              >
                <View style={[styles.switchThumb, prefs.smsAlerts ? styles.thumbRight : styles.thumbLeft]} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 2. SECTION: ACTIVE MONITORING TRIGGERS */}
        <View style={styles.sectionGroup}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>ACTIVE MONITORING TRIGGERS</Text>
            <Text style={styles.sectionCountText}>{activeTriggersCount} Active</Text>
          </View>

          <View style={styles.cardContainer}>
            {/* Item 1: Soil Moisture */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeftGroup}>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(211, 225, 166, 0.6)' }]}>
                  <Droplets size={18} color="#576334" />
                </View>
                <View style={styles.textGroup}>
                  <Text style={styles.rowTitle}>Low soil moisture</Text>
                  <Text style={styles.rowSubtitle}>Triggers below 30% VWC</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.switchTrack, prefs.lowSoilMoisture ? styles.switchOn : styles.switchOff]}
                onPress={() => toggleKey('lowSoilMoisture')}
                activeOpacity={0.85}
              >
                <View style={[styles.switchThumb, prefs.lowSoilMoisture ? styles.thumbRight : styles.thumbLeft]} />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Item 2: High Temperature */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeftGroup}>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(216, 231, 212, 0.7)' }]}>
                  <Thermometer size={18} color="#516600" />
                </View>
                <View style={styles.textGroup}>
                  <Text style={styles.rowTitle}>High temperature</Text>
                  <Text style={styles.rowSubtitle}>Triggers above 38°C</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.switchTrack, prefs.highTemperature ? styles.switchOn : styles.switchOff]}
                onPress={() => toggleKey('highTemperature')}
                activeOpacity={0.85}
              >
                <View style={[styles.switchThumb, prefs.highTemperature ? styles.thumbRight : styles.thumbLeft]} />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Item 3: Sensor Fault */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeftGroup}>
                <View style={[styles.iconCircle, { backgroundColor: '#e7e8e6' }]}>
                  <AlertTriangle size={18} color="#576334" />
                </View>
                <View style={styles.textGroup}>
                  <Text style={styles.rowTitle}>Sensor fault</Text>
                  <Text style={styles.rowSubtitle}>Hardware & battery issues</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.switchTrack, prefs.sensorFault ? styles.switchOn : styles.switchOff]}
                onPress={() => toggleKey('sensorFault')}
                activeOpacity={0.85}
              >
                <View style={[styles.switchThumb, prefs.sensorFault ? styles.thumbRight : styles.thumbLeft]} />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Item 4: Device Offline */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeftGroup}>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(255, 218, 214, 0.6)' }]}>
                  <WifiOff size={18} color="#ba1a1a" />
                </View>
                <View style={styles.textGroup}>
                  <Text style={styles.rowTitle}>Device offline</Text>
                  <Text style={styles.rowSubtitle}>No heartbeat for &gt; 15m</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.switchTrack, prefs.deviceOffline ? styles.switchOn : styles.switchOff]}
                onPress={() => toggleKey('deviceOffline')}
                activeOpacity={0.85}
              >
                <View style={[styles.switchThumb, prefs.deviceOffline ? styles.thumbRight : styles.thumbLeft]} />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Item 5: Schedule Completed */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeftGroup}>
                <View style={[styles.iconCircle, { backgroundColor: '#e7e8e6' }]}>
                  <CheckCircle2 size={18} color="#454937" />
                </View>
                <View style={styles.textGroup}>
                  <Text style={styles.rowTitle}>Schedule completed</Text>
                  <Text style={styles.rowSubtitle}>Irrigation runs & fertigation</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.switchTrack, prefs.scheduleCompleted ? styles.switchOn : styles.switchOff]}
                onPress={() => toggleKey('scheduleCompleted')}
                activeOpacity={0.85}
              >
                <View style={[styles.switchThumb, prefs.scheduleCompleted ? styles.thumbRight : styles.thumbLeft]} />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Item 6: Disease Risk */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeftGroup}>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(198, 232, 90, 0.4)' }]}>
                  <Sprout size={18} color="#516600" />
                </View>
                <View style={styles.textGroup}>
                  <Text style={styles.rowTitle}>Disease risk</Text>
                  <Text style={styles.rowSubtitle}>High humidity fungal advisory</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.switchTrack, prefs.diseaseRisk ? styles.switchOn : styles.switchOff]}
                onPress={() => toggleKey('diseaseRisk')}
                activeOpacity={0.85}
              >
                <View style={[styles.switchThumb, prefs.diseaseRisk ? styles.thumbRight : styles.thumbLeft]} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 3. SECTION: NIGHT & REST MODES */}
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionTitle}>NIGHT & REST MODES</Text>

          <View style={styles.cardContainer}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeftGroup}>
                <View style={[styles.iconCircle, { backgroundColor: '#e7e8e6' }]}>
                  <Moon size={18} color="#191c1b" />
                </View>
                <View style={styles.textGroup}>
                  <Text style={styles.rowTitle}>Enable quiet hours</Text>
                  <Text style={styles.rowSubtitle}>Active every night</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.switchTrack, prefs.quietHoursEnabled ? styles.switchOn : styles.switchOff]}
                onPress={() => toggleKey('quietHoursEnabled')}
                activeOpacity={0.85}
              >
                <View style={[styles.switchThumb, prefs.quietHoursEnabled ? styles.thumbRight : styles.thumbLeft]} />
              </TouchableOpacity>
            </View>

            {/* Notice Box */}
            <View style={styles.quietNoticeBox}>
              <Text style={styles.quietNoticeText}>
                Mute non-critical alerts during rest hours. Critical pump faults and leak emergencies will still ring loudly.
              </Text>
            </View>

            {/* Time Chips Row */}
            <View style={styles.timeChipsRow}>
              {/* From Chip */}
              <TouchableOpacity
                style={styles.timeChipCard}
                onPress={() => openTimePicker('quietFrom', prefs.quietHoursFrom)}
                activeOpacity={0.8}
              >
                <Text style={styles.timeChipLabel}>FROM</Text>
                <View style={styles.timeChipValRow}>
                  <Text style={styles.timeChipValue}>{formatTime12h(prefs.quietHoursFrom)}</Text>
                  <Moon size={16} color="#556253" />
                </View>
              </TouchableOpacity>

              {/* To Chip */}
              <TouchableOpacity
                style={styles.timeChipCard}
                onPress={() => openTimePicker('quietTo', prefs.quietHoursTo)}
                activeOpacity={0.8}
              >
                <Text style={styles.timeChipLabel}>TO</Text>
                <View style={styles.timeChipValRow}>
                  <Text style={styles.timeChipValue}>{formatTime12h(prefs.quietHoursTo)}</Text>
                  <Sun size={16} color="#556253" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 4. SECTION: DIGEST & INSIGHTS */}
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionTitle}>DIGEST & INSIGHTS</Text>

          <View style={styles.cardContainer}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeftGroup}>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(219, 233, 174, 0.5)' }]}>
                  <BarChart2 size={18} color="#586435" />
                </View>
                <View style={styles.textGroup}>
                  <Text style={styles.rowTitle}>Send daily summary</Text>
                  <Text style={styles.rowSubtitle}>Water usage, soil levels & tasks</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.switchTrack, prefs.dailySummaryEnabled ? styles.switchOn : styles.switchOff]}
                onPress={() => toggleKey('dailySummaryEnabled')}
                activeOpacity={0.85}
              >
                <View style={[styles.switchThumb, prefs.dailySummaryEnabled ? styles.thumbRight : styles.thumbLeft]} />
              </TouchableOpacity>
            </View>

            {/* Delivery Time Chip Row */}
            <View style={styles.deliveryTimeRow}>
              <View style={styles.deliveryTimeLeft}>
                <Clock size={18} color="#576334" />
                <Text style={styles.deliveryTimeText}>Delivery time</Text>
              </View>

              <TouchableOpacity
                style={styles.deliveryTimePill}
                onPress={() => openTimePicker('summaryTime', prefs.dailySummaryTime)}
                activeOpacity={0.8}
              >
                <Text style={styles.deliveryTimePillText}>
                  {formatTime12h(prefs.dailySummaryTime)}
                </Text>
                <ChevronDown size={14} color="#526700" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 5. SECTION: HAPTICS & AUDIO */}
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionTitle}>HAPTICS & AUDIO</Text>

          <View style={styles.cardContainer}>
            <Text style={styles.volumeHeader}>ALERT VOLUME PROFILE</Text>

            {/* Segmented Control */}
            <View style={styles.segmentedControl}>
              {(['silent', 'default', 'loud'] as VolumeProfile[]).map((vol) => {
                const isSelected = prefs.volumeProfile === vol;
                return (
                  <TouchableOpacity
                    key={vol}
                    style={[styles.segmentedBtn, isSelected && styles.segmentedBtnActive]}
                    onPress={() => {
                      if (Platform.OS !== 'web') Vibration.vibrate(20);
                      setPrefs((prev) => ({ ...prev, volumeProfile: vol }));
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.segmentedBtnText, isSelected && styles.segmentedBtnTextActive]}>
                      {vol.charAt(0).toUpperCase() + vol.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.divider} />

            {/* Vibration Toggle */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeftGroup}>
                <View style={[styles.iconCircle, { backgroundColor: '#e7e8e6' }]}>
                  <Vibrate size={18} color="#191c1b" />
                </View>
                <View style={styles.textGroup}>
                  <Text style={styles.rowTitle}>Vibrate for alarms</Text>
                  <Text style={styles.rowSubtitle}>Haptic feedback on critical status</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.switchTrack, prefs.vibrateForAlarms ? styles.switchOn : styles.switchOff]}
                onPress={() => toggleKey('vibrateForAlarms')}
                activeOpacity={0.85}
              >
                <View style={[styles.switchThumb, prefs.vibrateForAlarms ? styles.thumbRight : styles.thumbLeft]} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 6. BOTTOM ACTION & AUTO-SYNC NOTE */}
        <View style={styles.bottomSection}>
          <View style={styles.autoSyncNote}>
            <CloudCheck size={16} color="#516600" />
            <Text style={styles.autoSyncText}>Settings sync automatically across linked devices</Text>
          </View>

          <TouchableOpacity
            style={[styles.savePreferencesBtn, isSaved && styles.savePreferencesBtnSuccess]}
            onPress={handleSavePreferences}
            activeOpacity={0.9}
          >
            <Text style={styles.savePreferencesText}>
              {isSaved ? 'PREFERENCES STORED' : 'SAVE PREFERENCES'}
            </Text>
            <View style={styles.arrowCircleDark}>
              <ArrowUpRight size={18} color="#ffffff" />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Time Picker Modal */}
      <TimePickerModal
        visible={timePickerTarget !== null}
        initialTime={pickerInitialDate}
        onClose={() => setTimePickerTarget(null)}
        onConfirm={handleTimeConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9faf8',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(249, 250, 248, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#191c1b',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#516600',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 20,
  },

  // Context Header
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  contextTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#757965',
    letterSpacing: 0.8,
  },
  contextSubtitle: {
    fontSize: 12,
    color: '#556253',
    marginTop: 2,
  },
  telemetryLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e7e8e6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  pulseGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#516600',
  },
  telemetryLiveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#516600',
    letterSpacing: 0.4,
  },

  // Section Group
  sectionGroup: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#757965',
    letterSpacing: 0.8,
  },
  sectionCountText: {
    fontSize: 12,
    color: '#556253',
  },

  // Card Container
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
    gap: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  toggleLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textGroup: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#191c1b',
  },
  rowTitleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  rowSubtitle: {
    fontSize: 12,
    color: '#556253',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f2',
  },

  // Badges
  primaryPill: {
    backgroundColor: 'rgba(81, 102, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  primaryPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#516600',
  },
  chargesPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e7e8e6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  chargesPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#454937',
  },

  // Switches
  switchTrack: {
    width: 52,
    height: 30,
    borderRadius: 15,
    padding: 3,
    justifyContent: 'center',
  },
  switchOn: {
    backgroundColor: '#c6e85a',
  },
  switchOff: {
    backgroundColor: '#e2e3e1',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  thumbRight: {
    alignSelf: 'flex-end',
  },
  thumbLeft: {
    alignSelf: 'flex-start',
  },

  // Night & Rest Modes specifics
  quietNoticeBox: {
    backgroundColor: '#f3f4f2',
    padding: 12,
    borderRadius: 12,
  },
  quietNoticeText: {
    fontSize: 12,
    color: '#556253',
    lineHeight: 17,
  },
  timeChipsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 4,
  },
  timeChipCard: {
    flex: 1,
    backgroundColor: '#f3f4f2',
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  timeChipLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#556253',
    letterSpacing: 0.5,
  },
  timeChipValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeChipValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#191c1b',
  },

  // Digest specifics
  deliveryTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f4f2',
    padding: 12,
    borderRadius: 14,
  },
  deliveryTimeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deliveryTimeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#191c1b',
  },
  deliveryTimePill: {
    backgroundColor: 'rgba(198, 232, 90, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deliveryTimePillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#526700',
  },

  // Audio specifics
  volumeHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#556253',
    letterSpacing: 0.6,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#e7e8e6',
    padding: 3,
    borderRadius: 24,
    gap: 4,
  },
  segmentedBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedBtnActive: {
    backgroundColor: '#c6e85a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentedBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#556253',
  },
  segmentedBtnTextActive: {
    fontWeight: '700',
    color: '#161e00',
  },

  // Bottom Save & Sync
  bottomSection: {
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    paddingBottom: 16,
  },
  autoSyncNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  autoSyncText: {
    fontSize: 12,
    color: '#556253',
  },
  savePreferencesBtn: {
    width: '100%',
    backgroundColor: '#c6e85a',
    borderRadius: 28,
    paddingVertical: 6,
    paddingLeft: 24,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#516600',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  savePreferencesBtnSuccess: {
    backgroundColor: '#d8e7d4',
  },
  savePreferencesText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#161e00',
    letterSpacing: 0.8,
  },
  arrowCircleDark: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#191c1b',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
