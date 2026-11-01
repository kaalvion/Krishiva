import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import {
  ArrowLeft,
  User,
  Check,
  CheckCheck,
  Signal,
  Share2,
  ArrowUpRight,
  Sprout,
} from 'lucide-react-native';
import { useActiveFarm } from '../../src/context/FarmContext';

type TelemetryMode = 'online' | 'handshake';

export default function SetupCompleteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ deviceId?: string; farmId?: string }>();
  const { activeFarm } = useActiveFarm();

  const farmName = activeFarm?.name || 'Patil Farm';
  const [telemetryMode, setTelemetryMode] = useState<TelemetryMode>('online');

  const handleAddSensor = () => {
    router.push('/(app)/scan-device');
  };

  const handleGoToDevices = () => {
    router.replace('/(app)/(farm)/devices');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9faf8" />

      {/* Topographic Subtle Contour Background Lines */}
      <View style={styles.topographicBg} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 390 844" fill="none">
          <Path
            d="M-50,120 C60,90 140,160 250,110 C340,70 380,130 440,100"
            stroke="#c5c9b1"
            strokeWidth="0.75"
            opacity="0.5"
          />
          <Path
            d="M-40,180 C80,150 160,220 280,170 C360,130 400,200 450,160"
            stroke="#c5c9b1"
            strokeWidth="0.75"
            opacity="0.4"
          />
          <Path
            d="M-60,310 C50,270 130,340 240,290 C320,250 370,320 450,280"
            stroke="#c5c9b1"
            strokeWidth="0.75"
            opacity="0.35"
          />
          <Path
            d="M-30,470 C90,430 180,510 290,450 C370,410 400,480 450,440"
            stroke="#c5c9b1"
            strokeWidth="0.75"
            opacity="0.4"
          />
          <Path
            d="M-50,620 C70,580 150,650 260,600 C350,560 390,630 450,590"
            stroke="#c5c9b1"
            strokeWidth="0.75"
            opacity="0.35"
          />
          <Path
            d="M-40,760 C80,720 170,800 280,740 C360,700 410,770 450,730"
            stroke="#c5c9b1"
            strokeWidth="0.75"
            opacity="0.5"
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
        {/* Step Progress & Sub-Header Tracker */}
        <View style={styles.stepSection}>
          <View style={styles.stepHeaderRow}>
            <View style={styles.stepTagColumn}>
              <Text style={styles.stepTagText}>STEP 4 OF 4 • SETUP COMPLETE</Text>
              {/* 4-Dot Progress Gauge (All 4 filled with lime) */}
              <View style={styles.stepGauge}>
                <View style={styles.stepPillActive} />
                <View style={styles.stepPillActive} />
                <View style={styles.stepPillActive} />
                <View style={styles.stepPillActive} />
              </View>
            </View>

            <TouchableOpacity
              style={styles.checkDismissButton}
              onPress={handleGoToDevices}
              activeOpacity={0.8}
              accessibilityLabel="Dismiss and view farm overview"
            >
              <Check size={20} color="#191c1b" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Live Toast Notification Banner */}
        <View style={styles.liveToast}>
          <View style={styles.toastLeft}>
            <View style={styles.toastIconBox}>
              <View style={styles.pingCircle} />
              <CheckCheck size={18} color="#161e00" strokeWidth={2.5} />
            </View>
            <View style={styles.toastTextCol}>
              <Text style={styles.toastTitle} numberOfLines={1}>
                Main Controller is Online
              </Text>
              <Text style={styles.toastSubtitle} numberOfLines={1}>
                Ready to operate pump & irrigation valves
              </Text>
            </View>
          </View>
          <View style={styles.liveTag}>
            <Text style={styles.liveTagText}>LIVE</Text>
          </View>
        </View>

        {/* Central Hero Celebration Cluster */}
        <View style={styles.celebrationCluster}>
          <View style={styles.ringsContainer}>
            {/* Concentric Radiating Rings */}
            <View style={styles.outerRing} />
            <View style={styles.middleRing} />
            <View style={styles.innerRing} />

            {/* Confetti Spores Nodes */}
            <View style={[styles.sporeDot, styles.sporeTopLeft]} />
            <View style={[styles.sporeDot, styles.sporeBottomLeft]} />
            <View style={[styles.sporeDot, styles.sporeTopRight]} />
            <View style={[styles.sporeDot, styles.sporeBottomRight]} />
            <View style={[styles.sporeDot, styles.sporeTopCenter]} />

            {/* Central Checkmark Badge */}
            <View style={styles.centerBadge}>
              <Check size={44} color="#1E2A1E" strokeWidth={3} />
            </View>
          </View>

          {/* Typography */}
          <View style={styles.celebrationTextGroup}>
            <Text style={styles.celebrationTitle}>CONTROLLER ADDED!</Text>
            <Text style={styles.celebrationSubtext}>
              Your controller is securely bound to{' '}
              <Text style={styles.farmNameBold}>{farmName}</Text>. Relays and sensors are initialized.
            </Text>
          </View>
        </View>

        {/* Live Telemetry Status Card (Interactive Preview States) */}
        <View style={styles.telemetryCard}>
          {/* Card Header & State Switcher */}
          <View style={styles.telemetryHeaderRow}>
            <Text style={styles.telemetryCardLabel}>TELEMETRY MONITOR</Text>
            <View style={styles.togglePillContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  telemetryMode === 'online' && styles.toggleBtnActive,
                ]}
                onPress={() => setTelemetryMode('online')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.toggleBtnText,
                    telemetryMode === 'online' && styles.toggleBtnTextActive,
                  ]}
                >
                  Online
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  telemetryMode === 'handshake' && styles.toggleBtnActive,
                ]}
                onPress={() => setTelemetryMode('handshake')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.toggleBtnText,
                    telemetryMode === 'handshake' && styles.toggleBtnTextActive,
                  ]}
                >
                  Handshake
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* State: Online */}
          {telemetryMode === 'online' && (
            <View style={styles.telemetryView}>
              <View style={styles.telemetryBannerRow}>
                <View style={styles.statusWithDot}>
                  <View style={styles.armedDotRing}>
                    <View style={styles.armedDotCore} />
                  </View>
                  <Text style={styles.armedStatusText}>Online & Armed</Text>
                </View>
                <View style={styles.signalQualityBox}>
                  <Signal size={16} color="#516600" />
                  <Text style={styles.signalQualityText}>4G LTE (Strong)</Text>
                </View>
              </View>

              <View style={styles.metricsTwoCol}>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Roundtrip Latency</Text>
                  <View style={styles.metricValueRow}>
                    <Text style={styles.metricValueBig}>42</Text>
                    <Text style={styles.metricUnit}>ms</Text>
                  </View>
                </View>

                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Cellular Carrier</Text>
                  <View style={styles.metricValueRow}>
                    <Text style={styles.metricValueBig}>Jio M2M</Text>
                    <Text style={styles.metricBadgeEsim}>eSIM</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* State: Handshake */}
          {telemetryMode === 'handshake' && (
            <View style={styles.telemetryView}>
              <View style={styles.telemetryBannerRow}>
                <View style={styles.statusWithDot}>
                  <View style={styles.pulseDotOutline} />
                  <Text style={styles.armedStatusText}>Establishing 4G Tower Link</Text>
                </View>
                <View style={styles.scanningBadge}>
                  <Text style={styles.scanningBadgeText}>SCANNING</Text>
                </View>
              </View>

              <View style={styles.progressBarTrack}>
                <View style={styles.progressBarFill} />
              </View>

              <Text style={styles.handshakeSubtext}>
                Negotiating MQTT cryptographic credentials ({farmName.replace(/\s+/g, '-')}-Zone-A)...
              </Text>
            </View>
          )}

          {/* Device Spec Metadata Pill Container */}
          <View style={styles.deviceSpecPill}>
            <View style={styles.specIconCircle}>
              <Share2 size={16} color="#3d4a3c" />
            </View>
            <View style={styles.specTextCol}>
              <View style={styles.specTitleRow}>
                <Text style={styles.specDeviceName}>KRISHIVA-M1</Text>
                <View style={styles.specRevBadge}>
                  <Text style={styles.specRevText}>Rev 3.2</Text>
                </View>
              </View>
              <Text style={styles.specRelaysText} numberOfLines={1}>
                4 Relays Ready (Main Pump, Drip Valve, Field Lights, Siren)
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons Cluster */}
        <View style={styles.actionButtonsGroup}>
          {/* Primary Action Button: ADD WIRELESS SENSOR */}
          <TouchableOpacity
            style={styles.primarySensorButton}
            onPress={handleAddSensor}
            activeOpacity={0.88}
          >
            <Text style={styles.primarySensorText}>ADD WIRELESS SENSOR</Text>
            <View style={styles.primaryArrowCircle}>
              <ArrowUpRight size={20} color="#ffffff" strokeWidth={2.4} />
            </View>
          </TouchableOpacity>

          {/* Secondary Button: Go to Devices */}
          <TouchableOpacity
            style={styles.secondaryDevicesButton}
            onPress={handleGoToDevices}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryDevicesText}>Go to Devices</Text>
          </TouchableOpacity>
        </View>

        {/* Farm Unit Status Badge */}
        <View style={styles.syncPulseRow}>
          <Sprout size={14} color="#556253" />
          <Text style={styles.syncPulseText}>Sync frequency: Continuous telemetry (10s pulse)</Text>
        </View>
      </ScrollView>
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
    paddingBottom: 28,
  },
  stepSection: {
    marginBottom: 12,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepTagColumn: {
    gap: 4,
  },
  stepTagText: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: '#576334',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  stepGauge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  stepPillActive: {
    width: 22,
    height: 6,
    borderRadius: 99,
    backgroundColor: '#C6E85A',
  },
  checkDismissButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f3f4f2',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  liveToast: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
    marginBottom: 16,
  },
  toastLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  toastIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#cef061',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pingCircle: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#C6E85A',
    opacity: 0.5,
  },
  toastTextCol: {
    flex: 1,
  },
  toastTitle: {
    fontSize: 13.5,
    fontFamily: 'Manrope_700Bold',
    color: '#191c1b',
  },
  toastSubtitle: {
    fontSize: 11.5,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
    marginTop: 1,
  },
  liveTag: {
    backgroundColor: '#d8e7d4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  liveTagText: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    color: '#131e13',
    letterSpacing: 0.8,
  },
  celebrationCluster: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  ringsContainer: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  outerRing: {
    position: 'absolute',
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: 'rgba(211, 225, 166, 0.32)',
  },
  middleRing: {
    position: 'absolute',
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: 'rgba(198, 232, 90, 0.38)',
  },
  innerRing: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(198, 232, 90, 0.65)',
  },
  centerBadge: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#C6E85A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#516600',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 6,
    zIndex: 10,
  },
  sporeDot: {
    position: 'absolute',
    borderRadius: 99,
  },
  sporeTopLeft: {
    top: 6,
    left: 24,
    width: 10,
    height: 10,
    backgroundColor: '#cef061',
  },
  sporeBottomLeft: {
    bottom: 12,
    left: 14,
    width: 8,
    height: 8,
    backgroundColor: '#576334',
  },
  sporeTopRight: {
    top: 14,
    right: 20,
    width: 11,
    height: 11,
    backgroundColor: '#c6e85a',
  },
  sporeBottomRight: {
    bottom: 18,
    right: 28,
    width: 8,
    height: 8,
    backgroundColor: '#516600',
  },
  sporeTopCenter: {
    top: 0,
    right: 76,
    width: 6,
    height: 6,
    backgroundColor: '#556253',
  },
  celebrationTextGroup: {
    alignItems: 'center',
    marginTop: 14,
    paddingHorizontal: 20,
  },
  celebrationTitle: {
    fontSize: 27,
    fontFamily: 'Manrope_300Light',
    color: '#191c1b',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  celebrationSubtext: {
    fontSize: 13.5,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 4,
  },
  farmNameBold: {
    fontFamily: 'Manrope_700Bold',
    color: '#191c1b',
  },
  telemetryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 18,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
  },
  telemetryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  telemetryCardLabel: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: '#556253',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  togglePillContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f2',
    borderRadius: 99,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 99,
  },
  toggleBtnActive: {
    backgroundColor: '#C6E85A',
  },
  toggleBtnText: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: '#556253',
  },
  toggleBtnTextActive: {
    color: '#161e00',
  },
  telemetryView: {
    gap: 8,
    marginBottom: 12,
  },
  telemetryBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f4f2',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statusWithDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  armedDotRing: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(198, 232, 90, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  armedDotCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#516600',
  },
  armedStatusText: {
    fontSize: 13.5,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
  },
  signalQualityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  signalQualityText: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: '#556253',
  },
  metricsTwoCol: {
    flexDirection: 'row',
    gap: 8,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#f3f4f2',
    borderRadius: 14,
    padding: 12,
  },
  metricLabel: {
    fontSize: 11.5,
    fontFamily: 'Manrope_500Medium',
    color: '#556253',
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2,
  },
  metricValueBig: {
    fontSize: 18,
    fontFamily: 'Manrope_700Bold',
    color: '#191c1b',
  },
  metricUnit: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    color: '#556253',
  },
  metricBadgeEsim: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    color: '#516600',
    backgroundColor: '#d8e7d4',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  pulseDotOutline: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#757965',
  },
  scanningBadge: {
    backgroundColor: '#edeeec',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  scanningBadgeText: {
    fontSize: 9.5,
    fontFamily: 'Manrope_700Bold',
    color: '#556253',
  },
  progressBarTrack: {
    width: '100%',
    height: 7,
    borderRadius: 99,
    backgroundColor: '#e7e8e6',
    overflow: 'hidden',
    marginTop: 4,
  },
  progressBarFill: {
    width: '75%',
    height: '100%',
    backgroundColor: '#C6E85A',
    borderRadius: 99,
  },
  handshakeSubtext: {
    fontSize: 11.5,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
    lineHeight: 16,
    marginTop: 2,
  },
  deviceSpecPill: {
    backgroundColor: '#f3f4f2',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  specIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#d8e7d4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  specTextCol: {
    flex: 1,
  },
  specTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  specDeviceName: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: '#191c1b',
  },
  specRevBadge: {
    backgroundColor: '#edeeec',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  specRevText: {
    fontSize: 9.5,
    fontFamily: 'Manrope_700Bold',
    color: '#454937',
  },
  specRelaysText: {
    fontSize: 11.5,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
    marginTop: 1,
  },
  actionButtonsGroup: {
    gap: 10,
    marginTop: 4,
  },
  primarySensorButton: {
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
  primarySensorText: {
    fontSize: 14.5,
    fontFamily: 'Manrope_700Bold',
    color: '#1E2A1E',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  primaryArrowCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1E2A1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryDevicesButton: {
    width: '100%',
    height: 50,
    borderRadius: 99,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e3e1',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  secondaryDevicesText: {
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
  },
  syncPulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingBottom: 8,
  },
  syncPulseText: {
    fontSize: 11.5,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
  },
});
