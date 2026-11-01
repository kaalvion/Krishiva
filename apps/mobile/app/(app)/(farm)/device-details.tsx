import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import {
  ArrowLeft,
  User,
  Edit3,
  Copy,
  Radio,
  SlidersHorizontal,
  ArrowUpRight,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Trash2,
  RefreshCw,
  Terminal,
  X,
  Volume2,
  Lightbulb,
  Signal,
  BatteryCharging,
  Droplets,
  Layers,
  Check,
} from 'lucide-react-native';
import { useActiveFarm } from '../../../src/context/FarmContext';
import { useLiveDevices } from '../../../src/hooks/live';
import { deleteDevice } from '../../../src/services/api';

type StateTab = 'online' | 'offline' | 'calibrate' | 'remove';

interface RelayInfo {
  terminal: string;
  name: string;
  subtitle: string;
  type: 'pump' | 'valve' | 'light' | 'siren';
}

const DEFAULT_RELAYS: RelayInfo[] = [
  {
    terminal: 'T1',
    name: 'Main Pump 5HP',
    subtitle: 'Submersible line • In-rush 18A',
    type: 'pump',
  },
  {
    terminal: 'T2',
    name: 'Drip Solenoid Valve',
    subtitle: 'Sector 2 Polyhouse line',
    type: 'valve',
  },
  {
    terminal: 'T3',
    name: 'Field Perimeter Lights',
    subtitle: 'Dusk-to-dawn timed relay',
    type: 'light',
  },
  {
    terminal: 'T4',
    name: 'Intrusion Alarm Siren',
    subtitle: 'PIR Motion fence trigger',
    type: 'siren',
  },
];

export default function DeviceDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { deviceId } = useLocalSearchParams<{ deviceId?: string }>();
  const { activeFarm } = useActiveFarm();
  const { devices, refresh: refreshDevices } = useLiveDevices(activeFarm?.id);

  // Find target device
  const device = devices.find((d) => d.id === deviceId) || devices[0];

  // UI state switcher
  const [activeTab, setActiveTab] = useState<StateTab>('online');

  // Device renaming state
  const [deviceName, setDeviceName] = useState(device?.name || 'Main Controller');
  const [isEditingDeviceName, setIsEditingDeviceName] = useState(false);
  const [editNameInput, setEditNameInput] = useState(deviceName);

  // Relays state
  const [relays, setRelays] = useState<RelayInfo[]>(DEFAULT_RELAYS);
  const [editingRelayIdx, setEditingRelayIdx] = useState<number | null>(null);
  const [relayNameInput, setRelayNameInput] = useState('');

  // Modals state
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);
  const [calibrationCountdown, setCalibrationCountdown] = useState(18);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removeConfirmInput, setRemoveConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(-60)).current;

  // Pulse animation for online indicator
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Calibration timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (showCalibrationModal) {
      setCalibrationCountdown(18);
      timer = setInterval(() => {
        setCalibrationCountdown((c) => (c > 1 ? c - 1 : 18));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showCalibrationModal]);

  // Load configured relay names from AsyncStorage
  useEffect(() => {
    if (!device?.id) return;
    setDeviceName(device.name);
    setEditNameInput(device.name);

    AsyncStorage.getItem(`@relay_names_${device.id}`)
      .then((saved) => {
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setRelays((prev) =>
              prev.map((r, i) => {
                const key = `r${i + 1}`;
                if (parsed[key]) {
                  return { ...r, name: parsed[key] };
                }
                return r;
              })
            );
          } catch {
            // fallback
          }
        }
      })
      .catch(() => {});
  }, [device?.id, device?.name]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 20,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(toastAnim, {
        toValue: -60,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setToastMessage(null));
  };

  const handleStateTabPress = (tab: StateTab) => {
    setActiveTab(tab);
    if (tab === 'calibrate') {
      setShowCalibrationModal(true);
    } else if (tab === 'remove') {
      setShowRemoveModal(true);
    } else if (tab === 'offline') {
      showToast('State preview: Controller offline mode');
    }
  };

  const handleSaveDeviceName = () => {
    if (editNameInput.trim()) {
      setDeviceName(editNameInput.trim());
      setIsEditingDeviceName(false);
      showToast('Controller label updated');
    }
  };

  const handleSaveRelayName = async (index: number) => {
    if (relayNameInput.trim()) {
      const updated = [...relays];
      updated[index].name = relayNameInput.trim();
      setRelays(updated);
      setEditingRelayIdx(null);
      showToast(`Terminal ${updated[index].terminal} name updated`);

      if (device?.id) {
        const payload: Record<string, string> = {};
        updated.forEach((r, idx) => {
          payload[`r${idx + 1}`] = r.name;
        });
        await AsyncStorage.setItem(`@relay_names_${device.id}`, JSON.stringify(payload));
      }
    }
  };

  const handleDeleteDevice = async () => {
    if (removeConfirmInput.trim().toLowerCase() !== deviceName.trim().toLowerCase()) {
      Alert.alert(
        'Confirmation Mismatch',
        `Please type "${deviceName}" exactly to confirm removal.`
      );
      return;
    }

    if (!activeFarm?.id || !device?.id) {
      Alert.alert('Error', 'Missing farm or device identifier.');
      return;
    }

    try {
      setIsDeleting(true);
      await deleteDevice(activeFarm.id, device.id);
      setShowRemoveModal(false);
      refreshDevices();
      showToast('Controller removed from farm network');
      setTimeout(() => {
        router.back();
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not remove device';
      Alert.alert('Error', msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const isOffline = activeTab === 'offline';
  const macAddress = device?.id ? `${device.id.slice(0, 2).toUpperCase()}:${device.id.slice(2, 4).toUpperCase()}:${device.id.slice(4, 6).toUpperCase()}:${device.id.slice(6, 8).toUpperCase()}:${device.id.slice(8, 10).toUpperCase()}:${device.id.slice(10, 12).toUpperCase()}` : 'A4:CF:12:B3:D4:E5';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* 1. TOP APP BAR */}
      <View style={styles.topAppBar}>
        <View style={styles.topAppLeft}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.8}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={22} color="#191c1b" />
          </TouchableOpacity>
          <Text style={styles.topAppTitle}>Telemetry Calibration</Text>
        </View>

        <View style={styles.topAppRight}>
          <View style={styles.profileAvatar}>
            <User size={16} color="#ffffff" />
          </View>
        </View>
      </View>

      {/* Floating Animated Toast */}
      {toastMessage && (
        <Animated.View
          style={[
            styles.toastContainer,
            { transform: [{ translateY: toastAnim }] },
          ]}
        >
          <View style={styles.toastCard}>
            <CheckCircle2 size={18} color="#c6e85a" />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </Animated.View>
      )}

      {/* 2. STATE SWITCHER TABS */}
      <View style={styles.stateTabsSection}>
        <View style={styles.stateTabsContainer}>
          <TouchableOpacity
            style={[
              styles.stateTabBtn,
              activeTab === 'online' && styles.stateTabBtnActive,
            ]}
            onPress={() => handleStateTabPress('online')}
            activeOpacity={0.8}
          >
            <Animated.View
              style={[styles.statePulseDot, { opacity: pulseAnim }]}
            />
            <Text
              style={[
                styles.stateTabText,
                activeTab === 'online' && styles.stateTabTextActive,
              ]}
            >
              Online
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.stateTabBtn,
              activeTab === 'offline' && styles.stateTabBtnActiveOffline,
            ]}
            onPress={() => handleStateTabPress('offline')}
            activeOpacity={0.8}
          >
            <WifiOff size={13} color={activeTab === 'offline' ? '#ba1a1a' : '#ba1a1a'} />
            <Text
              style={[
                styles.stateTabText,
                activeTab === 'offline' && styles.stateTabTextActiveOffline,
              ]}
            >
              Offline
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.stateTabBtn,
              activeTab === 'calibrate' && styles.stateTabBtnActive,
            ]}
            onPress={() => handleStateTabPress('calibrate')}
            activeOpacity={0.8}
          >
            <Sliders size={13} color="#556253" />
            <Text style={styles.stateTabText}>Calibration</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.stateTabBtn,
              activeTab === 'remove' && styles.stateTabBtnActiveOffline,
            ]}
            onPress={() => handleStateTabPress('remove')}
            activeOpacity={0.8}
          >
            <Trash2 size={13} color="#ba1a1a" />
            <Text style={[styles.stateTabText, { color: '#ba1a1a' }]}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. CONDITIONAL OFFLINE ALERT BANNER */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <View style={styles.offlineIconCircle}>
            <AlertTriangle size={18} color="#ba1a1a" />
          </View>
          <View style={styles.offlineTextCol}>
            <Text style={styles.offlineTitle}>Device Offline</Text>
            <Text style={styles.offlineSubtitle}>
              Last seen 2 hours ago. Check 12V DC auxiliary solar harness and 4G eSIM signal lock.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setActiveTab('online')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={18} color="#93000a" />
          </TouchableOpacity>
        </View>
      )}

      {/* 4. MAIN SCROLLABLE CONTENT */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Subtle Ambient SVG Contours */}
        <Svg
          style={StyleSheet.absoluteFill}
          viewBox="0 0 390 1200"
          fill="none"
          pointerEvents="none"
        >
          <Path
            d="M-40,80 C80,110 160,50 280,120 C360,165 420,130 450,150"
            stroke="#c5c9b1"
            strokeWidth={0.8}
            opacity={0.3}
          />
          <Path
            d="M-60,190 C60,230 180,160 300,220 C390,260 410,210 460,250"
            stroke="#c5c9b1"
            strokeWidth={0.8}
            opacity={0.25}
          />
          <Path
            d="M-20,380 C110,430 200,340 310,400 C390,450 430,420 460,440"
            stroke="#c5c9b1"
            strokeWidth={0.8}
            opacity={0.25}
          />
          <Path
            d="M-50,600 C70,640 190,580 320,650 C400,700 440,660 470,690"
            stroke="#c5c9b1"
            strokeWidth={0.8}
            opacity={0.25}
          />
        </Svg>

        {/* 1. DEVICE HERO / LIVE TELEMETRY CARD */}
        <View style={styles.card}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroSectionTag}>CONTROLLER UNIT</Text>
              {isEditingDeviceName ? (
                <View style={styles.editNameRow}>
                  <TextInput
                    style={styles.editNameInput}
                    value={editNameInput}
                    onChangeText={setEditNameInput}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={styles.editNameSaveBtn}
                    onPress={handleSaveDeviceName}
                  >
                    <Check size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.heroTitleRow}>
                  <Text style={styles.heroDeviceName}>{deviceName}</Text>
                  <TouchableOpacity
                    style={styles.editIconBtn}
                    onPress={() => {
                      setEditNameInput(deviceName);
                      setIsEditingDeviceName(true);
                    }}
                  >
                    <Edit3 size={16} color="#556253" />
                  </TouchableOpacity>
                </View>
              )}
              <Text style={styles.heroFarmLocation}>
                {activeFarm?.name || 'Patil Farm'} • {device?.location?.zone || 'Sector B-4 Greenhouse'}
              </Text>
            </View>

            <View
              style={[
                styles.statusPillBadge,
                isOffline && styles.statusPillBadgeOffline,
              ]}
            >
              <View
                style={[
                  styles.statusPillDot,
                  isOffline && styles.statusPillDotOffline,
                ]}
              />
              <Text
                style={[
                  styles.statusPillText,
                  isOffline && styles.statusPillTextOffline,
                ]}
              >
                {isOffline ? 'OFFLINE' : 'ONLINE'}
              </Text>
            </View>
          </View>

          {/* 2x2 Specs Grid */}
          <View style={styles.specsGrid}>
            <View style={styles.specCell}>
              <Text style={styles.specLabel}>MODEL CODE</Text>
              <Text style={styles.specValue}>KRISHIVA-M1</Text>
            </View>
            <View style={styles.specCell}>
              <Text style={styles.specLabel}>HARDWARE SPEC</Text>
              <Text style={styles.specValue}>Rev 1.0 (LTE/GSM)</Text>
            </View>
            <View style={styles.specCell}>
              <Text style={styles.specLabel}>MAC ADDRESS</Text>
              <TouchableOpacity
                style={styles.macCopyRow}
                onPress={() => showToast('MAC address copied to clipboard')}
              >
                <Text style={styles.specValueMac}>{macAddress}</Text>
                <Copy size={13} color="#556253" />
              </TouchableOpacity>
            </View>
            <View style={styles.specCell}>
              <Text style={styles.specLabel}>INSTALLED DATE</Text>
              <Text style={styles.specValue}>15 Oct 2026</Text>
            </View>
          </View>
        </View>

        {/* 2. CONNECTION METRICS CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeaderTitle}>CONNECTION & TELEMETRY</Text>
            <View style={styles.pulseTimingRow}>
              <RefreshCw size={13} color="#516600" />
              <Text style={styles.pulseTimingText}>10s Pulse</Text>
            </View>
          </View>

          {/* Tower info */}
          <View style={styles.towerInfoRow}>
            <View style={styles.towerLeft}>
              <View style={styles.towerIconCircle}>
                <Radio size={20} color="#516600" />
              </View>
              <View>
                <Text style={styles.towerTitle}>Strong 4G LTE</Text>
                <Text style={styles.towerSubtitle}>Jio M2M Industrial eSIM</Text>
              </View>
            </View>

            {/* Signal bars */}
            <View style={styles.signalBarsWrap}>
              <View style={[styles.signalBar, { height: 8 }]} />
              <View style={[styles.signalBar, { height: 12 }]} />
              <View style={[styles.signalBar, { height: 16 }]} />
              <View style={[styles.signalBar, { height: 20 }]} />
              <View style={[styles.signalBar, styles.signalBarMuted, { height: 20 }]} />
            </View>
          </View>

          {/* Data Volume Progress */}
          <View style={styles.dataVolumeSection}>
            <View style={styles.dataVolumeHeader}>
              <Text style={styles.dataVolumeLabel}>Data Volume Usage</Text>
              <Text style={styles.dataVolumeValues}>
                12.3 MB <Text style={styles.dataVolumeTotal}>/ 500 MB</Text>
              </Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: '18%' }]} />
            </View>
            <Text style={styles.dataResetSubtitle}>
              Cycles reset in 18 days • M2M Bandwidth Cap
            </Text>
          </View>
        </View>

        {/* 3. RELAY OUTPUT TERMINALS CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeaderTitle}>RELAY OUTPUT TERMINALS</Text>
            <Text style={styles.activePillText}>T1 – T4 Active</Text>
          </View>
          <Text style={styles.cardSubtitle}>
            Configured hardware triggers for automation rules
          </Text>

          <View style={styles.relaysList}>
            {relays.map((relay, idx) => {
              const isEditing = editingRelayIdx === idx;

              return (
                <View key={relay.terminal} style={styles.relayRow}>
                  <View style={styles.relayLeft}>
                    <View
                      style={[
                        styles.relayIconWrap,
                        idx === 0 && { backgroundColor: '#c6e85a' },
                        idx === 1 && { backgroundColor: '#d3e1a6' },
                        idx === 2 && { backgroundColor: '#d8e7d4' },
                        idx === 3 && { backgroundColor: '#ffdad6' },
                      ]}
                    >
                      {idx === 0 ? (
                        <Droplets size={19} color="#516600" />
                      ) : idx === 1 ? (
                        <SlidersHorizontal size={19} color="#586435" />
                      ) : idx === 2 ? (
                        <Lightbulb size={19} color="#556253" />
                      ) : (
                        <Volume2 size={19} color="#ba1a1a" />
                      )}
                    </View>

                    <View style={styles.relayInfoCol}>
                      {isEditing ? (
                        <View style={styles.editRelayRow}>
                          <TextInput
                            style={styles.editRelayInput}
                            value={relayNameInput}
                            onChangeText={setRelayNameInput}
                            autoFocus
                          />
                          <TouchableOpacity
                            style={styles.editNameSaveBtn}
                            onPress={() => handleSaveRelayName(idx)}
                          >
                            <Check size={14} color="#ffffff" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={styles.terminalNameRow}>
                          <View style={styles.terminalTag}>
                            <Text style={styles.terminalTagText}>{relay.terminal}</Text>
                          </View>
                          <Text style={styles.relayTitleText} numberOfLines={1}>
                            {relay.name}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.relaySubtitleText} numberOfLines={1}>
                        {relay.subtitle}
                      </Text>
                    </View>
                  </View>

                  {!isEditing && (
                    <TouchableOpacity
                      style={styles.relayEditBtn}
                      onPress={() => {
                        setRelayNameInput(relay.name);
                        setEditingRelayIdx(idx);
                      }}
                      accessibilityLabel={`Edit ${relay.name}`}
                    >
                      <Edit3 size={16} color="#556253" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* 4. SENSOR CALIBRATION CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeaderTitle}>SENSOR CALIBRATION</Text>
            <Text style={styles.subtleBadgeText}>ADC 12-Bit</Text>
          </View>
          <Text style={styles.cardSubtitle}>Current soil baseline profiles</Text>

          <View style={styles.calibrationBaselinesGrid}>
            <View style={styles.baselineCell}>
              <Text style={styles.baselineLabel}>AIR DRY BASELINE</Text>
              <Text style={styles.baselineValue}>
                3,200 <Text style={styles.baselineUnit}>ADC</Text>
              </Text>
              <Text style={styles.baselineVolumetric}>0% Volumetric</Text>
            </View>

            <View style={styles.baselineCell}>
              <Text style={styles.baselineLabel}>SATURATION BASELINE</Text>
              <Text style={styles.baselineValue}>
                1,400 <Text style={styles.baselineUnit}>ADC</Text>
              </Text>
              <Text style={styles.baselineVolumetricActive}>100% Saturated</Text>
            </View>
          </View>

          <View style={styles.calibrationBottomRow}>
            <View style={styles.calibratedHistoryRow}>
              <RefreshCw size={14} color="#556253" />
              <Text style={styles.calibratedHistoryText}>Calibrated 12 days ago</Text>
            </View>

            <TouchableOpacity
              style={styles.recalibrateBtn}
              activeOpacity={0.8}
              onPress={() => setShowCalibrationModal(true)}
            >
              <Sliders size={16} color="#161e00" />
              <Text style={styles.recalibrateBtnText}>Recalibrate Now</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 5. PAIRED TELEMETRY NODES CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardHeaderTitle}>PAIRED TELEMETRY NODES</Text>
              <Text style={styles.cardSubtitle}>3 RF LoRa sub-nodes connected</Text>
            </View>
            <View style={styles.arrowCircleAnchor}>
              <ArrowUpRight size={18} color="#ffffff" />
            </View>
          </View>

          <View style={styles.nodesList}>
            {/* Node 1 */}
            <View style={styles.nodeItemRow}>
              <View style={styles.nodeLeft}>
                <View style={[styles.nodeStatusDot, { backgroundColor: '#516600' }]} />
                <View>
                  <Text style={styles.nodeTitle}>NODE 1 • Root Zone South</Text>
                  <Text style={styles.nodeSubtitle}>Online • Soil 38% VWC • 24.2°C</Text>
                </View>
              </View>
              <Signal size={16} color="#556253" />
            </View>

            {/* Node 2 */}
            <View style={styles.nodeItemRow}>
              <View style={styles.nodeLeft}>
                <View style={[styles.nodeStatusDot, { backgroundColor: '#516600' }]} />
                <View>
                  <Text style={styles.nodeTitle}>NODE 2 • Canopy Microclimate</Text>
                  <Text style={styles.nodeSubtitle}>Online • Humidity 68% RH • 27.5°C</Text>
                </View>
              </View>
              <Signal size={16} color="#556253" />
            </View>

            {/* Node 3 */}
            <View style={styles.nodeItemRow}>
              <View style={styles.nodeLeft}>
                <View style={[styles.nodeStatusDot, { backgroundColor: '#f9a825' }]} />
                <View>
                  <Text style={styles.nodeTitle}>NODE 3 • Well Level Monitor</Text>
                  <Text style={styles.nodeSubtitle}>Sleeping 15m cadence • Battery 94%</Text>
                </View>
              </View>
              <BatteryCharging size={16} color="#556253" />
            </View>
          </View>

          <View style={styles.nodesBtnRow}>
            <TouchableOpacity
              style={styles.manageNodesBtn}
              activeOpacity={0.8}
              onPress={() => showToast('Managing 3 RF LoRa nodes')}
            >
              <Text style={styles.manageNodesBtnText}>Manage Nodes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addSensorBtn}
              activeOpacity={0.8}
              onPress={() => router.push('/(app)/scan-device')}
            >
              <Text style={styles.addSensorBtnText}>+ Add Sensor</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 6. FIRMWARE & OS CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeaderTitle}>FIRMWARE & OS</Text>
            <View style={styles.otaBadge}>
              <Text style={styles.otaBadgeText}>OTA READY</Text>
            </View>
          </View>

          <View style={styles.firmwareSpecsBox}>
            <View>
              <Text style={styles.firmwareLabel}>INSTALLED VERSION</Text>
              <Text style={styles.firmwareValue}>v1.3.0</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.firmwareLabelGreen}>RELEASE CHANNEL</Text>
              <Text style={styles.firmwareValueGreen}>v1.3.2 Available</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.updateAvailableBtn}
            activeOpacity={0.85}
            onPress={() => showToast('Pushing firmware package v1.3.2 over LTE...')}
          >
            <RefreshCw size={16} color="#161e00" />
            <Text style={styles.updateAvailableBtnText}>Update Available (2.1 MB)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.changelogLink}
            onPress={() =>
              Alert.alert(
                "What's new in v1.3.2",
                '• LTE Power Optimization with automatic idle backoff\n• Watchdog timer reset recovery\n• Soil ADC baseline precision adjustments'
              )
            }
          >
            <Text style={styles.changelogLinkText}>
              What's new in v1.3.2 (LTE Power Optimization & Watchdog)
            </Text>
          </TouchableOpacity>
        </View>

        {/* 7. HARDWARE OPERATIONS CARD */}
        <View style={styles.card}>
          <Text style={[styles.cardHeaderTitle, { marginBottom: 12 }]}>
            HARDWARE OPERATIONS
          </Text>

          <View style={styles.hardwareOpsList}>
            <TouchableOpacity
              style={styles.opBtn}
              activeOpacity={0.8}
              onPress={() => showToast('Diagnostic self-test ping broadcasted (OK)')}
            >
              <Terminal size={18} color="#556253" />
              <Text style={styles.opBtnText}>Send Diagnostic Command</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.opBtn}
              activeOpacity={0.8}
              onPress={() => showToast('Sending soft reset packet to Krishiva-M1...')}
            >
              <RefreshCw size={18} color="#556253" />
              <Text style={styles.opBtnText}>Soft Reboot Device</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.opBtnDelete}
              activeOpacity={0.8}
              onPress={() => setShowRemoveModal(true)}
            >
              <Trash2 size={18} color="#ba1a1a" />
              <Text style={styles.opBtnDeleteText}>Remove Device from Farm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* 5. CALIBRATION PROGRESS MODAL (BOTTOM SHEET) */}
      <Modal
        visible={showCalibrationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCalibrationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.bottomSheetCard, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.dragPill} />

            <View style={styles.sheetHeaderRow}>
              <View>
                <Text style={styles.sheetTitle}>Calibrating Soil Moisture Probe</Text>
                <Text style={styles.sheetSubtitle}>Sensor Node 1 • Sector B</Text>
              </View>
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => setShowCalibrationModal(false)}
              >
                <X size={18} color="#556253" />
              </TouchableOpacity>
            </View>

            {/* Step 1 Progress Ring */}
            <View style={styles.stepProgressCard}>
              <View style={styles.ringGraphic}>
                <Svg width={48} height={48} viewBox="0 0 36 36">
                  <SvgCircle
                    cx={18}
                    cy={18}
                    r={14}
                    stroke="#edeeec"
                    strokeWidth={3}
                    fill="none"
                  />
                  <SvgCircle
                    cx={18}
                    cy={18}
                    r={14}
                    stroke="#516600"
                    strokeWidth={3}
                    strokeDasharray="60, 100"
                    strokeLinecap="round"
                    fill="none"
                  />
                </Svg>
                <Radio size={16} color="#516600" style={styles.ringCenterIcon} />
              </View>

              <View style={{ flex: 1 }}>
                <View style={styles.stepTitleRow}>
                  <Text style={styles.stepTitle}>Step 1: Reading Dry Air</Text>
                  <Text style={styles.stepCountdown}>{calibrationCountdown}s remaining</Text>
                </View>
                <Text style={styles.stepDesc}>Acquiring zero-capacitance reference point</Text>
              </View>
            </View>

            {/* Step 2 Queued */}
            <View style={styles.stepQueuedCard}>
              <View style={styles.queuedNumberCircle}>
                <Text style={styles.queuedNumberText}>2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Step 2: Saturated Soil Submersion</Text>
                <Text style={styles.stepDesc}>Queued • Requires cup of farm soil slurry</Text>
              </View>
            </View>

            {/* Field Guideline Callout */}
            <View style={styles.guidelineCallout}>
              <Lightbulb size={18} color="#516600" style={{ marginTop: 2 }} />
              <Text style={styles.guidelineText}>
                <Text style={{ fontFamily: 'Manrope_700Bold' }}>Field Guideline: </Text>
                Ensure stainless steel prongs are wiped completely clean with a dry cloth and suspended in ambient air.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.abortBtn}
              activeOpacity={0.8}
              onPress={() => setShowCalibrationModal(false)}
            >
              <Text style={styles.abortBtnText}>Abort Calibration</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 6. REMOVE DEVICE MODAL */}
      <Modal
        visible={showRemoveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRemoveModal(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={styles.deleteModalCard}>
            <View style={styles.deleteWarningCircle}>
              <AlertTriangle size={28} color="#ba1a1a" />
            </View>

            <Text style={styles.deleteModalTitle}>Remove {deviceName}?</Text>
            <Text style={styles.deleteModalDesc}>
              This will sever telemetry from 4 relays and 3 paired sensors in {activeFarm?.name || 'Patil Farm'}. Automated valve timers and drip schedules will stop immediately.
            </Text>

            <View style={styles.confirmInputGroup}>
              <Text style={styles.confirmInputLabel}>
                Type &ldquo;{deviceName}&rdquo; to confirm
              </Text>
              <TextInput
                style={styles.confirmTextInput}
                placeholder={deviceName}
                placeholderTextColor="#757965"
                value={removeConfirmInput}
                onChangeText={setRemoveConfirmInput}
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.deleteConfirmBtn, isDeleting && { opacity: 0.7 }]}
              activeOpacity={0.85}
              onPress={handleDeleteDevice}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Trash2 size={16} color="#ffffff" />
                  <Text style={styles.deleteConfirmBtnText}>Permanently Remove</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteCancelBtn}
              activeOpacity={0.8}
              onPress={() => {
                setShowRemoveModal(false);
                setRemoveConfirmInput('');
              }}
            >
              <Text style={styles.deleteCancelBtnText}>Cancel & Keep Device</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f9faf8',
  },
  topAppBar: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9faf8',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  topAppLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topAppTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 18,
    color: '#191c1b',
  },
  topAppRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#516600',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 999,
    alignItems: 'center',
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2e3130',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: '#f0f1ef',
  },

  /* 2. STATE TABS */
  stateTabsSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  stateTabsContainer: {
    backgroundColor: '#e7e8e6',
    borderRadius: 28,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stateTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    borderRadius: 24,
  },
  stateTabBtnActive: {
    backgroundColor: '#c6e85a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  stateTabBtnActiveOffline: {
    backgroundColor: '#ffdad6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#516600',
  },
  stateTabText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 0.5,
    color: '#556253',
    textTransform: 'uppercase',
  },
  stateTabTextActive: {
    color: '#131e13',
  },
  stateTabTextActiveOffline: {
    color: '#ba1a1a',
  },

  /* 3. OFFLINE BANNER */
  offlineBanner: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#ffdad6',
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    shadowColor: '#ba1a1a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  offlineIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(186, 26, 26, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineTextCol: {
    flex: 1,
  },
  offlineTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: '#ba1a1a',
  },
  offlineSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: '#93000a',
    lineHeight: 16,
    marginTop: 2,
  },

  /* Scrollable Body */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
    paddingTop: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },

  /* 1. HERO CARD */
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroSectionTag: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 1.2,
    color: '#556253',
    textTransform: 'uppercase',
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  heroDeviceName: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 19,
    color: '#191c1b',
  },
  editIconBtn: {
    padding: 4,
  },
  editNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  editNameInput: {
    flex: 1,
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    color: '#191c1b',
    backgroundColor: '#f3f4f2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  editNameSaveBtn: {
    backgroundColor: '#516600',
    padding: 6,
    borderRadius: 12,
  },
  heroFarmLocation: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: '#556253',
    marginTop: 2,
  },
  statusPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#c6e85a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  statusPillBadgeOffline: {
    backgroundColor: '#ffdad6',
  },
  statusPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#516600',
  },
  statusPillDotOffline: {
    backgroundColor: '#ba1a1a',
  },
  statusPillText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: '#161e00',
  },
  statusPillTextOffline: {
    color: '#ba1a1a',
  },
  specsGrid: {
    marginTop: 14,
    backgroundColor: '#f3f4f2',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  specCell: {
    width: '46%',
  },
  specLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    color: '#556253',
  },
  specValue: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: '#191c1b',
    marginTop: 2,
  },
  macCopyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  specValueMac: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: '#191c1b',
  },

  /* 2. CONNECTION METRICS */
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardHeaderTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    letterSpacing: 1,
    color: '#556253',
  },
  cardSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: '#556253',
    marginBottom: 12,
  },
  pulseTimingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pulseTimingText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: '#556253',
  },
  towerInfoRow: {
    backgroundColor: '#f3f4f2',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  towerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  towerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#d8e7d4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  towerTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: '#191c1b',
  },
  towerSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: '#556253',
  },
  signalBarsWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    paddingRight: 6,
  },
  signalBar: {
    width: 3.5,
    borderRadius: 2,
    backgroundColor: '#516600',
  },
  signalBarMuted: {
    backgroundColor: '#c5c9b1',
  },
  dataVolumeSection: {
    gap: 6,
  },
  dataVolumeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dataVolumeLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: '#556253',
  },
  dataVolumeValues: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: '#191c1b',
  },
  dataVolumeTotal: {
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e7e8e6',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#516600',
  },
  dataResetSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: '#757965',
    marginTop: 2,
  },

  /* 3. RELAYS */
  activePillText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: '#516600',
  },
  relaysList: {
    gap: 8,
  },
  relayRow: {
    backgroundColor: '#f3f4f2',
    borderRadius: 16,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  relayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  relayIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  relayInfoCol: {
    flex: 1,
  },
  terminalNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  terminalTag: {
    backgroundColor: '#e7e8e6',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  terminalTagText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: '#191c1b',
  },
  relayTitleText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: '#191c1b',
    flex: 1,
  },
  relaySubtitleText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: '#556253',
    marginTop: 2,
  },
  relayEditBtn: {
    padding: 8,
  },
  editRelayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editRelayInput: {
    flex: 1,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: '#191c1b',
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },

  /* 4. CALIBRATION */
  subtleBadgeText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: '#757965',
  },
  calibrationBaselinesGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  baselineCell: {
    flex: 1,
    backgroundColor: '#f3f4f2',
    borderRadius: 14,
    padding: 12,
  },
  baselineLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 0.6,
    color: '#556253',
  },
  baselineValue: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 18,
    color: '#191c1b',
    marginTop: 3,
  },
  baselineUnit: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: '#556253',
  },
  baselineVolumetric: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: '#757965',
    marginTop: 2,
  },
  baselineVolumetricActive: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: '#516600',
    marginTop: 2,
  },
  calibrationBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  calibratedHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  calibratedHistoryText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: '#556253',
  },
  recalibrateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#d3e1a6',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
  },
  recalibrateBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: '#161e00',
  },

  /* 5. PAIRED NODES */
  arrowCircleAnchor: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#191c1b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodesList: {
    gap: 8,
    marginBottom: 12,
  },
  nodeItemRow: {
    backgroundColor: '#f3f4f2',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nodeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nodeStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nodeTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: '#191c1b',
  },
  nodeSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: '#556253',
    marginTop: 1,
  },
  nodesBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  manageNodesBtn: {
    flex: 1,
    backgroundColor: '#edeeec',
    paddingVertical: 11,
    borderRadius: 24,
    alignItems: 'center',
  },
  manageNodesBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: '#191c1b',
  },
  addSensorBtn: {
    flex: 1,
    backgroundColor: '#c6e85a',
    paddingVertical: 11,
    borderRadius: 24,
    alignItems: 'center',
  },
  addSensorBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: '#161e00',
  },

  /* 6. FIRMWARE */
  otaBadge: {
    backgroundColor: '#c6e85a',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  otaBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    color: '#161e00',
  },
  firmwareSpecsBox: {
    backgroundColor: '#f3f4f2',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  firmwareLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: '#556253',
  },
  firmwareValue: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: '#191c1b',
    marginTop: 2,
  },
  firmwareLabelGreen: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: '#516600',
  },
  firmwareValueGreen: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: '#516600',
    marginTop: 2,
  },
  updateAvailableBtn: {
    backgroundColor: '#c6e85a',
    borderRadius: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  updateAvailableBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: '#161e00',
  },
  changelogLink: {
    alignItems: 'center',
    marginTop: 10,
  },
  changelogLinkText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: '#556253',
    textDecorationLine: 'underline',
  },

  /* 7. HARDWARE OPERATIONS */
  hardwareOpsList: {
    gap: 10,
  },
  opBtn: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  opBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: '#191c1b',
  },
  opBtnDelete: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffdad6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  opBtnDeleteText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: '#ba1a1a',
  },

  /* MODAL: CALIBRATION */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  bottomSheetCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    gap: 14,
  },
  dragPill: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#e7e8e6',
    alignSelf: 'center',
    marginBottom: 4,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    color: '#191c1b',
  },
  sheetSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: '#556253',
    marginTop: 1,
  },
  sheetCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#edeeec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepProgressCard: {
    backgroundColor: '#f3f4f2',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ringGraphic: {
    position: 'relative',
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenterIcon: {
    position: 'absolute',
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: '#191c1b',
  },
  stepCountdown: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: '#516600',
  },
  stepDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: '#556253',
    marginTop: 2,
  },
  stepQueuedCard: {
    backgroundColor: '#f9faf8',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    opacity: 0.7,
  },
  queuedNumberCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#edeeec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  queuedNumberText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: '#556253',
  },
  guidelineCallout: {
    backgroundColor: 'rgba(198, 232, 90, 0.25)',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  guidelineText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: '#191c1b',
    lineHeight: 18,
    flex: 1,
  },
  abortBtn: {
    backgroundColor: '#edeeec',
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  abortBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: '#191c1b',
  },

  /* MODAL: DELETE */
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  deleteModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 8,
  },
  deleteWarningCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffdad6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 18,
    color: '#191c1b',
    textAlign: 'center',
  },
  deleteModalDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: '#556253',
    textAlign: 'center',
    lineHeight: 18,
  },
  confirmInputGroup: {
    width: '100%',
    gap: 6,
    marginTop: 4,
  },
  confirmInputLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    color: '#556253',
    textTransform: 'uppercase',
  },
  confirmTextInput: {
    width: '100%',
    height: 44,
    backgroundColor: '#f3f4f2',
    borderRadius: 22,
    paddingHorizontal: 16,
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: '#191c1b',
  },
  deleteConfirmBtn: {
    width: '100%',
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ba1a1a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  deleteConfirmBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: '#ffffff',
  },
  deleteCancelBtn: {
    width: '100%',
    height: 44,
    borderRadius: 22,
    backgroundColor: '#edeeec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCancelBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: '#191c1b',
  },
});
