import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Modal,
  TextInput,
  Alert,
  Linking,
  Platform,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Path } from 'react-native-svg';
import {
  ArrowLeft,
  User,
  Flashlight,
  FlashlightOff,
  Image as ImageIcon,
  AlertCircle,
  Package,
  Keyboard,
  ArrowUpRight,
  X,
  ArrowRight,
  CameraOff,
  Settings,
  CheckCircle2,
} from 'lucide-react-native';
import { useActiveFarm } from '../../src/context/FarmContext';
import { useLiveDevices } from '../../src/hooks/live';
import { registerDevice } from '../../src/services/api';
import type { RegisterDeviceInput, DeviceType } from '../../src/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type UIState = 'scanning' | 'invalid' | 'permission';

export default function ScanDeviceScreen() {
  const router = useRouter();
  const { activeFarm } = useActiveFarm();
  const { devices, refresh: refreshDevices } = useLiveDevices(activeFarm?.id);

  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

  // Manual entry modal
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [serialInput, setSerialInput] = useState('KR-GSM-9042');
  const [manualSubmitting, setManualSubmitting] = useState(false);

  // Inspector Preview State for Design Verification
  const [activeUIState, setActiveUIState] = useState<UIState>('scanning');

  // Scanning laser animation
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Continuous loop for laser scan
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 1600,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();

    return () => anim.stop();
  }, [laserAnim]);

  // Request camera permissions on mount
  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const laserTranslateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 204],
  });

  // Calculate next available Node ID (1 to 4)
  const getNextAvailableNodeId = (): number => {
    const existingNodeIds = new Set(devices.map((d) => d.nodeId));
    for (let i = 1; i <= 4; i++) {
      if (!existingNodeIds.has(i)) {
        return i;
      }
    }
    return 1;
  };

  // Common device registration handler
  const handleRegister = async (rawCode: string) => {
    if (!activeFarm) {
      Alert.alert('No Farm Selected', 'Please select a farm before pairing devices.');
      return;
    }

    if (devices.length >= 4) {
      Alert.alert(
        'Node Limit Reached',
        'This farm already has 4 controller nodes registered. Remove an unused node to pair a new one.'
      );
      return;
    }

    setIsProcessing(true);
    const code = rawCode.trim().toUpperCase();

    // Parse payload or construct device object
    let deviceInput: RegisterDeviceInput;

    try {
      if (code.startsWith('{') && code.endsWith('}')) {
        const parsed = JSON.parse(code);
        deviceInput = {
          nodeId: parsed.nodeId || getNextAvailableNodeId(),
          name: parsed.name || `Node #${parsed.nodeId || getNextAvailableNodeId()}`,
          type: (parsed.type as DeviceType) || 'sensor_actuator',
          capabilities: parsed.capabilities || ['PUMP', 'SOIL_MOISTURE', 'VALVE'],
          location: { zone: parsed.zone || 'Zone 1' },
        };
      } else {
        const nextNodeId = getNextAvailableNodeId();
        const isGateway = code.includes('GSM') || code.includes('MASTER') || nextNodeId === 1;

        deviceInput = {
          nodeId: nextNodeId,
          name: isGateway ? `GSM Master (${code})` : `Sensor Node 0${nextNodeId}`,
          type: isGateway ? 'gateway' : 'sensor_actuator',
          capabilities: isGateway
            ? ['PUMP', 'VALVE', 'LIGHT', 'SIREN']
            : ['SOIL_MOISTURE', 'TEMPERATURE', 'HUMIDITY'],
          location: { zone: `Plot ${nextNodeId}A` },
        };
      }

      await registerDevice(activeFarm.id, deviceInput);
      refreshDevices();

      Alert.alert(
        'Device Paired Successfully!',
        `${deviceInput.name} (Node #${deviceInput.nodeId}) is now connected and linked to ${activeFarm.name}.`,
        [
          {
            text: 'View Devices',
            onPress: () => {
              setManualModalVisible(false);
              router.replace('/(app)/(farm)/devices');
            },
          },
        ]
      );
    } catch (err: unknown) {
      // Trigger Invalid QR error state UI
      setActiveUIState('error' as UIState);
      const msg = err instanceof Error ? err.message : 'Registration failed';
      Alert.alert('Pairing Error', msg);
      setTimeout(() => {
        setActiveUIState('scanning');
        setHasScanned(false);
      }, 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  // Barcode scanned callback from expo-camera
  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (hasScanned || isProcessing || activeUIState !== 'scanning') return;
    setHasScanned(true);

    // Validate if data is recognized Krishiva format
    const isValid =
      data.toUpperCase().includes('KR-') ||
      data.toUpperCase().includes('GSM') ||
      data.toUpperCase().includes('NODE') ||
      data.startsWith('{');

    if (!isValid) {
      setActiveUIState('invalid');
      setTimeout(() => {
        setActiveUIState('scanning');
        setHasScanned(false);
      }, 3500);
      return;
    }

    router.push({
      pathname: '/(app)/confirm-device',
      params: {
        deviceId: data,
        farmId: activeFarm?.id || '',
      },
    });
    setTimeout(() => setHasScanned(false), 1500);
  };

  // Manual code submission
  const handleManualPair = () => {
    if (!serialInput.trim()) {
      Alert.alert('Required', 'Please enter a valid serial code or controller ID.');
      return;
    }
    setManualModalVisible(false);
    router.push({
      pathname: '/(app)/confirm-device',
      params: {
        deviceId: serialInput.trim(),
        farmId: activeFarm?.id || '',
      },
    });
  };

  const isInvalidState = activeUIState === 'invalid';
  const isNoPermsState =
    activeUIState === 'permission' || (permission !== null && !permission.granted);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9faf8" />

      {/* Topographic Contour Background Accent */}
      <View style={styles.topographicBg} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 400 800" fill="none">
          <Path
            d="M-50 120 C80 180, 260 90, 450 160 M-60 280 C120 320, 240 230, 460 310 M-40 450 C90 390, 280 480, 450 420 M-60 620 C140 680, 250 590, 460 650"
            stroke="#c5c9b1"
            strokeWidth="0.8"
            opacity="0.45"
          />
        </Svg>
      </View>

      {/* Screen Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color="#191c1b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Device Qr</Text>
        </View>

        <View style={styles.profileBadge}>
          <User size={18} color="#ffffff" />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Step Tracker Card */}
        <View style={styles.stepTracker}>
          <View style={styles.stepIndicatorRow}>
            <View style={styles.stepPillActive} />
            <View style={styles.stepDotInactive} />
            <View style={styles.stepDotInactive} />
            <View style={styles.stepDotInactive} />
          </View>
          <Text style={styles.stepText}>STEP 1 OF 4 • SCAN CONTROLLER QR</Text>
        </View>

        {/* Viewfinder Stage (Aspect ratio 4/5) */}
        <View style={styles.viewfinderStage}>
          {/* Live Camera View */}
          {permission?.granted && activeUIState !== 'permission' ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={
                hasScanned || isProcessing || activeUIState !== 'scanning'
                  ? undefined
                  : handleBarcodeScanned
              }
            />
          ) : (
            // Simulated Camera Preview Placeholder for Simulator / Dev inspection
            <View style={styles.cameraPlaceholder}>
              <View style={styles.placeholderBackdrop}>
                <Text style={styles.placeholderHardwareText}>KRISHIVA</Text>
                <Text style={styles.placeholderHardwareSub}>AGRITECH SOLUTIONS</Text>
                <View style={styles.placeholderBox}>
                  <Text style={styles.placeholderSmartText}>KRISHIVA SMART CONTROLLER</Text>
                  <Text style={styles.placeholderModelText}>KR-GSM-9042</Text>
                  <Text style={styles.placeholderMiniText}>Model: KSC-P1.5 • Input: 12V DC</Text>
                </View>
              </View>
            </View>
          )}

          {/* Vignette Scrim Overlays */}
          <View style={styles.vignetteOverlay} pointerEvents="none" />

          {/* Top Viewfinder Quick Action Floating Buttons */}
          <View style={styles.viewfinderTopActions}>
            {/* Flashlight Toggle */}
            <TouchableOpacity
              style={[
                styles.viewfinderActionBtn,
                torch && styles.viewfinderActionBtnActive,
              ]}
              onPress={() => setTorch(!torch)}
              activeOpacity={0.8}
              accessibilityLabel="Toggle flashlight"
            >
              {torch ? (
                <Flashlight size={20} color="#161e00" />
              ) : (
                <FlashlightOff size={20} color="#ffffff" />
              )}
            </TouchableOpacity>

            {/* Mode / Lens Status Badge */}
            <View style={styles.lensBadge}>
              <View style={styles.lensPulseDot} />
              <Text style={styles.lensBadgeText}>AI OCR ACTIVE</Text>
            </View>

            {/* Gallery Picker / Test Scan Trigger */}
            <TouchableOpacity
              style={styles.viewfinderActionBtn}
              onPress={() => {
                // Simulate invalid QR inspection demo
                setActiveUIState('invalid');
                setTimeout(() => setActiveUIState('scanning'), 2500);
              }}
              activeOpacity={0.8}
              accessibilityLabel="Simulate gallery scan"
            >
              <ImageIcon size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Central QR Scanning Reticle Area (224x224) */}
          <View style={styles.reticleBox}>
            {/* Corner Brackets */}
            <View
              style={[
                styles.cornerBracket,
                styles.bracketTL,
                isInvalidState && styles.bracketError,
              ]}
            />
            <View
              style={[
                styles.cornerBracket,
                styles.bracketTR,
                isInvalidState && styles.bracketError,
              ]}
            />
            <View
              style={[
                styles.cornerBracket,
                styles.bracketBL,
                isInvalidState && styles.bracketError,
              ]}
            />
            <View
              style={[
                styles.cornerBracket,
                styles.bracketBR,
                isInvalidState && styles.bracketError,
              ]}
            />

            {/* Animated Laser Beam */}
            {!isInvalidState && !isNoPermsState && (
              <Animated.View
                style={[
                  styles.scanLaser,
                  {
                    transform: [{ translateY: laserTranslateY }],
                  },
                ]}
              />
            )}

            {/* Error State Floating Toast */}
            {isInvalidState && (
              <View style={styles.errorToast}>
                <AlertCircle size={16} color="#ba1a1a" />
                <Text style={styles.errorToastText}>Not a Krishiva QR code</Text>
              </View>
            )}

            {/* Processing Spinner */}
            {isProcessing && (
              <View style={styles.processingCenter}>
                <ActivityIndicator size="small" color="#C6E85A" />
                <Text style={styles.processingText}>Pairing Node...</Text>
              </View>
            )}
          </View>

          {/* Live Telemetry / Alignment Prompt Floating Pill */}
          {!isInvalidState && !isNoPermsState && (
            <View style={styles.viewfinderBottomPill}>
              <View style={styles.pillPulseDot} />
              <Text style={styles.pillText}>ALIGN QR INSIDE FRAME</Text>
            </View>
          )}

          {/* Camera Permission Block Overlay */}
          {isNoPermsState && (
            <View style={styles.permissionOverlay}>
              <View style={styles.permissionIconCircle}>
                <CameraOff size={32} color="#556253" />
              </View>
              <Text style={styles.permissionTitle}>Camera Access Needed</Text>
              <Text style={styles.permissionBody}>
                Enable camera permissions in phone settings to scan Krishiva hardware
                controllers automatically.
              </Text>
              <TouchableOpacity
                style={styles.openSettingsBtn}
                onPress={() => {
                  if (Platform.OS === 'ios') {
                    Linking.openURL('app-settings:');
                  } else {
                    Linking.openSettings();
                  }
                }}
                activeOpacity={0.88}
              >
                <Settings size={18} color="#161e00" />
                <Text style={styles.openSettingsText}>Open Settings</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setManualModalVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.manualEntryLink}>Enter code manually</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Micro-Hint Card: Label Placement */}
        <View style={styles.hintCard}>
          <View style={styles.hintIconBox}>
            <Package size={20} color="#131e13" />
          </View>
          <View style={styles.hintTextColumn}>
            <Text style={styles.hintTitle}>Label Placement</Text>
            <Text style={styles.hintSubtitle}>
              The QR code is printed on the inside lid of the packaging.
            </Text>
          </View>
        </View>

        {/* Manual Input Fallback Option */}
        <View style={styles.manualSection}>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>CAN'T SCAN?</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.manualTriggerButton}
            onPress={() => setManualModalVisible(true)}
            activeOpacity={0.9}
          >
            <View style={styles.manualLeftRow}>
              <View style={styles.keyboardIconBox}>
                <Keyboard size={18} color="#556253" />
              </View>
              <Text style={styles.manualButtonText}>
                Enter model or serial code manually
              </Text>
            </View>
            <View style={styles.manualArrowCircle}>
              <ArrowUpRight size={16} color="#ffffff" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Interactive UI States Switcher for Design Review */}
        <View style={styles.previewStatesContainer}>
          <View style={styles.previewHeaderRow}>
            <Text style={styles.previewTitle}>PREVIEW UI STATES</Text>
            <Text style={styles.previewSubtitle}>Tap to inspect</Text>
          </View>

          <View style={styles.statesSegmentedRow}>
            <TouchableOpacity
              style={[
                styles.stateSegmentBtn,
                activeUIState === 'scanning' && styles.stateSegmentBtnActive,
              ]}
              onPress={() => setActiveUIState('scanning')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.stateSegmentText,
                  activeUIState === 'scanning' && styles.stateSegmentTextActive,
                ]}
              >
                Scanning
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.stateSegmentBtn,
                activeUIState === 'invalid' && styles.stateSegmentBtnActive,
              ]}
              onPress={() => setActiveUIState('invalid')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.stateSegmentText,
                  activeUIState === 'invalid' && styles.stateSegmentTextActive,
                ]}
              >
                Invalid QR
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.stateSegmentBtn,
                activeUIState === 'permission' && styles.stateSegmentBtnActive,
              ]}
              onPress={() => setActiveUIState('permission')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.stateSegmentText,
                  activeUIState === 'permission' && styles.stateSegmentTextActive,
                ]}
              >
                No Perms
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Manual Entry Bottom Sheet / Modal */}
      <Modal
        visible={manualModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setManualModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setManualModalVisible(false)}
          />

          <View style={styles.modalSheet}>
            {/* Grab Handle */}
            <View style={styles.modalHandle} />

            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Enter Controller ID</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setManualModalVisible(false)}
                activeOpacity={0.7}
              >
                <X size={18} color="#556253" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Located on the serial barcode label under the KR-GSM product sticker.
            </Text>

            {/* Input Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>DEVICE SERIAL NUMBER</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={serialInput}
                  onChangeText={setSerialInput}
                  placeholder="e.g. KR-GSM-9042"
                  placeholderTextColor="#757965"
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Pair Controller Button */}
            <TouchableOpacity
              style={styles.pairButton}
              onPress={handleManualPair}
              disabled={manualSubmitting}
              activeOpacity={0.88}
            >
              {manualSubmitting ? (
                <ActivityIndicator size="small" color="#161e00" />
              ) : (
                <>
                  <Text style={styles.pairButtonText}>Pair Controller</Text>
                  <ArrowRight size={18} color="#161e00" strokeWidth={2.2} />
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
  topographicBg: {
    ...StyleSheet.absoluteFill,
    opacity: 0.35,
  },
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(249, 250, 248, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.04)',
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
  },
  profileBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#516600',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  stepTracker: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 14,
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#edeeec',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 99,
    marginBottom: 8,
  },
  stepPillActive: {
    width: 24,
    height: 7,
    borderRadius: 99,
    backgroundColor: '#C6E85A',
  },
  stepDotInactive: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#e2e3e1',
  },
  stepText: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: '#454937',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  viewfinderStage: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#2e3130',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  vignetteOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  cameraPlaceholder: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#1E2A1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderBackdrop: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  placeholderHardwareText: {
    fontSize: 22,
    fontFamily: 'Manrope_700Bold',
    color: '#E2F59E',
    letterSpacing: 3,
  },
  placeholderHardwareSub: {
    fontSize: 10,
    fontFamily: 'Manrope_600SemiBold',
    color: '#8CA07E',
    letterSpacing: 2,
    marginBottom: 20,
  },
  placeholderBox: {
    width: 200,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#2e3b2e',
    borderWidth: 1,
    borderColor: '#455945',
    alignItems: 'center',
  },
  placeholderSmartText: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    color: '#C6E85A',
    marginBottom: 6,
    textAlign: 'center',
  },
  placeholderModelText: {
    fontSize: 18,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1,
  },
  placeholderMiniText: {
    fontSize: 8,
    fontFamily: 'Manrope_400Regular',
    color: '#A0B298',
    marginTop: 4,
  },
  viewfinderTopActions: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  viewfinderActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(46, 49, 48, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  viewfinderActionBtnActive: {
    backgroundColor: '#C6E85A',
  },
  lensBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 99,
    backgroundColor: 'rgba(46, 49, 48, 0.6)',
  },
  lensPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C6E85A',
  },
  lensBadgeText: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    color: '#ffffff',
    letterSpacing: 1.5,
  },
  reticleBox: {
    width: 224,
    height: 224,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  cornerBracket: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#C6E85A',
  },
  bracketTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 4,
  },
  bracketTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 4,
  },
  bracketBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 4,
  },
  bracketBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 4,
  },
  bracketError: {
    borderColor: '#ba1a1a',
  },
  scanLaser: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 2.5,
    backgroundColor: '#C6E85A',
    shadowColor: '#cef061',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    borderRadius: 2,
  },
  errorToast: {
    position: 'absolute',
    top: -46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: '#ffdad6',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  errorToastText: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: '#93000a',
  },
  processingCenter: {
    alignItems: 'center',
    gap: 8,
  },
  processingText: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    color: '#ffffff',
  },
  viewfinderBottomPill: {
    position: 'absolute',
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: 'rgba(46, 49, 48, 0.75)',
    zIndex: 20,
  },
  pillPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#C6E85A',
  },
  pillText: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: '#ffffff',
    letterSpacing: 1,
  },
  permissionOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(46, 49, 48, 0.95)',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
  },
  permissionIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#edeeec',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 18,
    fontFamily: 'Manrope_700Bold',
    color: '#ffffff',
    marginBottom: 6,
    textAlign: 'center',
  },
  permissionBody: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    color: '#e2e3e1',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 240,
    marginBottom: 20,
  },
  openSettingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 99,
    backgroundColor: '#C6E85A',
    marginBottom: 10,
  },
  openSettingsText: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: '#161e00',
  },
  manualEntryLink: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: '#b2d348',
    textDecorationLine: 'underline',
    paddingVertical: 4,
  },
  hintCard: {
    marginTop: 14,
    backgroundColor: '#f3f4f2',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hintIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#d8e7d4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintTextColumn: {
    flex: 1,
  },
  hintTitle: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: '#191c1b',
  },
  hintSubtitle: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
    marginTop: 2,
  },
  manualSection: {
    marginTop: 20,
    alignItems: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e7e8e6',
  },
  dividerText: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: '#757965',
    letterSpacing: 1.5,
  },
  manualTriggerButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#e7e8e6',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  manualLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  keyboardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#edeeec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualButtonText: {
    fontSize: 13.5,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
    flex: 1,
  },
  manualArrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E2A1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewStatesContainer: {
    marginTop: 24,
    paddingTop: 14,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  previewTitle: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: '#757965',
    letterSpacing: 1.5,
  },
  previewSubtitle: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
  },
  statesSegmentedRow: {
    flexDirection: 'row',
    backgroundColor: '#edeeec',
    padding: 3,
    borderRadius: 99,
  },
  stateSegmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 99,
  },
  stateSegmentBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  stateSegmentText: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: '#556253',
  },
  stateSegmentTextActive: {
    color: '#191c1b',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(30, 42, 30, 0.45)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalSheet: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e3e1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Manrope_700Bold',
    color: '#191c1b',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#edeeec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDescription: {
    fontSize: 12.5,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
    lineHeight: 18,
    marginBottom: 18,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: '#757965',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  inputContainer: {
    backgroundColor: '#f3f4f2',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 15,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#191c1b',
    letterSpacing: 1.5,
  },
  pairButton: {
    width: '100%',
    height: 52,
    borderRadius: 99,
    backgroundColor: '#C6E85A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#C6E85A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 3,
  },
  pairButtonText: {
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
    color: '#161e00',
  },
});
