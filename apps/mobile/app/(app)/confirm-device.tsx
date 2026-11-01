import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import {
  ArrowLeft,
  User,
  Copy,
  Signal,
  Power,
  Thermometer,
  Sprout,
  Radio,
  Share2,
  AlertCircle,
  QrCode,
  WifiOff,
  ArrowUpRight,
} from 'lucide-react-native';
import { useActiveFarm } from '../../src/context/FarmContext';
import { useLiveDevices } from '../../src/hooks/live';
import { registerDevice } from '../../src/services/api';

type EdgeCaseType = 'occupied' | 'invalid' | 'timeout';

export default function ConfirmDeviceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ deviceId?: string; farmId?: string }>();
  const { activeFarm } = useActiveFarm();

  const farmId = params.farmId || activeFarm?.id;
  const { devices, refresh: refreshDevices } = useLiveDevices(farmId);

  // Scanned Device ID / MAC
  const rawDeviceId = params.deviceId || 'A4:CF:12:B3:D4:E5';
  const displayMac = rawDeviceId.toUpperCase();

  // Edge Case Simulation Tab State
  const [activeEdgeCase, setActiveEdgeCase] = useState<EdgeCaseType | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Copy MAC address simulation / feedback
  const handleCopyMac = () => {
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  // Determine next available Node ID (1 to 4)
  const getNextAvailableNodeId = (): number => {
    const existingNodeIds = new Set(devices.map((d) => d.nodeId));
    for (let i = 1; i <= 4; i++) {
      if (!existingNodeIds.has(i)) {
        return i;
      }
    }
    return 1;
  };

  // Submit device pairing
  const handleAddToFarm = async () => {
    if (!farmId) {
      Alert.alert('No Farm Selected', 'Please select a farm before pairing devices.');
      return;
    }

    if (devices.length >= 4) {
      Alert.alert(
        'Farm Node Limit Reached',
        'This farm already has 4 controller nodes linked. Remove an inactive node before adding another.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const nextNodeId = getNextAvailableNodeId();
      const isGateway = displayMac.includes('GSM') || nextNodeId === 1;

      await registerDevice(farmId, {
        nodeId: nextNodeId,
        name: `KRISHIVA-M1 (${displayMac.slice(-5)})`,
        type: isGateway ? 'gateway' : 'sensor_actuator',
        capabilities: [
          'PUMP',
          'VALVE',
          'LIGHT',
          'SIREN',
          'SOIL_MOISTURE',
          'TEMPERATURE',
          'HUMIDITY',
        ],
        location: { zone: `Plot ${nextNodeId}B` },
      });

      refreshDevices();

      Alert.alert(
        'Device Paired Successfully!',
        `KRISHIVA-M1 (Node #${nextNodeId}) is now linked to ${activeFarm?.name || 'your farm'}.`,
        [
          {
            text: 'Go to Devices',
            onPress: () => router.replace('/(app)/(farm)/devices'),
          },
        ]
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not register controller';
      Alert.alert('Pairing Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9faf8" />

      {/* Topographic Contour Ambient Background Elements */}
      <View style={styles.topographicBg} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 390 1200" fill="none">
          <Path
            d="M-60 120 C 80 180, 240 80, 460 210 M-80 280 C 120 330, 290 220, 480 340 M-40 460 C 160 520, 280 430, 450 560 M-90 690 C 80 730, 270 620, 490 770 M-30 890 C 140 960, 310 870, 470 1020"
            stroke="#c5c9b1"
            strokeWidth="0.8"
            strokeDasharray="4 4"
            opacity="0.35"
          />
          <Path
            d="M-50 160 C 110 240, 250 140, 470 270 M-70 320 C 140 400, 300 290, 490 410 M-30 520 C 170 590, 290 500, 460 630"
            stroke="#c5c9b1"
            strokeWidth="0.5"
            opacity="0.25"
          />
        </Svg>
      </View>

      {/* Header Bar */}
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
        {/* Step Indicator & Header Metadata */}
        <View style={styles.stepSection}>
          <View style={styles.stepHeaderRow}>
            <Text style={styles.stepTagText}>STEP 2 OF 4 • CONFIRM CONTROLLER</Text>
            {/* 4-Dot Linear Step Gauge */}
            <View style={styles.stepGauge}>
              <View style={styles.stepPillActive} />
              <View style={styles.stepPillActive} />
              <View style={styles.stepDotInactive} />
              <View style={styles.stepDotInactive} />
            </View>
          </View>

          {/* Verified Chip */}
          <View style={styles.verifiedChip}>
            <View style={styles.pulseDot} />
            <Text style={styles.verifiedChipText}>DEVICE FOUND & VERIFIED</Text>
          </View>

          {/* Headline & Description */}
          <View style={styles.titleGroup}>
            <Text style={styles.displayHeadline}>DEVICE DETECTED</Text>
            <Text style={styles.subtext}>
              We successfully scanned and validated your Krishiva Smart Hub hardware signature.
            </Text>
          </View>
        </View>

        {/* Main Hardware Controller Summary Card */}
        <View style={styles.hardwareCard}>
          {/* Controller Diagram & Identity Header */}
          <View style={styles.controllerHeroRow}>
            {/* Rugged Industrial Enclosure Illustration */}
            <View style={styles.enclosureBox}>
              <Svg width={96} height={96} viewBox="0 0 100 100" fill="none">
                {/* Mounting Tabs */}
                <Rect x="44" y="6" width="12" height="6" rx="2" fill="#556253" />
                <Circle cx="50" cy="9" r="1.5" fill="#f9faf8" />
                <Rect x="44" y="88" width="12" height="6" rx="2" fill="#556253" />
                <Circle cx="50" cy="91" r="1.5" fill="#f9faf8" />

                {/* Antenna */}
                <Rect x="74" y="4" width="4" height="22" rx="2" fill="#191c1b" />
                <Circle cx="76" cy="4" r="2" fill="#516600" />

                {/* Main Rugged Body */}
                <Rect
                  x="18"
                  y="16"
                  width="64"
                  height="68"
                  rx="8"
                  fill="#e2e3e1"
                  stroke="#bccbb9"
                  strokeWidth="1.5"
                />

                {/* Screws */}
                <Circle cx="24" cy="22" r="1.5" fill="#757965" />
                <Circle cx="76" cy="22" r="1.5" fill="#757965" />
                <Circle cx="24" cy="78" r="1.5" fill="#757965" />
                <Circle cx="76" cy="78" r="1.5" fill="#757965" />

                {/* Sealed Faceplate */}
                <Rect x="26" y="28" width="48" height="44" rx="4" fill="#f3f4f2" />

                {/* Brand Badge */}
                <Rect x="32" y="34" width="36" height="10" rx="2" fill="#191c1b" />
                <Circle cx="36" cy="39" r="2" fill="#c6e85a" />
                <Path d="M42 37 L46 41 L50 37" stroke="#ffffff" strokeLinecap="round" strokeWidth="1" />

                {/* LED Array */}
                <Circle cx="33" cy="56" r="2.2" fill="#516600" />
                <Circle cx="41" cy="56" r="2.2" fill="#516600" />
                <Circle cx="49" cy="56" r="2.2" fill="#c6e85a" />
                <Circle cx="57" cy="56" r="2.2" fill="#757965" />
                <Circle cx="65" cy="56" r="2.2" fill="#757965" />

                {/* Terminal Block Grips */}
                <Rect x="30" y="65" width="40" height="3" rx="1" fill="#c5c9b1" />
              </Svg>

              <View style={styles.revTag}>
                <Text style={styles.revTagText}>REV 1.0</Text>
              </View>
            </View>

            {/* Name & Live State */}
            <View style={styles.identityColumn}>
              <Text style={styles.deviceName}>KRISHIVA-M1</Text>
              <Text style={styles.deviceType}>Agricultural Telemetry Hub</Text>
              <View style={styles.readyBadge}>
                <View style={styles.readyDot} />
                <Text style={styles.readyText}>Ready to Pair</Text>
              </View>
            </View>
          </View>

          {/* 2x2 Telemetry Specs Grid */}
          <View style={styles.specsGrid}>
            {/* MAC Address */}
            <View style={styles.specBox}>
              <Text style={styles.specLabel}>MAC ADDRESS</Text>
              <View style={styles.macRow}>
                <Text style={styles.specValueMac} numberOfLines={1}>
                  {displayMac}
                </Text>
                <TouchableOpacity
                  style={styles.copyIconBtn}
                  onPress={handleCopyMac}
                  activeOpacity={0.7}
                  accessibilityLabel="Copy MAC Address"
                >
                  <Copy size={14} color="#556253" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Firmware */}
            <View style={styles.specBox}>
              <Text style={styles.specLabel}>FIRMWARE</Text>
              <View style={styles.firmwareRow}>
                <Text style={styles.specValue}>v1.3.0</Text>
                <View style={styles.latestBadge}>
                  <Text style={styles.latestBadgeText}>Latest</Text>
                </View>
              </View>
            </View>

            {/* Hardware Spec */}
            <View style={styles.specBox}>
              <Text style={styles.specLabel}>HARDWARE SPEC</Text>
              <Text style={styles.specValue} numberOfLines={1}>
                Rev 1.0 (LTE/GSM)
              </Text>
            </View>

            {/* Signal Quality */}
            <View style={styles.specBox}>
              <Text style={styles.specLabel}>SIGNAL QUALITY</Text>
              <View style={styles.signalRow}>
                <Signal size={15} color="#516600" />
                <Text style={styles.specValue}>4G LTE (Strong)</Text>
              </View>
            </View>
          </View>

          {/* Copy Feedback */}
          {copiedToast && (
            <Text style={styles.copyFeedbackText}>MAC address copied to clipboard</Text>
          )}
        </View>

        {/* Onboard Field Capabilities Section */}
        <View style={styles.capabilitiesSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>THIS CONTROLLER HAS</Text>
            <Text style={styles.sectionMeta}>5 SUBSYSTEMS ACTIVE</Text>
          </View>

          {/* Capability Cards Stack */}
          <View style={styles.capabilitiesStack}>
            {/* Capability 1: 4 Relay Switch Outputs */}
            <View style={styles.capabilityCard}>
              <View style={styles.capIconCircle}>
                <Power size={20} color="#3d4a3c" />
              </View>
              <View style={styles.capTextColumn}>
                <Text style={styles.capTitle}>4 Relay Switch Outputs</Text>
                <Text style={styles.capSubtitle} numberOfLines={1}>
                  Direct control for Pump, Solenoid Valve, Light & Siren
                </Text>
              </View>
            </View>

            {/* Capability 2: Ambient Weather Micro-sensor */}
            <View style={styles.capabilityCard}>
              <View style={styles.capIconCircle}>
                <Thermometer size={20} color="#3d4a3c" />
              </View>
              <View style={styles.capTextColumn}>
                <Text style={styles.capTitle}>Ambient Weather Micro-sensor</Text>
                <Text style={styles.capSubtitle} numberOfLines={1}>
                  Real-time air temp, relative humidity & dew point
                </Text>
              </View>
            </View>

            {/* Capability 3: Multi-depth Soil Interface */}
            <View style={styles.capabilityCard}>
              <View style={styles.capIconCircle}>
                <Sprout size={20} color="#3d4a3c" />
              </View>
              <View style={styles.capTextColumn}>
                <Text style={styles.capTitle}>Multi-depth Soil Interface</Text>
                <Text style={styles.capSubtitle} numberOfLines={1}>
                  Compatible with volumetric moisture probes (10–60cm)
                </Text>
              </View>
            </View>

            {/* Capability 4: Integrated 4G LTE eSIM */}
            <View style={styles.capabilityCard}>
              <View style={styles.capIconCircle}>
                <Radio size={20} color="#3d4a3c" />
              </View>
              <View style={styles.capTextColumn}>
                <Text style={styles.capTitle}>Integrated 4G LTE eSIM</Text>
                <Text style={styles.capSubtitle} numberOfLines={1}>
                  Pre-provisioned rural multi-network roaming active
                </Text>
              </View>
            </View>

            {/* Capability 5: Mesh Gateway Coordinator */}
            <View style={styles.capabilityCard}>
              <View style={styles.capIconCircle}>
                <Share2 size={20} color="#3d4a3c" />
              </View>
              <View style={styles.capTextColumn}>
                <Text style={styles.capTitle}>Mesh Gateway Coordinator</Text>
                <Text style={styles.capSubtitle} numberOfLines={1}>
                  Supports up to 20 wireless canopy & moisture nodes
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Diagnostic Edge Scenarios Drawer Preview */}
        <View style={styles.edgeSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>DIAGNOSTIC EDGE SCENARIOS</Text>
            <Text style={styles.tapInspect}>Tap to preview state</Text>
          </View>

          {/* State Simulation Segmented Tabs */}
          <View style={styles.edgeTabsRow}>
            <TouchableOpacity
              style={[
                styles.edgeTabBtn,
                activeEdgeCase === 'occupied' && styles.edgeTabBtnActive,
              ]}
              onPress={() =>
                setActiveEdgeCase(activeEdgeCase === 'occupied' ? null : 'occupied')
              }
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.edgeTabText,
                  activeEdgeCase === 'occupied' && styles.edgeTabTextActive,
                ]}
              >
                Occupied
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.edgeTabBtn,
                activeEdgeCase === 'invalid' && styles.edgeTabBtnActive,
              ]}
              onPress={() =>
                setActiveEdgeCase(activeEdgeCase === 'invalid' ? null : 'invalid')
              }
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.edgeTabText,
                  activeEdgeCase === 'invalid' && styles.edgeTabTextActive,
                ]}
              >
                Invalid Code
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.edgeTabBtn,
                activeEdgeCase === 'timeout' && styles.edgeTabBtnActive,
              ]}
              onPress={() =>
                setActiveEdgeCase(activeEdgeCase === 'timeout' ? null : 'timeout')
              }
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.edgeTabText,
                  activeEdgeCase === 'timeout' && styles.edgeTabTextActive,
                ]}
              >
                Not Found
              </Text>
            </TouchableOpacity>
          </View>

          {/* Dynamic Edge Case Notice Container */}
          {activeEdgeCase === 'occupied' && (
            <View style={styles.edgeBannerError}>
              <View style={styles.edgeBannerTopRow}>
                <AlertCircle size={20} color="#ba1a1a" style={styles.edgeIcon} />
                <View style={styles.edgeTextCol}>
                  <Text style={styles.edgeBannerTitleError}>Device Already Registered</Text>
                  <Text style={styles.edgeBannerBody}>
                    This controller is bound to “Green Valley North (Plot 4)”. If you acquired this
                    hub, request an ownership handoff.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.edgeActionBtnError}
                onPress={() => Alert.alert('Transfer Request', 'Ownership transfer request initiated.')}
                activeOpacity={0.85}
              >
                <Text style={styles.edgeActionBtnText}>REQUEST TRANSFER</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeEdgeCase === 'invalid' && (
            <View style={styles.edgeBannerError}>
              <View style={styles.edgeBannerTopRow}>
                <QrCode size={20} color="#ba1a1a" style={styles.edgeIcon} />
                <View style={styles.edgeTextCol}>
                  <Text style={styles.edgeBannerTitleError}>Invalid Claim Signature</Text>
                  <Text style={styles.edgeBannerBody}>
                    The cryptographic security token in the scanned QR does not match this hardware batch.
                    Verify the laser-etched sticker inside the lid.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.edgeActionBtnError}
                onPress={() => router.back()}
                activeOpacity={0.85}
              >
                <Text style={styles.edgeActionBtnText}>RESCAN QR CODE</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeEdgeCase === 'timeout' && (
            <View style={styles.edgeBannerWarning}>
              <View style={styles.edgeBannerTopRow}>
                <WifiOff size={20} color="#576334" style={styles.edgeIcon} />
                <View style={styles.edgeTextCol}>
                  <Text style={styles.edgeBannerTitleWarning}>Hub Radio Offline</Text>
                  <Text style={styles.edgeBannerBodyWarning}>
                    Krishiva-M1 is not emitting telemetry. Check that the 12V terminal adapter is
                    plugged in and wait 60 seconds for the status LED to turn solid green.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.edgeActionBtnWarning}
                onPress={() => Alert.alert('Searching...', 'Probing nearby LoRa & GSM signals...')}
                activeOpacity={0.85}
              >
                <Text style={styles.edgeActionBtnTextWarning}>RETRY PROBE</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Space Anchor for Fixed Footer Clearance */}
        <View style={styles.footerSpacing} />
      </ScrollView>

      {/* Sticky Bottom Action Deck */}
      <View style={styles.stickyFooter}>
        <View style={styles.footerContent}>
          {/* Primary Action Button: ADD TO MY FARM */}
          <TouchableOpacity
            style={styles.addFarmButton}
            onPress={handleAddToFarm}
            disabled={isSubmitting}
            activeOpacity={0.88}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#1E2A1E" style={styles.spinner} />
            ) : (
              <>
                <Text style={styles.addFarmButtonText}>ADD TO MY FARM</Text>
                <View style={styles.addArrowCircle}>
                  <ArrowUpRight size={20} color="#ffffff" strokeWidth={2.5} />
                </View>
              </>
            )}
          </TouchableOpacity>

          {/* Secondary Action Link: Scan another device */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Scan another device</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    paddingTop: 12,
    paddingBottom: 20,
  },
  stepSection: {
    marginBottom: 16,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  stepTagText: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: '#454937',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  stepGauge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  stepPillActive: {
    width: 20,
    height: 6,
    borderRadius: 99,
    backgroundColor: '#C6E85A',
  },
  stepDotInactive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e2e3e1',
  },
  verifiedChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 99,
    backgroundColor: 'rgba(211, 225, 166, 0.65)',
    marginBottom: 10,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#516600',
  },
  verifiedChipText: {
    fontSize: 10.5,
    fontFamily: 'Manrope_700Bold',
    color: '#586435',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  titleGroup: {
    marginTop: 2,
  },
  displayHeadline: {
    fontSize: 27,
    fontFamily: 'Manrope_300Light',
    color: '#191c1b',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  subtext: {
    fontSize: 13.5,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
    lineHeight: 20,
    marginTop: 4,
  },
  hardwareCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  controllerHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#f3f4f2',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  enclosureBox: {
    width: 96,
    height: 96,
    borderRadius: 16,
    backgroundColor: 'rgba(226, 227, 225, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  revTag: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#ffffff',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 99,
  },
  revTagText: {
    fontSize: 8.5,
    fontFamily: 'Manrope_700Bold',
    color: '#556253',
  },
  identityColumn: {
    flex: 1,
  },
  deviceName: {
    fontSize: 18,
    fontFamily: 'Manrope_700Bold',
    color: '#191c1b',
    letterSpacing: 0.5,
  },
  deviceType: {
    fontSize: 12.5,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
    marginTop: 2,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(198, 232, 90, 0.45)',
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 99,
    marginTop: 8,
  },
  readyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#516600',
  },
  readyText: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    color: '#404b1f',
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  specBox: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#f3f4f2',
    borderRadius: 14,
    padding: 12,
  },
  specLabel: {
    fontSize: 10.5,
    fontFamily: 'Manrope_700Bold',
    color: '#757965',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  macRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  specValueMac: {
    fontSize: 12.5,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#191c1b',
    flex: 1,
  },
  copyIconBtn: {
    padding: 3,
  },
  firmwareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  specValue: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
    marginTop: 4,
  },
  latestBadge: {
    backgroundColor: '#d8e7d4',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 99,
  },
  latestBadgeText: {
    fontSize: 9.5,
    fontFamily: 'Manrope_700Bold',
    color: '#131e13',
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  copyFeedbackText: {
    fontSize: 11.5,
    fontFamily: 'Manrope_700Bold',
    color: '#516600',
    textAlign: 'center',
    marginTop: 8,
  },
  capabilitiesSection: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionHeading: {
    fontSize: 12.5,
    fontFamily: 'Manrope_700Bold',
    color: '#556253',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sectionMeta: {
    fontSize: 10.5,
    fontFamily: 'Manrope_600SemiBold',
    color: '#757965',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  capabilitiesStack: {
    gap: 8,
  },
  capabilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 13,
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
  },
  capIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#d8e7d4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  capTextColumn: {
    flex: 1,
  },
  capTitle: {
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
  },
  capSubtitle: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
    marginTop: 1,
  },
  edgeSection: {
    marginBottom: 16,
  },
  tapInspect: {
    fontSize: 11,
    fontFamily: 'Manrope_400Regular',
    color: '#757965',
  },
  edgeTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#edeeec',
    borderRadius: 99,
    padding: 3,
    marginBottom: 12,
  },
  edgeTabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 99,
  },
  edgeTabBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  edgeTabText: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: '#556253',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  edgeTabTextActive: {
    color: '#191c1b',
  },
  edgeBannerError: {
    backgroundColor: '#ffdad6',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  edgeBannerWarning: {
    backgroundColor: '#d3e1a6',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  edgeBannerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  edgeIcon: {
    marginTop: 2,
  },
  edgeTextCol: {
    flex: 1,
  },
  edgeBannerTitleError: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    color: '#ba1a1a',
  },
  edgeBannerTitleWarning: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    color: '#354016',
  },
  edgeBannerBody: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    color: '#93000a',
    lineHeight: 18,
    marginTop: 3,
  },
  edgeBannerBodyWarning: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    color: '#404b1f',
    lineHeight: 18,
    marginTop: 3,
  },
  edgeActionBtnError: {
    alignSelf: 'flex-end',
    backgroundColor: '#ba1a1a',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 99,
  },
  edgeActionBtnWarning: {
    alignSelf: 'flex-end',
    backgroundColor: '#576334',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 99,
  },
  edgeActionBtnText: {
    fontSize: 10.5,
    fontFamily: 'Manrope_700Bold',
    color: '#ffffff',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  edgeActionBtnTextWarning: {
    fontSize: 10.5,
    fontFamily: 'Manrope_700Bold',
    color: '#ffffff',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  footerSpacing: {
    height: 110,
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(249, 250, 248, 0.94)',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  footerContent: {
    maxWidth: 440,
    alignSelf: 'center',
    width: '100%',
    alignItems: 'center',
    gap: 6,
  },
  addFarmButton: {
    width: '100%',
    height: 56,
    borderRadius: 99,
    backgroundColor: '#C6E85A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 24,
    paddingRight: 8,
    shadowColor: '#C6E85A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 3,
  },
  addFarmButtonText: {
    fontSize: 14.5,
    fontFamily: 'Manrope_700Bold',
    color: '#1E2A1E',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  addArrowCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1E2A1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    flex: 1,
  },
  secondaryButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    color: '#556253',
  },
});
