import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Animated,
  Easing,
  Alert,
  Image,
  Platform,
  Vibration,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import {
  ArrowLeft,
  Settings,
  User,
  Radio,
  RotateCw,
  Check,
  Power,
  Clock,
  PauseCircle,
  Sun,
  AlertTriangle,
  Lock,
  Volume2,
  PowerOff,
  StopCircle,
  ArrowUpRight,
  MapPin,
  X,
  Send,
  Sliders,
  Droplets,
  Layers,
} from 'lucide-react-native';

import { useActiveFarm } from '../../../src/context/FarmContext';
import { useServerStatus } from '../../../src/context/ServerStatusContext';
import { useLiveDevices, useRecentCommands } from '../../../src/hooks/live';
import { useIssueCommand } from '../../../src/hooks/useCommand';
import { sendHardwareMessage } from '../../../src/services/api';
import type { Device, ActuatorAction, CommandRecord } from '../../../src/types';

// Map Banner Image
const FIELD_MAP_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCqEAkNNcGkoRoKEkcdUJNTzKExrWinWTHkXNVUOXSBfCHJZdMVuA92xTnK2t4EiYvRU2ZV2vwbnlepg-9wR6NrvUe7pdrh2mxY4BILxGSRYO7sqWmll7sbM-alz-bLn2spbXW-6Bj7i6j7ufg7n9Jpf26BRz7MPDRDozz7pvrs7uVxzfNTPaIsSp6zIDaqHD8ItKITNAURkr_Ua9Ygw6aZHKtLo5GYE2sfGCALV_4';

export default function ControlsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ farmId?: string }>();
  const { activeFarm } = useActiveFarm();
  const { serverOnline } = useServerStatus();

  const farmId = activeFarm?.id || params.farmId;

  // Live devices from Firestore
  const { devices, refresh: refreshDevices } = useLiveDevices(farmId);
  const { commands: recentCommands, refresh: refreshCommands } = useRecentCommands(farmId, devices);

  const issueCommandMutation = useIssueCommand();

  // Find devices by capability
  const pumpDevice = useMemo(
    () => devices.find((d) => d.capabilities?.some((c) => c.toLowerCase().includes('pump'))) || devices[0],
    [devices]
  );
  const valveDevice = useMemo(
    () => devices.find((d) => d.capabilities?.some((c) => c.toLowerCase().includes('valve'))) || devices[1] || devices[0],
    [devices]
  );
  const lightDevice = useMemo(
    () => devices.find((d) => d.capabilities?.some((c) => c.toLowerCase().includes('light'))) || devices[2] || devices[0],
    [devices]
  );
  const sirenDevice = useMemo(
    () => devices.find((d) => d.capabilities?.some((c) => c.toLowerCase().includes('siren'))) || devices[3] || devices[0],
    [devices]
  );

  // Actuator active states
  const [pumpActive, setPumpActive] = useState<boolean>(true);
  const [pumpTimer, setPumpTimer] = useState<number>(15); // minutes: 5, 15, 30, 60

  const [valveActive, setValveActive] = useState<boolean>(false);
  const [valveTimer, setValveTimer] = useState<number>(30); // minutes

  const [lightActive, setLightActive] = useState<boolean>(true);
  const [lightTimer, setLightTimer] = useState<string>('60m'); // '15m', '30m', '60m', 'Dawn'

  const [sirenActive, setSirenActive] = useState<boolean>(false);
  const [sirenHolding, setSirenHolding] = useState<boolean>(false);
  const [sirenFired, setSirenFired] = useState<boolean>(false);

  // Siren 2-second hold animation
  const holdAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation for online badge
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.4,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Log Modal
  const [showLogModal, setShowLogModal] = useState<boolean>(false);

  // Instant hardware message modal
  const [showMessageModal, setShowMessageModal] = useState<boolean>(false);
  const [customMsg, setCustomMsg] = useState<string>('');
  const [isSendingMsg, setIsSendingMsg] = useState<boolean>(false);

  // Count active actuators
  const activeCount = useMemo(() => {
    let count = 0;
    if (pumpActive) count++;
    if (valveActive) count++;
    if (lightActive) count++;
    if (sirenActive) count++;
    return count;
  }, [pumpActive, valveActive, lightActive, sirenActive]);

  // Execute actuator command
  const executeAction = async (
    device: Device | undefined,
    action: ActuatorAction,
    durationSeconds?: number
  ) => {
    if (!farmId) {
      Alert.alert('Farm Error', 'No active farm selected.');
      return;
    }

    const targetDeviceId = device?.id || 'master-hub-relay';

    try {
      await issueCommandMutation.mutateAsync({
        farmId,
        deviceId: targetDeviceId,
        action,
        durationSeconds,
      });
      refreshCommands();
    } catch (err: any) {
      // Backend error handling
      console.warn('Failed to issue command:', err?.message || err);
    }
  };

  // Toggle Borewell Pump
  const handleTogglePump = () => {
    const nextState = !pumpActive;
    setPumpActive(nextState);
    if (Platform.OS !== 'web') Vibration.vibrate(35);

    const action: ActuatorAction = nextState ? 'PUMP_ON' : 'PUMP_OFF';
    const duration = nextState ? pumpTimer * 60 : undefined;
    executeAction(pumpDevice, action, duration);
  };

  // Select Pump Timer Pill
  const handleSelectPumpTimer = (mins: number) => {
    setPumpTimer(mins);
    if (Platform.OS !== 'web') Vibration.vibrate(25);
    if (pumpActive) {
      executeAction(pumpDevice, 'PUMP_ON', mins * 60);
    }
  };

  // Toggle Drip Valve North
  const handleToggleValve = () => {
    const nextState = !valveActive;
    setValveActive(nextState);
    if (Platform.OS !== 'web') Vibration.vibrate(35);

    const action: ActuatorAction = nextState ? 'VALVE_ON' : 'VALVE_OFF';
    const duration = nextState ? valveTimer * 60 : undefined;
    executeAction(valveDevice, action, duration);
  };

  // Toggle Perimeter Light
  const handleToggleLight = () => {
    const nextState = !lightActive;
    setLightActive(nextState);
    if (Platform.OS !== 'web') Vibration.vibrate(35);

    const action: ActuatorAction = nextState ? 'LIGHT_ON' : 'LIGHT_OFF';
    const durationSeconds = lightTimer === 'Dawn' ? 28800 : parseInt(lightTimer, 10) * 60;
    executeAction(lightDevice, action, nextState ? durationSeconds : undefined);
  };

  // Select Light Timer Pill
  const handleSelectLightTimer = (val: string) => {
    setLightTimer(val);
    if (Platform.OS !== 'web') Vibration.vibrate(25);
    if (lightActive) {
      const durationSeconds = val === 'Dawn' ? 28800 : parseInt(val, 10) * 60;
      executeAction(lightDevice, 'LIGHT_ON', durationSeconds);
    }
  };

  // Siren Press In -> start 2s hold
  const handleSirenPressIn = () => {
    if (sirenFired) return;
    setSirenHolding(true);
    Animated.timing(holdAnim, {
      toValue: 1,
      duration: 2000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        handleSirenTriggered();
      }
    });
  };

  // Siren Press Out -> cancel if before 2s
  const handleSirenPressOut = () => {
    if (sirenFired) return;
    setSirenHolding(false);
    holdAnim.stopAnimation();
    Animated.timing(holdAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  // Siren triggered after 2s hold
  const handleSirenTriggered = () => {
    setSirenFired(true);
    setSirenActive(true);
    if (Platform.OS !== 'web') Vibration.vibrate([100, 50, 100]);

    executeAction(sirenDevice, 'SIREN_ON', 30);

    setTimeout(() => {
      setSirenFired(false);
      setSirenHolding(false);
      holdAnim.setValue(0);
    }, 3500);
  };

  // Master Emergency Shutdown
  const handleEmergencyShutdown = () => {
    Alert.alert(
      'Emergency Shutdown',
      'Are you sure you want to instantly shut off all relays, pumps, and valves across the farm?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'SHUT DOWN ALL',
          style: 'destructive',
          onPress: async () => {
            if (Platform.OS !== 'web') Vibration.vibrate([80, 40, 80]);
            setPumpActive(false);
            setValveActive(false);
            setLightActive(false);
            setSirenActive(false);

            await Promise.allSettled([
              executeAction(pumpDevice, 'PUMP_OFF'),
              executeAction(valveDevice, 'VALVE_OFF'),
              executeAction(lightDevice, 'LIGHT_OFF'),
              executeAction(sirenDevice, 'SIREN_OFF'),
            ]);

            Alert.alert('Emergency Stop Executed', 'All pumps, valves, and lights have been switched off.');
          },
        },
      ]
    );
  };

  // Send Direct Hardware Message
  const handleSendCustomMessage = async () => {
    if (!customMsg.trim() || !farmId) return;
    const targetDev = pumpDevice || devices[0];
    if (!targetDev) return;

    setIsSendingMsg(true);
    try {
      await sendHardwareMessage(farmId, targetDev.id, customMsg.trim());
      setCustomMsg('');
      setShowMessageModal(false);
      Alert.alert('Message Sent', 'Command delivered to the master gateway.');
    } catch {
      Alert.alert('Dispatch Failed', 'Unable to transmit downlink packet.');
    } finally {
      setIsSendingMsg(false);
    }
  };

  const macAddress = (devices[0] as any)?.macAddress || 'F0:24:F9:0D:B7:48';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. TOP APP BAR */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(app)/(farm)/dashboard');
              }
            }}
            activeOpacity={0.7}
            accessibilityLabel="Back"
          >
            <ArrowLeft size={22} color="#191c1b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Automation Unit Detail</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setShowMessageModal(true)}
            activeOpacity={0.7}
            accessibilityLabel="Diagnostics and Settings"
          >
            <Settings size={20} color="#191c1b" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.profileAvatar}
            onPress={() => router.push('/(app)/(farm)/profile')}
            activeOpacity={0.8}
            accessibilityLabel="Profile"
          >
            <User size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 40) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. DEVICE META & NETWORK TELEMETRY BAR */}
        <View style={styles.metaCard}>
          <View style={styles.metaRowTop}>
            <View style={styles.metaStatusLeft}>
              <View style={styles.pingContainer}>
                <Animated.View
                  style={[
                    styles.pingRing,
                    {
                      transform: [{ scale: pulseAnim }],
                      opacity: pulseAnim.interpolate({
                        inputRange: [1, 1.4],
                        outputRange: [0.75, 0],
                      }),
                    },
                  ]}
                />
                <View style={styles.pingDot} />
              </View>
              <Text style={styles.metaStatusText}>ONLINE • MASTER HUB</Text>
            </View>
            <Text style={styles.metaMacText}>MAC: {macAddress}</Text>
          </View>

          <View style={styles.metaRowBottom}>
            <View style={styles.metaTelemetryGroup}>
              <Radio size={14} color="#516600" />
              <Text style={styles.metaTelemetryText}>4G LTE</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaTelemetryText}>-78 dBm</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={[styles.metaTelemetryText, styles.metaBattBold]}>94% Batt</Text>
            </View>
            <TouchableOpacity
              style={styles.metaLiveBtn}
              onPress={() => {
                refreshDevices();
                refreshCommands();
              }}
              activeOpacity={0.7}
            >
              <RotateCw size={13} color="#516600" />
              <Text style={styles.metaLiveText}>Live</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. ACTUATOR CONTROLS HEADER */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>ACTUATOR CONTROLS</Text>
            <Text style={styles.sectionSubtitle}>Tap switch to toggle or set auto-shutoff timer</Text>
          </View>
          <View style={styles.activePill}>
            <Text style={styles.activePillText}>{activeCount} ACTIVE</Text>
          </View>
        </View>

        {/* ACTUATOR CARDS (4 CARDS) */}
        <View style={styles.cardsContainer}>
          {/* ACTUATOR 1: Borewell Pump */}
          <View style={[styles.actuatorCard, pumpActive ? styles.cardActiveLime : styles.cardInactiveWhite]}>
            <View style={styles.cardHeader}>
              <View style={[styles.actuatorIconCircle, pumpActive ? styles.iconCircleDark : styles.iconCircleGrey]}>
                <Droplets size={22} color={pumpActive ? '#c6e85a' : '#556253'} />
              </View>
              <TouchableOpacity
                style={[styles.toggleTrack, pumpActive ? styles.toggleTrackActive : styles.toggleTrackInactive]}
                onPress={handleTogglePump}
                activeOpacity={0.8}
                accessibilityLabel="Toggle Borewell Pump"
              >
                <View style={[styles.toggleThumb, pumpActive ? styles.toggleThumbRight : styles.toggleThumbLeft]}>
                  {pumpActive ? (
                    <Check size={13} color="#161e00" strokeWidth={3} />
                  ) : (
                    <Power size={13} color="#757965" strokeWidth={2.5} />
                  )}
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.cardTitleRow}>
                <Text style={[styles.actuatorTitle, pumpActive ? styles.textDark : styles.textBlack]}>
                  Borewell Pump
                </Text>
                <View style={[styles.rateBadge, pumpActive ? styles.rateBadgeDark : styles.rateBadgeLight]}>
                  <Text style={[styles.rateBadgeText, pumpActive ? styles.textDark : styles.textMuted]}>
                    14.2 L/m
                  </Text>
                </View>
              </View>
              <View style={styles.runningRow}>
                <Clock size={13} color={pumpActive ? 'rgba(22, 30, 0, 0.8)' : '#556253'} />
                <Text style={[styles.runningText, pumpActive ? styles.runningTextDark : styles.runningTextMuted]}>
                  {pumpActive ? 'Running 12 min' : 'Off • Standby'}
                </Text>
              </View>
            </View>

            {/* Timer Pills Dock */}
            <View style={[styles.timerDock, pumpActive ? styles.timerDockActive : styles.timerDockInactive]}>
              {[5, 15, 30, 60].map((mins) => {
                const isSelected = pumpTimer === mins;
                return (
                  <TouchableOpacity
                    key={mins}
                    style={[
                      styles.timerPill,
                      isSelected && (pumpActive ? styles.timerPillSelectedDark : styles.timerPillSelectedLight),
                    ]}
                    onPress={() => handleSelectPumpTimer(mins)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.timerPillText,
                        isSelected
                          ? pumpActive
                            ? styles.timerPillTextActiveDark
                            : styles.timerPillTextActiveLight
                          : pumpActive
                          ? styles.timerPillTextInactiveDark
                          : styles.timerPillTextInactiveLight,
                      ]}
                    >
                      {mins}m
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ACTUATOR 2: Drip Valve North */}
          <View style={[styles.actuatorCard, valveActive ? styles.cardActiveLime : styles.cardInactiveWhite]}>
            <View style={styles.cardHeader}>
              <View style={[styles.actuatorIconCircle, valveActive ? styles.iconCircleDark : styles.iconCircleGrey]}>
                <Sliders size={22} color={valveActive ? '#c6e85a' : '#556253'} />
              </View>
              <TouchableOpacity
                style={[styles.toggleTrack, valveActive ? styles.toggleTrackActive : styles.toggleTrackInactive]}
                onPress={handleToggleValve}
                activeOpacity={0.8}
                accessibilityLabel="Toggle Drip Valve North"
              >
                <View style={[styles.toggleThumb, valveActive ? styles.toggleThumbRight : styles.toggleThumbLeft]}>
                  {valveActive ? (
                    <Check size={13} color="#161e00" strokeWidth={3} />
                  ) : (
                    <Power size={13} color="#757965" strokeWidth={2.5} />
                  )}
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.cardBody}>
              <Text style={[styles.actuatorTitle, valveActive ? styles.textDark : styles.textBlack]}>
                Drip Valve North
              </Text>
              <View style={styles.runningRow}>
                {valveActive ? (
                  <>
                    <Clock size={13} color="rgba(22, 30, 0, 0.8)" />
                    <Text style={styles.runningTextDark}>Running 8 min</Text>
                  </>
                ) : (
                  <>
                    <PauseCircle size={13} color="#556253" />
                    <Text style={styles.runningTextMuted}>Off • Standby</Text>
                  </>
                )}
              </View>
            </View>

            {/* Inactive Hint Dock or Active Timer */}
            {valveActive ? (
              <View style={styles.timerDockActive}>
                {[10, 20, 30, 45].map((mins) => {
                  const isSelected = valveTimer === mins;
                  return (
                    <TouchableOpacity
                      key={mins}
                      style={[styles.timerPill, isSelected && styles.timerPillSelectedDark]}
                      onPress={() => {
                        setValveTimer(mins);
                        executeAction(valveDevice, 'VALVE_ON', mins * 60);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.timerPillText,
                          isSelected ? styles.timerPillTextActiveDark : styles.timerPillTextInactiveDark,
                        ]}
                      >
                        {mins}m
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.inactiveHintDock}>
                <Text style={styles.inactiveHintLabel}>Auto shutoff default</Text>
                <Text style={styles.inactiveHintValue}>{valveTimer} min</Text>
              </View>
            )}
          </View>

          {/* ACTUATOR 3: Perimeter Light */}
          <View style={[styles.actuatorCard, lightActive ? styles.cardActiveLime : styles.cardInactiveWhite]}>
            <View style={styles.cardHeader}>
              <View style={[styles.actuatorIconCircle, lightActive ? styles.iconCircleDark : styles.iconCircleGrey]}>
                <Sun size={22} color={lightActive ? '#c6e85a' : '#556253'} />
              </View>
              <TouchableOpacity
                style={[styles.toggleTrack, lightActive ? styles.toggleTrackActive : styles.toggleTrackInactive]}
                onPress={handleToggleLight}
                activeOpacity={0.8}
                accessibilityLabel="Toggle Perimeter Light"
              >
                <View style={[styles.toggleThumb, lightActive ? styles.toggleThumbRight : styles.toggleThumbLeft]}>
                  {lightActive ? (
                    <Check size={13} color="#161e00" strokeWidth={3} />
                  ) : (
                    <Power size={13} color="#757965" strokeWidth={2.5} />
                  )}
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.cardBody}>
              <Text style={[styles.actuatorTitle, lightActive ? styles.textDark : styles.textBlack]}>
                Perimeter Light
              </Text>
              <View style={styles.runningRow}>
                {lightActive ? (
                  <>
                    <Sun size={13} color="rgba(22, 30, 0, 0.8)" />
                    <Text style={styles.runningTextDark}>Running 45 min</Text>
                  </>
                ) : (
                  <>
                    <PauseCircle size={13} color="#556253" />
                    <Text style={styles.runningTextMuted}>Off • Standby</Text>
                  </>
                )}
              </View>
            </View>

            {/* Timer Pills */}
            <View style={[styles.timerDock, lightActive ? styles.timerDockActive : styles.timerDockInactive]}>
              {['15m', '30m', '60m', 'Dawn'].map((val) => {
                const isSelected = lightTimer === val;
                return (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.timerPill,
                      isSelected && (lightActive ? styles.timerPillSelectedDark : styles.timerPillSelectedLight),
                    ]}
                    onPress={() => handleSelectLightTimer(val)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.timerPillText,
                        isSelected
                          ? lightActive
                            ? styles.timerPillTextActiveDark
                            : styles.timerPillTextActiveLight
                          : lightActive
                          ? styles.timerPillTextInactiveDark
                          : styles.timerPillTextInactiveLight,
                      ]}
                    >
                      {val}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ACTUATOR 4: Pest Deterrent Siren (Hold to Activate) */}
          <View style={[styles.actuatorCard, styles.cardSiren]}>
            <View style={styles.cardHeader}>
              <View style={styles.sirenIconCircle}>
                <AlertTriangle size={22} color="#ba1a1a" />
              </View>
              <View style={styles.sirenReadyBadge}>
                <Lock size={12} color="#ba1a1a" />
                <Text style={styles.sirenReadyText}>READY</Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.sirenTitle}>Pest Deterrent Siren</Text>
              <View style={styles.runningRow}>
                <Volume2 size={13} color="#ba1a1a" />
                <Text style={styles.sirenSubtitle}>110 dB Frequency Blast</Text>
              </View>
            </View>

            {/* Tactile Hold-To-Activate Button */}
            <Pressable
              style={styles.sirenHoldButton}
              onPressIn={handleSirenPressIn}
              onPressOut={handleSirenPressOut}
              accessibilityLabel="Hold to activate pest siren"
            >
              <Animated.View
                style={[
                  styles.sirenProgressBar,
                  {
                    width: holdAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
              <View style={styles.sirenButtonContent}>
                <Volume2 size={16} color="#ba1a1a" />
                <Text style={styles.sirenButtonText}>
                  {sirenFired ? 'SIREN FIRED!' : sirenHolding ? 'HOLD (2s)...' : 'HOLD TO ACTIVATE'}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* 4. MASTER EMERGENCY STOP */}
        <View style={styles.emergencyCard}>
          <View style={styles.emergencyLeft}>
            <View style={styles.emergencyIconCircle}>
              <PowerOff size={20} color="#ba1a1a" />
            </View>
            <View style={styles.emergencyTextCol}>
              <Text style={styles.emergencyTitle}>Master Emergency Stop</Text>
              <Text style={styles.emergencySubtitle}>Instantly shut off all relays and pumps</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.emergencyAllOffBtn}
            onPress={handleEmergencyShutdown}
            activeOpacity={0.8}
            accessibilityLabel="All Off Emergency Stop"
          >
            <StopCircle size={15} color="#ffffff" />
            <Text style={styles.emergencyAllOffText}>ALL OFF</Text>
          </TouchableOpacity>
        </View>

        {/* 5. RECENT ACTIVITY */}
        <View style={styles.recentActivitySection}>
          <View style={styles.recentHeaderRow}>
            <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
            <TouchableOpacity
              style={styles.openLogCircleBtn}
              onPress={() => setShowLogModal(true)}
              activeOpacity={0.8}
              accessibilityLabel="Open Log"
            >
              <ArrowUpRight size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.recentLogCard}>
            {/* Event 1 */}
            <View style={styles.logItem}>
              <View style={[styles.logDot, { backgroundColor: '#516600' }]} />
              <View style={styles.logContent}>
                <View style={styles.logTitleRow}>
                  <Text style={styles.logTitle} numberOfLines={1}>
                    Borewell Pump turned ON
                  </Text>
                  <Text style={styles.logTimestamp}>10:42 AM</Text>
                </View>
                <Text style={styles.logSubtitle}>Source: Manual (Tap) • Duration set: 30m</Text>
              </View>
            </View>

            {/* Event 2 */}
            <View style={[styles.logItem, styles.logItemTint]}>
              <View style={[styles.logDot, { backgroundColor: '#556253' }]} />
              <View style={styles.logContent}>
                <View style={styles.logTitleRow}>
                  <Text style={styles.logTitle} numberOfLines={1}>
                    Perimeter Light turned OFF
                  </Text>
                  <Text style={styles.logTimestamp}>09:15 AM</Text>
                </View>
                <Text style={styles.logSubtitle}>Source: Schedule (Dawn Automated Sensor)</Text>
              </View>
            </View>

            {/* Event 3 */}
            <View style={styles.logItem}>
              <View style={[styles.logDot, { backgroundColor: '#576334' }]} />
              <View style={styles.logContent}>
                <View style={styles.logTitleRow}>
                  <Text style={styles.logTitle} numberOfLines={1}>
                    Drip Valve North ran for 20 min
                  </Text>
                  <Text style={styles.logTimestamp}>06:00 AM</Text>
                </View>
                <Text style={styles.logSubtitle}>Source: Automated Schedule Zone 2</Text>
              </View>
            </View>

            {/* Event 4 */}
            <View style={[styles.logItem, styles.logItemTint]}>
              <View style={[styles.logDot, { backgroundColor: '#c5c9b1' }]} />
              <View style={styles.logContent}>
                <View style={styles.logTitleRow}>
                  <Text style={styles.logTitle} numberOfLines={1}>
                    GSM Master reconnected
                  </Text>
                  <Text style={styles.logTimestamp}>Yesterday</Text>
                </View>
                <Text style={styles.logSubtitle}>Source: System Health (Cellular Handshake)</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 6. FIELD DEPLOYMENT MAP */}
        <View style={styles.deploymentCard}>
          <View style={styles.deploymentHeader}>
            <View>
              <Text style={styles.sectionTitle}>FIELD DEPLOYMENT</Text>
              <Text style={styles.deploymentSubtitle}>Borewell Cluster 3 • North Field Sector</Text>
            </View>
            <Text style={styles.deploymentBadge}>GPS Sync</Text>
          </View>

          <View style={styles.mapThumbnailContainer}>
            <Image source={{ uri: FIELD_MAP_IMG }} style={styles.mapThumbnailImage} resizeMode="cover" />
            <View style={styles.mapCoordPill}>
              <MapPin size={14} color="#c6e85a" />
              <Text style={styles.mapCoordText}>Lat 19.9975° N, Long 73.7898° E</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* FULL LOG MODAL */}
      <Modal visible={showLogModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Full Activity Log</Text>
              <TouchableOpacity
                onPress={() => setShowLogModal(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <X size={20} color="#191c1b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {recentCommands && recentCommands.length > 0 ? (
                recentCommands.map((cmd) => (
                  <View key={cmd.id} style={styles.fullLogItem}>
                    <View
                      style={[
                        styles.logDot,
                        {
                          backgroundColor:
                            cmd.status === 'acknowledged'
                              ? '#516600'
                              : cmd.status === 'failed'
                              ? '#ba1a1a'
                              : '#556253',
                        },
                      ]}
                    />
                    <View style={styles.fullLogContent}>
                      <View style={styles.logTitleRow}>
                        <Text style={styles.fullLogAction}>{cmd.action.replace('_', ' ')}</Text>
                        <Text style={styles.logTimestamp}>
                          {cmd.createdAt ? new Date(cmd.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </Text>
                      </View>
                      <Text style={styles.logSubtitle}>
                        Device: {cmd.deviceId} • Status: {cmd.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyLogView}>
                  <Text style={styles.emptyLogText}>No additional commands recorded yet.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* HARDWARE DOWNLINK SETTINGS MODAL */}
      <Modal visible={showMessageModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.settingsModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Hardware Gateway Downlink</Text>
              <TouchableOpacity
                onPress={() => setShowMessageModal(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <X size={20} color="#191c1b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.settingsModalDesc}>
              Dispatch a direct binary/text payload or AT command to Sentinel Node ({macAddress}):
            </Text>

            <TextInput
              style={styles.customTextInput}
              placeholder="e.g. AT+PING=1 or VALVE_CALIBRATE"
              placeholderTextColor="#757965"
              value={customMsg}
              onChangeText={setCustomMsg}
              autoCapitalize="characters"
            />

            <TouchableOpacity
              style={[styles.sendDownlinkBtn, !customMsg.trim() && styles.sendDownlinkDisabled]}
              onPress={handleSendCustomMessage}
              disabled={!customMsg.trim() || isSendingMsg}
              activeOpacity={0.8}
            >
              {isSendingMsg ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Send size={16} color="#ffffff" />
                  <Text style={styles.sendDownlinkText}>TRANSMIT DOWNLINK</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  headerRight: {
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
    fontSize: 18,
    fontWeight: '600',
    color: '#191c1b',
    letterSpacing: -0.3,
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#516600',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  // Meta Bar
  metaCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
    marginBottom: 20,
  },
  metaRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pingContainer: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pingRing: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#c6e85a',
  },
  pingDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#516600',
  },
  metaStatusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#191c1b',
  },
  metaMacText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#556253',
  },
  metaRowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f2',
  },
  metaTelemetryGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaTelemetryText: {
    fontSize: 12,
    color: '#556253',
  },
  metaBattBold: {
    fontWeight: '600',
    color: '#191c1b',
  },
  metaDot: {
    fontSize: 10,
    color: '#c5c9b1',
  },
  metaLiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaLiveText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#516600',
  },

  // Actuator Section Header
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#556253',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#556253',
    marginTop: 2,
  },
  activePill: {
    backgroundColor: '#c6e85a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#516600',
    letterSpacing: 0.4,
  },

  // Actuator Cards Grid
  cardsContainer: {
    gap: 14,
    marginBottom: 20,
  },
  actuatorCard: {
    borderRadius: 24,
    padding: 18,
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 3,
  },
  cardActiveLime: {
    backgroundColor: '#c6e85a',
  },
  cardInactiveWhite: {
    backgroundColor: '#ffffff',
  },
  cardSiren: {
    backgroundColor: '#ffdad6',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  actuatorIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleDark: {
    backgroundColor: '#161e00',
  },
  iconCircleGrey: {
    backgroundColor: '#edeeec',
  },
  sirenIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sirenReadyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  sirenReadyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ba1a1a',
    letterSpacing: 0.5,
  },

  // Toggle Switch
  toggleTrack: {
    width: 56,
    height: 32,
    borderRadius: 16,
    padding: 3,
    justifyContent: 'center',
  },
  toggleTrackActive: {
    backgroundColor: '#161e00',
  },
  toggleTrackInactive: {
    backgroundColor: '#e2e3e1',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  toggleThumbRight: {
    alignSelf: 'flex-end',
  },
  toggleThumbLeft: {
    alignSelf: 'flex-start',
  },

  cardBody: {
    marginTop: 14,
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  actuatorTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  textDark: {
    color: '#161e00',
  },
  textBlack: {
    color: '#191c1b',
  },
  textMuted: {
    color: '#556253',
  },
  rateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  rateBadgeDark: {
    backgroundColor: 'rgba(22, 30, 0, 0.15)',
  },
  rateBadgeLight: {
    backgroundColor: '#edeeec',
  },
  rateBadgeText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '600',
  },
  runningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  runningText: {
    fontSize: 13,
  },
  runningTextDark: {
    color: 'rgba(22, 30, 0, 0.85)',
    fontWeight: '500',
  },
  runningTextMuted: {
    color: '#556253',
  },

  // Timer Pills Dock
  timerDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 3,
    borderRadius: 20,
    gap: 4,
  },
  timerDockActive: {
    backgroundColor: 'rgba(22, 30, 0, 0.12)',
  },
  timerDockInactive: {
    backgroundColor: '#f3f4f2',
  },
  timerPill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerPillSelectedDark: {
    backgroundColor: '#161e00',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 1,
  },
  timerPillSelectedLight: {
    backgroundColor: '#516600',
  },
  timerPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timerPillTextActiveDark: {
    color: '#c6e85a',
  },
  timerPillTextInactiveDark: {
    color: 'rgba(22, 30, 0, 0.7)',
  },
  timerPillTextActiveLight: {
    color: '#ffffff',
  },
  timerPillTextInactiveLight: {
    color: '#556253',
  },

  // Inactive Hint Dock
  inactiveHintDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f4f2',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 18,
  },
  inactiveHintLabel: {
    fontSize: 12,
    color: '#556253',
  },
  inactiveHintValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#191c1b',
  },

  // Siren Card specifics
  sirenTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#93000a',
  },
  sirenSubtitle: {
    fontSize: 13,
    color: '#ba1a1a',
    fontWeight: '500',
  },
  sirenHoldButton: {
    position: 'relative',
    overflow: 'hidden',
    height: 46,
    borderRadius: 23,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ba1a1a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  sirenProgressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(186, 26, 26, 0.22)',
  },
  sirenButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 2,
  },
  sirenButtonText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#ba1a1a',
  },

  // Master Emergency Stop
  emergencyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
    marginBottom: 24,
  },
  emergencyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  emergencyIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ffdad6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyTextCol: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#191c1b',
  },
  emergencySubtitle: {
    fontSize: 12,
    color: '#556253',
    marginTop: 2,
  },
  emergencyAllOffBtn: {
    backgroundColor: '#ba1a1a',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#ba1a1a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  emergencyAllOffText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.4,
  },

  // Recent Activity Section
  recentActivitySection: {
    marginBottom: 24,
  },
  recentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  openLogCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#161e00',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#161e00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  recentLogCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 18,
    elevation: 2,
    gap: 6,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  logItemTint: {
    backgroundColor: 'rgba(243, 244, 242, 0.6)',
  },
  logDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    marginTop: 6,
  },
  logContent: {
    flex: 1,
  },
  logTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  logTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#191c1b',
    flex: 1,
  },
  logTimestamp: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#556253',
  },
  logSubtitle: {
    fontSize: 12,
    color: '#556253',
    marginTop: 2,
  },

  // Field Deployment Card
  deploymentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 18,
    elevation: 2,
    marginBottom: 16,
  },
  deploymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  deploymentSubtitle: {
    fontSize: 12,
    color: '#556253',
    marginTop: 2,
  },
  deploymentBadge: {
    fontSize: 12,
    color: '#556253',
    fontWeight: '500',
  },
  mapThumbnailContainer: {
    width: '100%',
    height: 144,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-end',
    padding: 10,
  },
  mapThumbnailImage: {
    ...StyleSheet.absoluteFill,
  },
  mapCoordPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(46, 49, 48, 0.88)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapCoordText: {
    fontSize: 12,
    color: '#f0f1ef',
    fontWeight: '500',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#191c1b',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    maxHeight: 400,
  },
  fullLogItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f2',
  },
  fullLogContent: {
    flex: 1,
  },
  fullLogAction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#191c1b',
  },
  emptyLogView: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyLogText: {
    fontSize: 14,
    color: '#556253',
  },

  // Settings modal
  settingsModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    margin: 20,
    padding: 20,
    alignSelf: 'center',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  settingsModalDesc: {
    fontSize: 13,
    color: '#556253',
    lineHeight: 18,
    marginBottom: 14,
  },
  customTextInput: {
    backgroundColor: '#f3f4f2',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#191c1b',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 16,
  },
  sendDownlinkBtn: {
    backgroundColor: '#516600',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sendDownlinkDisabled: {
    opacity: 0.5,
  },
  sendDownlinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
});
