import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, {
  Path,
  Polygon,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Line,
  Text as SvgText,
} from 'react-native-svg';
import {
  ArrowLeft,
  User,
  MoreVertical,
  Maximize2,
  CheckCircle2,
  Sprout,
  Droplets,
  Thermometer,
  Wind,
  Info,
  Radio,
  ArrowRight,
  ArrowUpRight,
  Edit3,
  WifiOff,
  Satellite,
  Zap,
} from 'lucide-react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../src/services/firebase';
import { useLiveDevices } from '../../../src/hooks/live';
import { issueCommand } from '../../../src/services/api';

const SATELLITE_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCDEFta9UbMoGp5R44v8_yUYfuNPu9FmAS47w7xWjsQNaOJrmMPKpW6pOKDm7m4AA64xt3jjXzRH4heJLmGU-TPCIB3HhTdezhhKF_2ovXJCJOL72n7yvQFRKqDGC0OnAn5dCMOSokxstAzekwfJtgiYpW0tvP-S0OTsgkZKW9EHD1vEOu68tr7Acqzv4ZO8azru_3WfrDcRXy99Yzeq3hPTJr08MC3KnJRvx0PL6Q';

type ViewState = 'live' | 'empty' | 'waiting';
type ChartFilter = 'moisture' | 'temp' | 'humidity';

export default function FieldDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { farmId, fieldId } = useLocalSearchParams<{ farmId?: string; fieldId?: string }>();

  // Active View State Switcher (Tabs)
  const [activeTab, setActiveTab] = useState<ViewState>('live');
  const [chartFilter, setChartFilter] = useState<ChartFilter>('moisture');
  const [pumpActive, setPumpActive] = useState<boolean>(true);

  // Field Data
  const [fieldName, setFieldName] = useState('NORTH FIELD');
  const [cropType, setCropType] = useState('Tomato (Abhinav)');
  const [plotId, setPlotId] = useState('PLOT #KR-204');
  const [acres, setAcres] = useState(1.2);

  // Live devices
  const { devices } = useLiveDevices(farmId || '');

  // Animation for sync dots
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  // Listen to Firestore field document if present
  useEffect(() => {
    if (!farmId || !fieldId) return;

    try {
      const fieldRef = doc(db, 'farms', farmId, 'fields', fieldId);
      const unsub = onSnapshot(fieldRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.name) setFieldName(data.name.toUpperCase());
          if (data.cropType) setCropType(data.cropType);
          if (data.acres) setAcres(data.acres);
        }
      });
      return () => unsub();
    } catch {
      // offline preview mode
    }
  }, [farmId, fieldId]);

  // Syncing animated dots
  useEffect(() => {
    if (activeTab === 'waiting') {
      const createBounce = (anim: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: -8,
              duration: 350,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 350,
              useNativeDriver: true,
            }),
          ])
        );
      };

      const b1 = createBounce(dot1Anim, 0);
      const b2 = createBounce(dot2Anim, 150);
      const b3 = createBounce(dot3Anim, 300);

      b1.start();
      b2.start();
      b3.start();

      return () => {
        b1.stop();
        b2.stop();
        b3.stop();
      };
    }
  }, [activeTab]);

  // Actuator pump toggle
  const handleTogglePump = async () => {
    const nextState = !pumpActive;
    setPumpActive(nextState);

    if (farmId) {
      try {
        await issueCommand({
          farmId,
          deviceId: 'master-hub-relay',
          action: nextState ? 'PUMP_ON' : 'PUMP_OFF',
        });
      } catch {
        // Optimistic UI state maintained
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. TOP APP BAR */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={22} color="#191c1b" />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {fieldName}
        </Text>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() =>
              Alert.alert(
                'Field Options',
                'Options: Recalibrate Boundary, Export NDVI Spectral Report, Clear Sensors.'
              )
            }
            activeOpacity={0.7}
          >
            <MoreVertical size={20} color="#191c1b" />
          </TouchableOpacity>

          <View style={styles.profileAvatar}>
            <User size={16} color="#ffffff" />
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. STATE SWITCHER TABS */}
        <View style={styles.tabContainer}>
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'live' && styles.tabBtnActive,
              ]}
              onPress={() => setActiveTab('live')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'live' && styles.tabTextActive,
                ]}
              >
                Live Telemetry
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'empty' && styles.tabBtnActive,
              ]}
              onPress={() => setActiveTab('empty')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'empty' && styles.tabTextActive,
                ]}
              >
                No Sensors
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'waiting' && styles.tabBtnActive,
              ]}
              onPress={() => setActiveTab('waiting')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'waiting' && styles.tabTextActive,
                ]}
              >
                Syncing Data
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. HERO MAP CARD (Always visible for spatial context) */}
        <View style={styles.heroMapCard}>
          <Image
            source={{ uri: SATELLITE_IMG }}
            style={styles.heroMapImage}
            resizeMode="cover"
          />

          {/* High-precision SVG Polygon Boundary Overlay */}
          <Svg
            style={StyleSheet.absoluteFill}
            viewBox="0 0 360 224"
            preserveAspectRatio="none"
          >
            <Polygon
              points="48,34 316,22 292,188 64,172"
              fill="#c6e85a"
              fillOpacity={0.22}
              stroke="#c6e85a"
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
            <Circle cx={48} cy={34} r={4.5} fill="#1e2a1e" stroke="#c6e85a" strokeWidth={2} />
            <Circle cx={316} cy={22} r={4.5} fill="#1e2a1e" stroke="#c6e85a" strokeWidth={2} />
            <Circle cx={292} cy={188} r={4.5} fill="#1e2a1e" stroke="#c6e85a" strokeWidth={2} />
            <Circle cx={64} cy={172} r={4.5} fill="#1e2a1e" stroke="#c6e85a" strokeWidth={2} />
            <SvgText
              x={180}
              y={108}
              fill="#1e2a1e"
              fontSize={11}
              fontWeight="700"
              fontFamily="Manrope"
              letterSpacing={0.08}
              textAnchor="middle"
            >
              POLYGON #KR-204
            </SvgText>
          </Svg>

          {/* Frosted Meta Tag Top-Left */}
          <View style={styles.heroTopTag}>
            <View style={styles.heroPulseDot} />
            <Text style={styles.heroTopTagText}>
              {acres} ACRES • {plotId}
            </Text>
          </View>

          {/* Frosted Expand Button Top-Right */}
          <TouchableOpacity
            style={styles.heroExpandBtn}
            onPress={() => router.push('/(app)/(farm)/farm-map')}
            activeOpacity={0.8}
            accessibilityLabel="Expand map"
          >
            <Maximize2 size={18} color="#ffffff" />
          </TouchableOpacity>

          {/* Bottom Frosted Survey Status Strip */}
          <View style={styles.heroBottomStrip}>
            <View style={styles.heroBottomLeft}>
              <CheckCircle2 size={16} color="#c6e85a" />
              <Text style={styles.heroBottomText}>
                GPS Boundary Verified • 4 Nodes
              </Text>
            </View>
            <Text style={styles.heroHighResTag}>HIGH RES</Text>
          </View>
        </View>

        {/* ========================================================= */}
        {/* VIEW VARIANT 1: LIVE TELEMETRY CONTENT                   */}
        {/* ========================================================= */}
        {activeTab === 'live' && (
          <View style={styles.liveContentContainer}>
            {/* 4. CROP LIFECYCLE & AGRONOMIC BAR CARD */}
            <View style={styles.card}>
              <View style={styles.cropHeaderRow}>
                <View style={styles.cropHeaderLeft}>
                  <View style={styles.cropIconCircle}>
                    <Sprout size={20} color="#516600" />
                  </View>
                  <View>
                    <Text style={styles.cropTitle}>{cropType}</Text>
                    <Text style={styles.cropPlantedText}>Planted 22 days ago</Text>
                  </View>
                </View>

                <View style={styles.solanaceaeBadge}>
                  <Text style={styles.solanaceaeText}>Solanaceae</Text>
                </View>
              </View>

              {/* Timeline Track */}
              <View style={styles.timelineBox}>
                <View style={styles.timelineLabelRow}>
                  <Text style={styles.dayCountText}>DAY 22 OF ~90</Text>
                  <Text style={styles.stageText}>Vegetative Stage</Text>
                </View>

                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: '28%' }]}>
                    <View style={styles.progressCap} />
                  </View>
                </View>

                <View style={styles.timelineFooterRow}>
                  <Text style={styles.timelineSubText}>Transplant (Day 1)</Text>
                  <Text style={styles.harvestText}>Est. harvest in 68 days</Text>
                </View>
              </View>
            </View>

            {/* 5. CURRENT CONDITIONS CARD */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardHeaderTitle}>CURRENT CONDITIONS</Text>
                <View style={styles.updatedBadge}>
                  <View style={styles.greenPulse} />
                  <Text style={styles.updatedText}>Updated 2m ago</Text>
                </View>
              </View>

              {/* 3 Metrics Tiles */}
              <View style={styles.conditionsGrid}>
                {/* Soil Moisture */}
                <View style={styles.metricTile}>
                  <View style={styles.metricTileTop}>
                    <Droplets size={16} color="#516600" />
                    <View style={styles.statusPillLime}>
                      <Text style={styles.statusPillLimeText}>HEALTHY</Text>
                    </View>
                  </View>
                  <View style={styles.metricTileMiddle}>
                    <Text style={styles.metricTileVal}>42%</Text>
                    <Text style={styles.metricTileLabel}>Soil VWC</Text>
                  </View>
                  <View style={styles.tileBarTrack}>
                    <View style={[styles.tileBarFillLime, { width: '42%' }]} />
                  </View>
                </View>

                {/* Temperature */}
                <View style={styles.metricTile}>
                  <View style={styles.metricTileTop}>
                    <Thermometer size={16} color="#576334" />
                    <View style={styles.statusPillSage}>
                      <Text style={styles.statusPillSageText}>OPTIMAL</Text>
                    </View>
                  </View>
                  <View style={styles.metricTileMiddle}>
                    <Text style={styles.metricTileVal}>28°C</Text>
                    <Text style={styles.metricTileLabel}>Air Canopy</Text>
                  </View>
                  <View style={styles.tileBarTrack}>
                    <View style={[styles.tileBarFillSage, { width: '58%' }]} />
                  </View>
                </View>

                {/* Humidity */}
                <View style={styles.metricTile}>
                  <View style={styles.metricTileTop}>
                    <Wind size={16} color="#556253" />
                    <View style={styles.statusPillNeutral}>
                      <Text style={styles.statusPillNeutralText}>NORMAL</Text>
                    </View>
                  </View>
                  <View style={styles.metricTileMiddle}>
                    <Text style={styles.metricTileVal}>64%</Text>
                    <Text style={styles.metricTileLabel}>Humidity</Text>
                  </View>
                  <View style={styles.tileBarTrack}>
                    <View style={[styles.tileBarFillNeutral, { width: '64%' }]} />
                  </View>
                </View>
              </View>
            </View>

            {/* 6. FARM HEALTH SCORE CARD (SEMICIRCLE GAUGE) */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardHeaderTitle}>FARM HEALTH SCORE</Text>
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert(
                      'Farm Health Index',
                      'Calculated using multispectral NDVI satellite index, soil volumetric hydration, and weather forecast risk models.'
                    )
                  }
                  activeOpacity={0.7}
                >
                  <Info size={17} color="#556253" />
                </TouchableOpacity>
              </View>

              {/* Gauge Graphic */}
              <View style={styles.gaugeContainer}>
                <Svg width={208} height={112} viewBox="0 0 200 110">
                  {/* Background Track Arc */}
                  <Circle
                    cx={100}
                    cy={100}
                    r={76}
                    fill="none"
                    stroke="#e7e8e6"
                    strokeWidth={14}
                    strokeDasharray="238.7 238.7"
                    strokeDashoffset={0}
                    strokeLinecap="round"
                    transform="rotate(180 100 100)"
                  />
                  {/* Active Score Arc (87%) */}
                  <Circle
                    cx={100}
                    cy={100}
                    r={76}
                    fill="none"
                    stroke="#c6e85a"
                    strokeWidth={14}
                    strokeDasharray="238.7 238.7"
                    strokeDashoffset={31}
                    strokeLinecap="round"
                    transform="rotate(180 100 100)"
                  />
                  {/* Indicator Beacon Node */}
                  <Circle cx={166} cy={62} r={5} fill="#516600" />
                </Svg>

                <View style={styles.gaugeTextStack}>
                  <Text style={styles.gaugeScore}>
                    87<Text style={styles.gaugeScoreTotal}>/100</Text>
                  </Text>
                  <Text style={styles.gaugeRating}>EXCELLENT</Text>
                </View>
              </View>

              <Text style={styles.gaugeSubtitle}>
                Healthy, balanced vegetative growth •{' '}
                <Text style={{ color: '#516600', fontWeight: '700' }}>+4 pts</Text> since last irrigation cycle
              </Text>

              {/* Breakdown Pills */}
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownBox}>
                  <Text style={styles.breakdownLabel}>MOISTURE</Text>
                  <Text style={styles.breakdownVal}>92%</Text>
                </View>
                <View style={styles.breakdownBox}>
                  <Text style={styles.breakdownLabel}>NUTRIENTS</Text>
                  <Text style={styles.breakdownVal}>84%</Text>
                </View>
                <View style={styles.breakdownBox}>
                  <Text style={styles.breakdownLabel}>PEST RISK</Text>
                  <Text style={[styles.breakdownVal, { color: '#516600' }]}>Low</Text>
                </View>
              </View>
            </View>

            {/* 7. SOIL MOISTURE, LAST 24H (CHART) */}
            <View style={styles.card}>
              <View style={styles.chartHeaderCol}>
                <Text style={styles.cardHeaderTitle}>SOIL MOISTURE, LAST 24H</Text>

                <View style={styles.chartFilterRow}>
                  <TouchableOpacity
                    style={[
                      styles.chartFilterBtn,
                      chartFilter === 'moisture' && styles.chartFilterActive,
                    ]}
                    onPress={() => setChartFilter('moisture')}
                  >
                    <Text
                      style={[
                        styles.chartFilterText,
                        chartFilter === 'moisture' && styles.chartFilterTextActive,
                      ]}
                    >
                      Moisture
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.chartFilterBtn,
                      chartFilter === 'temp' && styles.chartFilterActive,
                    ]}
                    onPress={() => setChartFilter('temp')}
                  >
                    <Text
                      style={[
                        styles.chartFilterText,
                        chartFilter === 'temp' && styles.chartFilterTextActive,
                      ]}
                    >
                      Temp
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.chartFilterBtn,
                      chartFilter === 'humidity' && styles.chartFilterActive,
                    ]}
                    onPress={() => setChartFilter('humidity')}
                  >
                    <Text
                      style={[
                        styles.chartFilterText,
                        chartFilter === 'humidity' && styles.chartFilterTextActive,
                      ]}
                    >
                      Humidity
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* SVG Line Chart Canvas */}
              <View style={styles.chartCanvas}>
                <Svg width="100%" height={120} viewBox="0 0 320 120" preserveAspectRatio="none">
                  <Defs>
                    <LinearGradient id="moistureGrad" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0%" stopColor="#c6e85a" stopOpacity={0.5} />
                      <Stop offset="100%" stopColor="#c6e85a" stopOpacity={0.0} />
                    </LinearGradient>
                  </Defs>

                  {/* 50% Upper Limit Guideline */}
                  <Line x1="0" y1="35" x2="320" y2="35" stroke="#e2e4de" strokeWidth={1} strokeDasharray="3 3" />
                  <SvgText x={315} y={32} fill="#757965" fontSize={9} fontFamily="Manrope" textAnchor="end">
                    50% Upper Limit
                  </SvgText>

                  {/* 30% Stress Floor Guideline */}
                  <Line x1="0" y1="85" x2="320" y2="85" stroke="#e2e4de" strokeWidth={1} strokeDasharray="3 3" />
                  <SvgText x={315} y={82} fill="#757965" fontSize={9} fontFamily="Manrope" textAnchor="end">
                    30% Stress Floor
                  </SvgText>

                  {/* Gradient Area Fill */}
                  <Path
                    d="M 0,70 C 40,65 80,48 120,44 C 160,40 200,68 240,60 C 270,54 290,51 320,50 L 320,120 L 0,120 Z"
                    fill="url(#moistureGrad)"
                  />

                  {/* Trend Curve Line */}
                  <Path
                    d="M 0,70 C 40,65 80,48 120,44 C 160,40 200,68 240,60 C 270,54 290,51 320,50"
                    fill="none"
                    stroke="#516600"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                  />

                  {/* Final Reading Beacon */}
                  <Circle cx={320} cy={50} r={4} fill="#516600" />
                  <Circle cx={320} cy={50} r={8} fill="#c6e85a" fillOpacity={0.4} />
                </Svg>

                <View style={styles.chartNowTag}>
                  <Text style={styles.chartNowTagText}>Now: 42%</Text>
                </View>
              </View>

              {/* Time Axis */}
              <View style={styles.timeAxisRow}>
                <Text style={styles.timeAxisText}>00:00</Text>
                <Text style={styles.timeAxisText}>06:00</Text>
                <Text style={styles.timeAxisText}>12:00</Text>
                <Text style={styles.timeAxisText}>18:00</Text>
                <Text style={[styles.timeAxisText, { color: '#516600', fontWeight: '700' }]}>Now</Text>
              </View>

              <TouchableOpacity
                style={styles.historyBtn}
                onPress={() => router.push('/(app)/(farm)/analytics')}
                activeOpacity={0.7}
              >
                <Text style={styles.historyBtnText}>VIEW 7-DAY HISTORY</Text>
                <ArrowRight size={14} color="#516600" />
              </TouchableOpacity>
            </View>

            {/* 8. LINKED DEVICES CARD */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardHeaderTitle}>LINKED DEVICES</Text>
                <View style={styles.activeDevicesBadge}>
                  <Text style={styles.activeDevicesText}>3 Active</Text>
                </View>
              </View>

              <View style={styles.devicesList}>
                {/* Node 1 */}
                <View style={styles.deviceRow}>
                  <View style={styles.deviceRowLeft}>
                    <View style={styles.deviceIconCircle}>
                      <Radio size={16} color="#556253" />
                    </View>
                    <View>
                      <Text style={styles.deviceName}>Node 1 (Root Zone)</Text>
                      <View style={styles.deviceStatusRow}>
                        <View style={styles.pulseDotSmall} />
                        <Text style={styles.deviceStatusText}>Online • Battery 94%</Text>
                      </View>
                    </View>
                  </View>
                  <Radio size={18} color="#516600" />
                </View>

                {/* Node 2 */}
                <View style={styles.deviceRow}>
                  <View style={styles.deviceRowLeft}>
                    <View style={styles.deviceIconCircle}>
                      <Thermometer size={16} color="#556253" />
                    </View>
                    <View>
                      <Text style={styles.deviceName}>Node 2 (Canopy Microclimate)</Text>
                      <View style={styles.deviceStatusRow}>
                        <View style={styles.pulseDotSmall} />
                        <Text style={styles.deviceStatusText}>Online • Battery 88%</Text>
                      </View>
                    </View>
                  </View>
                  <Radio size={18} color="#516600" />
                </View>

                {/* Main Pump Actuator */}
                <View style={styles.deviceRow}>
                  <View style={styles.deviceRowLeft}>
                    <View style={[styles.deviceIconCircle, { backgroundColor: '#c6e85a' }]}>
                      <Droplets size={16} color="#161e00" />
                    </View>
                    <View>
                      <Text style={styles.deviceName}>Main Pump (Relay 1)</Text>
                      <Text style={[styles.deviceStatusText, { color: pumpActive ? '#516600' : '#757965' }]}>
                        {pumpActive ? 'Active • Fertigation Valve Open' : 'Off • Idle'}
                      </Text>
                    </View>
                  </View>

                  {/* Switch Toggle */}
                  <TouchableOpacity
                    style={[
                      styles.pumpSwitchTrack,
                      pumpActive ? styles.pumpSwitchOn : styles.pumpSwitchOff,
                    ]}
                    onPress={handleTogglePump}
                    activeOpacity={0.85}
                  >
                    <View
                      style={[
                        styles.pumpSwitchThumb,
                        pumpActive ? styles.pumpThumbOn : styles.pumpThumbOff,
                      ]}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* VIEW VARIANT 2: EMPTY STATE (NO SENSORS)                  */}
        {/* ========================================================= */}
        {activeTab === 'empty' && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <WifiOff size={34} color="#757965" />
            </View>

            <Text style={styles.emptyHeadline}>No sensors linked yet</Text>
            <Text style={styles.emptyDescription}>
              Pair a wireless LoRa soil node to monitor live moisture, root temperature, and weather metrics in {fieldName}.
            </Text>

            <TouchableOpacity
              style={styles.addLoraBtn}
              onPress={() => router.push('/(app)/scan-device')}
              activeOpacity={0.88}
            >
              <Text style={styles.addLoraBtnText}>ADD LORA DEVICE</Text>
              <View style={styles.addLoraArrowCap}>
                <ArrowRight size={16} color="#ffffff" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* ========================================================= */}
        {/* VIEW VARIANT 3: SYNCING DATA (WAITING STATE)             */}
        {/* ========================================================= */}
        {activeTab === 'waiting' && (
          <View style={styles.emptyCard}>
            <View style={styles.syncRadarCircle}>
              <Satellite size={32} color="#516600" />
            </View>

            <Text style={styles.emptyHeadline}>Waiting for telemetry...</Text>
            <Text style={styles.emptyDescription}>
              Subscribed to Gateway GW-09. First packet sync takes 30-60 seconds after device handshake.
            </Text>

            {/* 3 Animated Bouncing Dots */}
            <View style={styles.bouncingDotsRow}>
              <Animated.View
                style={[
                  styles.bouncingDot,
                  { backgroundColor: '#516600', transform: [{ translateY: dot1Anim }] },
                ]}
              />
              <Animated.View
                style={[
                  styles.bouncingDot,
                  { backgroundColor: '#c6e85a', transform: [{ translateY: dot2Anim }] },
                ]}
              />
              <Animated.View
                style={[
                  styles.bouncingDot,
                  { backgroundColor: '#576334', transform: [{ translateY: dot3Anim }] },
                ]}
              />
            </View>

            <View style={styles.syncStatusPill}>
              <Text style={styles.syncStatusPillText}>
                Status: Listening on LoRaWAN EU868
              </Text>
            </View>
          </View>
        )}

        {/* 9. BOTTOM EDIT FIELD ACTION */}
        <TouchableOpacity
          style={styles.editFieldBtn}
          onPress={() =>
            router.push({
              pathname: '/(app)/(farm)/new-field',
              params: { farmId, fieldId },
            })
          }
          activeOpacity={0.8}
        >
          <Edit3 size={16} color="#191c1b" />
          <Text style={styles.editFieldBtnText}>EDIT FIELD DETAILS</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9faf8',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // 1. TOP APP BAR
  header: {
    height: 54,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(249, 250, 248, 0.9)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    color: '#191c1b',
    letterSpacing: 2,
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#516600',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  // 2. STATE SWITCHER TABS
  tabContainer: {
    marginVertical: 12,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#edeeec',
    borderRadius: 24,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#c6e85a',
    shadowColor: '#516600',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: '#556253',
  },
  tabTextActive: {
    fontFamily: 'Manrope_800ExtraBold',
    color: '#161e00',
  },

  // 3. HERO MAP CARD
  heroMapCard: {
    width: '100%',
    height: 224,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#e7e8e6',
    marginBottom: 16,
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  heroMapImage: {
    width: '100%',
    height: '100%',
  },
  heroTopTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(46, 49, 48, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  heroPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#c6e85a',
  },
  heroTopTagText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9.5,
    color: '#ffffff',
    letterSpacing: 0.8,
  },
  heroExpandBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(46, 49, 48, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBottomStrip: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(46, 49, 48, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBottomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroBottomText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11.5,
    color: '#ffffff',
  },
  heroHighResTag: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9.5,
    color: '#dbe9ae',
    letterSpacing: 0.8,
  },

  // COMMON CARD STYLING
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeaderTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12.5,
    color: '#191c1b',
    letterSpacing: 0.8,
  },

  // 4. CROP LIFECYCLE
  cropHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cropHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cropIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#d3e1a6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14.5,
    color: '#191c1b',
  },
  cropPlantedText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11.5,
    color: '#556253',
    marginTop: 1,
  },
  solanaceaeBadge: {
    backgroundColor: '#f3f4f2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  solanaceaeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: '#5b6859',
  },
  timelineBox: {
    backgroundColor: '#f3f4f2',
    borderRadius: 16,
    padding: 12,
    gap: 6,
  },
  timelineLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayCountText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    color: '#191c1b',
    letterSpacing: 0.8,
  },
  stageText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10.5,
    color: '#516600',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e2e3e1',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#c6e85a',
    borderRadius: 4,
    position: 'relative',
  },
  progressCap: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 6,
    borderRadius: 3,
    backgroundColor: '#3c4d00',
  },
  timelineFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  timelineSubText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: '#556253',
  },
  harvestText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: '#516600',
  },

  // 5. CURRENT CONDITIONS
  updatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f3f4f2',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 10,
  },
  greenPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#516600',
  },
  updatedText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    color: '#556253',
  },
  conditionsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  metricTile: {
    flex: 1,
    backgroundColor: '#f3f4f2',
    borderRadius: 14,
    padding: 10,
    justifyContent: 'space-between',
    minHeight: 90,
  },
  metricTileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusPillLime: {
    backgroundColor: '#c6e85a',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillLimeText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 8.5,
    color: '#161e00',
  },
  statusPillSage: {
    backgroundColor: '#d8e7d4',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillSageText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 8.5,
    color: '#131e13',
  },
  statusPillNeutral: {
    backgroundColor: '#e7e8e6',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillNeutralText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 8.5,
    color: '#454937',
  },
  metricTileMiddle: {
    marginVertical: 4,
  },
  metricTileVal: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 18,
    color: '#191c1b',
  },
  metricTileLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10,
    color: '#556253',
  },
  tileBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e3e1',
    overflow: 'hidden',
  },
  tileBarFillLime: {
    height: '100%',
    backgroundColor: '#c6e85a',
    borderRadius: 2,
  },
  tileBarFillSage: {
    height: '100%',
    backgroundColor: '#bfcd94',
    borderRadius: 2,
  },
  tileBarFillNeutral: {
    height: '100%',
    backgroundColor: '#bccbb9',
    borderRadius: 2,
  },

  // 6. HEALTH SCORE GAUGE
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
    position: 'relative',
  },
  gaugeTextStack: {
    position: 'absolute',
    bottom: 2,
    alignItems: 'center',
  },
  gaugeScore: {
    fontFamily: 'Manrope_300Light',
    fontSize: 34,
    color: '#191c1b',
  },
  gaugeScoreTotal: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 16,
    color: '#556253',
  },
  gaugeRating: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    color: '#516600',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  gaugeSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
    color: '#556253',
    textAlign: 'center',
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    gap: 8,
  },
  breakdownBox: {
    flex: 1,
    backgroundColor: '#f3f4f2',
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  breakdownLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9.5,
    color: '#556253',
    letterSpacing: 0.5,
  },
  breakdownVal: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    color: '#191c1b',
    marginTop: 2,
  },

  // 7. CHART SECTION
  chartHeaderCol: {
    marginBottom: 10,
  },
  chartFilterRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  chartFilterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#f3f4f2',
  },
  chartFilterActive: {
    backgroundColor: '#c6e85a',
  },
  chartFilterText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10.5,
    color: '#556253',
  },
  chartFilterTextActive: {
    fontFamily: 'Manrope_800ExtraBold',
    color: '#161e00',
  },
  chartCanvas: {
    height: 120,
    position: 'relative',
    marginVertical: 4,
  },
  chartNowTag: {
    position: 'absolute',
    top: 14,
    right: 0,
    backgroundColor: '#2e3130',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  chartNowTagText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9.5,
    color: '#ffffff',
  },
  timeAxisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 6,
  },
  timeAxisText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10.5,
    color: '#556253',
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 10,
    marginTop: 4,
  },
  historyBtnText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    color: '#516600',
    letterSpacing: 0.8,
  },

  // 8. LINKED DEVICES
  activeDevicesBadge: {
    backgroundColor: '#c6e85a',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 10,
  },
  activeDevicesText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    color: '#161e00',
  },
  devicesList: {
    gap: 8,
  },
  deviceRow: {
    backgroundColor: '#f3f4f2',
    borderRadius: 14,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deviceRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  deviceIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e7e8e6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: '#191c1b',
  },
  deviceStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  pulseDotSmall: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#516600',
  },
  deviceStatusText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: '#556253',
  },
  pumpSwitchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  pumpSwitchOn: {
    backgroundColor: '#516600',
  },
  pumpSwitchOff: {
    backgroundColor: '#e2e3e1',
  },
  pumpSwitchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  pumpThumbOn: {
    alignSelf: 'flex-end',
  },
  pumpThumbOff: {
    alignSelf: 'flex-start',
  },

  // 10. EMPTY STATE
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 16,
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f3f4f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyHeadline: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    color: '#191c1b',
    marginBottom: 6,
  },
  emptyDescription: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12.5,
    color: '#556253',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  addLoraBtn: {
    height: 48,
    paddingLeft: 22,
    paddingRight: 6,
    borderRadius: 24,
    backgroundColor: '#c6e85a',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#c6e85a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 2,
  },
  addLoraBtnText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11.5,
    color: '#161e00',
    letterSpacing: 1,
  },
  addLoraArrowCap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#131e13',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 11. SYNCING STATE
  syncRadarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f3f4f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: 'rgba(198, 232, 90, 0.4)',
  },
  bouncingDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 14,
  },
  bouncingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  syncStatusPill: {
    backgroundColor: '#f3f4f2',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginTop: 4,
  },
  syncStatusPillText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: '#556253',
  },

  // 12. BOTTOM ACTIONS
  editFieldBtn: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    marginTop: 6,
  },
  editFieldBtnText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    color: '#191c1b',
    letterSpacing: 1.1,
  },
  liveContentContainer: {
    width: '100%',
  },
});
