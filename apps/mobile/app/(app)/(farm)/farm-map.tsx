import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, {
  Path,
  Polygon,
  Rect,
  Text as SvgText,
  G,
  Defs,
  RadialGradient,
  LinearGradient,
  Stop,
  ClipPath,
} from 'react-native-svg';
import {
  ArrowLeft,
  User,
  Layers,
  Droplets,
  Thermometer,
  Sprout,
  SlidersHorizontal,
  Navigation,
  Plus,
  Minus,
  Crosshair,
  Radio,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Wifi,
} from 'lucide-react-native';

const MAP_HEIGHT = 560;

type FilterMode = 'moisture' | 'thermal' | 'ndvi' | 'vra';

interface SensorPin {
  id: string;
  label: string;
  top: number;
  left: number;
  vwc: string;
  title: string;
  desc: string;
  meta: string;
  color: string;
  valveLabel: string;
}

const PINS: SensorPin[] = [
  {
    id: 'N1',
    label: 'N1',
    top: 210,
    left: 275,
    vwc: '48%',
    title: 'Sector 4 • Sensor Node 1',
    desc: 'Optimal moisture zone',
    meta: '18m from Node 1 • Depth 20cm',
    color: '#C6E85A',
    valveLabel: 'Valve 1',
  },
  {
    id: 'N2',
    label: 'N2',
    top: 340,
    left: 175,
    vwc: '38%',
    title: 'Sector 4 • Node 2',
    desc: 'Moderate volumetric range',
    meta: '12m offset • Sensor Depth: 25cm',
    color: '#2E7D32',
    valveLabel: 'Valve 2',
  },
  {
    id: 'N3',
    label: 'N3',
    top: 450,
    left: 108,
    vwc: '29%',
    title: 'Sector 4 • Sensor Node 3',
    desc: 'Immediate Irrigation Required',
    meta: '32m from Node 3 • Depth 30cm',
    color: '#FFB300',
    valveLabel: 'Valve 3',
  },
  {
    id: 'N4',
    label: 'N4',
    top: 420,
    left: 295,
    vwc: '54%',
    title: 'Sector 4 • Sensor Node 4',
    desc: 'Deep saturation profile',
    meta: '8m from Node 4 • Depth 25cm',
    color: '#2E7D32',
    valveLabel: 'Valve 4',
  },
  {
    id: 'N5',
    label: 'N5',
    top: 505,
    left: 215,
    vwc: '44%',
    title: 'Sector 4 • Sensor Node 5',
    desc: 'Balanced profile',
    meta: '21m from Node 5 • Depth 15cm',
    color: '#C6E85A',
    valveLabel: 'Valve 5',
  },
];

export default function FarmMapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { farmId } = useLocalSearchParams<{ farmId?: string }>();

  const [activeFilter, setActiveFilter] = useState<FilterMode>('moisture');
  const [activePinId, setActivePinId] = useState<string>('N2');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const toastAnim = useRef(new Animated.Value(-60)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Beacon pulse animation for live active sensor pin
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

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

  const handleRefreshPulse = () => {
    setIsRefreshing(true);
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start(() => {
      spinAnim.setValue(0);
      setIsRefreshing(false);
      showToast('Telemetry mesh synchronized (5/5 nodes)');
    });
  };

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const activePin = PINS.find((p) => p.id === activePinId) || PINS[1];

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
          <Text style={styles.topAppTitle}>FARM MAP</Text>
        </View>

        <View style={styles.topAppRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => showToast('Layer options: Satellite + Soil Hydrology')}
          >
            <Layers size={22} color="#556253" />
          </TouchableOpacity>
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

      {/* 2. SCROLLABLE SCREEN BODY */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 30 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* MAP VIEWPORT CANVAS (HERO AREA) */}
        <View style={styles.mapCanvas}>
          {/* Base Satellite Imagery */}
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1000',
            }}
            style={styles.basemapImage}
            resizeMode="cover"
          />

          {/* SVG Vector Overlays */}
          <Svg
            style={StyleSheet.absoluteFill}
            viewBox={`0 0 390 ${MAP_HEIGHT}`}
            preserveAspectRatio="none"
          >
            <Defs>
              {/* Radial Multi-stop Heatmap Gradients for Moisture Variance */}
              <RadialGradient
                id="moistureHeat"
                cx="48%"
                cy="46%"
                r="52%"
                fx="48%"
                fy="46%"
              >
                <Stop offset="0%" stopColor="#2E7D32" stopOpacity={0.82} />
                <Stop offset="35%" stopColor="#C6E85A" stopOpacity={0.75} />
                <Stop offset="65%" stopColor="#FFB300" stopOpacity={0.70} />
                <Stop offset="92%" stopColor="#E53935" stopOpacity={0.78} />
                <Stop offset="100%" stopColor="#E53935" stopOpacity={0.85} />
              </RadialGradient>

              <RadialGradient
                id="coreHydration"
                cx="62%"
                cy="38%"
                r="35%"
                fx="62%"
                fy="38%"
              >
                <Stop offset="0%" stopColor="#2E7D32" stopOpacity={0.70} />
                <Stop offset="60%" stopColor="#C6E85A" stopOpacity={0.45} />
                <Stop offset="100%" stopColor="#C6E85A" stopOpacity={0} />
              </RadialGradient>

              <ClipPath id="fieldBoundaryClip">
                <Polygon points="68,175 324,198 348,515 220,548 76,492" />
              </ClipPath>
            </Defs>

            {/* Topographic Elevation Curves */}
            <Path
              d="M-20,180 C80,140 180,240 280,200 C340,170 380,210 420,190"
              stroke="#FFFFFF"
              strokeDasharray="4 6"
              strokeWidth={1.2}
              opacity={0.25}
              fill="none"
            />
            <Path
              d="M-30,320 C100,290 190,380 290,340 C350,310 400,350 440,330"
              stroke="#FFFFFF"
              strokeDasharray="4 6"
              strokeWidth={1.2}
              opacity={0.25}
              fill="none"
            />
            <Path
              d="M-10,490 C90,460 210,540 310,500 C370,470 410,510 450,490"
              stroke="#FFFFFF"
              strokeDasharray="4 6"
              strokeWidth={1.2}
              opacity={0.25}
              fill="none"
            />

            {/* Heatmap Layer clipped strictly to field boundary */}
            <G clipPath="url(#fieldBoundaryClip)">
              <Rect
                x="0"
                y="140"
                width="390"
                height="440"
                fill="url(#moistureHeat)"
              />
              <Rect
                x="0"
                y="140"
                width="390"
                height="440"
                fill="url(#coreHydration)"
              />
            </G>

            {/* Outer Glow Polygon Boundary */}
            <Polygon
              points="68,175 324,198 348,515 220,548 76,492"
              fill="none"
              stroke="#1E2A1E"
              strokeWidth={5}
              opacity={0.45}
              strokeLinejoin="round"
            />
            <Polygon
              points="68,175 324,198 348,515 220,548 76,492"
              fill="none"
              stroke="#C6E85A"
              strokeWidth={2.5}
              strokeLinejoin="round"
            />

            {/* Sector Acreage Tag Overlay */}
            <G x={196} y={218}>
              <Rect
                x={-62}
                y={-12}
                width={124}
                height={24}
                rx={12}
                fill="#1E2A1E"
                fillOpacity={0.82}
              />
              <SvgText
                x={0}
                y={4}
                fill="#C6E85A"
                fontFamily="Manrope_700Bold"
                fontSize={10.5}
                fontWeight="bold"
                letterSpacing={0.6}
                textAnchor="middle"
              >
                SEC 4 • 18.4 AC
              </SvgText>
            </G>
          </Svg>

          {/* FLOATING TOP FILTER PILLS */}
          <View style={styles.topFiltersRow}>
            <TouchableOpacity
              style={[
                styles.filterPill,
                activeFilter === 'moisture' && styles.filterPillActive,
              ]}
              activeOpacity={0.85}
              onPress={() => setActiveFilter('moisture')}
            >
              <Droplets
                size={15}
                color={activeFilter === 'moisture' ? '#161e00' : '#556253'}
              />
              <Text
                style={[
                  styles.filterPillText,
                  activeFilter === 'moisture' && styles.filterPillTextActive,
                ]}
              >
                MOISTURE
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                activeFilter === 'thermal' && styles.filterPillActive,
              ]}
              activeOpacity={0.85}
              onPress={() => setActiveFilter('thermal')}
            >
              <Thermometer
                size={15}
                color={activeFilter === 'thermal' ? '#161e00' : '#556253'}
              />
              <Text
                style={[
                  styles.filterPillText,
                  activeFilter === 'thermal' && styles.filterPillTextActive,
                ]}
              >
                THERMAL
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                activeFilter === 'ndvi' && styles.filterPillActive,
              ]}
              activeOpacity={0.85}
              onPress={() => setActiveFilter('ndvi')}
            >
              <Sprout
                size={15}
                color={activeFilter === 'ndvi' ? '#161e00' : '#556253'}
              />
              <Text
                style={[
                  styles.filterPillText,
                  activeFilter === 'ndvi' && styles.filterPillTextActive,
                ]}
              >
                NDVI
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                activeFilter === 'vra' && styles.filterPillActive,
              ]}
              activeOpacity={0.85}
              onPress={() => setActiveFilter('vra')}
            >
              <SlidersHorizontal
                size={15}
                color={activeFilter === 'vra' ? '#161e00' : '#556253'}
              />
              <Text
                style={[
                  styles.filterPillText,
                  activeFilter === 'vra' && styles.filterPillTextActive,
                ]}
              >
                VRA
              </Text>
            </TouchableOpacity>
          </View>

          {/* VERTICAL HEATMAP GRADIENT LEGEND (LEFT EDGE) */}
          <View style={styles.legendPill}>
            <Text style={styles.legendTitle}>VWC%</Text>
            <Text style={styles.legendBound}>60</Text>
            <View style={styles.legendColorBar}>
              <Svg width={8} height={110}>
                <Defs>
                  <LinearGradient id="legendGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#2E7D32" />
                    <Stop offset="35%" stopColor="#C6E85A" />
                    <Stop offset="65%" stopColor="#FFB300" />
                    <Stop offset="100%" stopColor="#E53935" />
                  </LinearGradient>
                </Defs>
                <Rect width={8} height={110} rx={4} fill="url(#legendGrad)" />
              </Svg>
            </View>
            <Text style={styles.legendBound}>20</Text>
            <Text style={styles.legendSub}>Vol</Text>
          </View>

          {/* FLOATING MAP CONTROLS & COMPASS (RIGHT EDGE) */}
          <View style={styles.mapControlsCol}>
            <TouchableOpacity
              style={styles.compassBtn}
              activeOpacity={0.8}
              onPress={() => showToast('Map oriented North')}
            >
              <Text style={styles.compassN}>N</Text>
              <Navigation size={14} color="#191c1b" />
            </TouchableOpacity>

            <View style={styles.zoomStack}>
              <TouchableOpacity
                style={styles.zoomBtn}
                onPress={() => showToast('Zoom in')}
              >
                <Plus size={18} color="#191c1b" />
              </TouchableOpacity>
              <View style={styles.zoomDivider} />
              <TouchableOpacity
                style={styles.zoomBtn}
                onPress={() => showToast('Zoom out')}
              >
                <Minus size={18} color="#191c1b" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.crosshairBtn}
              activeOpacity={0.8}
              onPress={() => showToast('Centered on Sector 4 telemetry hub')}
            >
              <Crosshair size={18} color="#516600" />
            </TouchableOpacity>
          </View>

          {/* INTERACTIVE SENSOR PINS */}
          {PINS.map((pin) => {
            const isActive = activePinId === pin.id;

            return (
              <TouchableOpacity
                key={pin.id}
                style={[
                  styles.pinContainer,
                  { top: pin.top, left: pin.left },
                ]}
                activeOpacity={0.85}
                onPress={() => setActivePinId(pin.id)}
              >
                {isActive && (
                  <>
                    <Animated.View
                      style={[
                        styles.pinPingWave,
                        { opacity: pulseAnim },
                      ]}
                    />
                    <View style={styles.pinActiveRing} />
                  </>
                )}

                <View style={styles.pinDisc}>
                  {isActive ? (
                    <Radio size={16} color="#c6e85a" />
                  ) : (
                    <View
                      style={[
                        styles.pinCenterDot,
                        { backgroundColor: pin.color },
                      ]}
                    />
                  )}
                </View>

                {!isActive && (
                  <View style={styles.pinLabelTag}>
                    <Text style={[styles.pinLabelText, pin.id === 'N3' && { color: '#FFB300' }]}>
                      {pin.label}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* TELEMETRY TOOLTIP (ABOVE ACTIVE PIN) */}
          <View
            style={[
              styles.telemetryTooltip,
              { top: activePin.top - 128, left: activePin.left - 100 },
            ]}
          >
            {/* Tooltip Header */}
            <View style={styles.tooltipHeaderRow}>
              <View style={styles.tooltipTitleLeft}>
                <View style={styles.tooltipGreenDot} />
                <Text style={styles.tooltipTitleText} numberOfLines={1}>
                  {activePin.title}
                </Text>
              </View>
              <View style={styles.tooltipActiveBadge}>
                <Text style={styles.tooltipActiveBadgeText}>ACTIVE</Text>
              </View>
            </View>

            {/* Metric & Valve Action Row */}
            <View style={styles.tooltipMetricRow}>
              <View>
                <View style={styles.metricValRow}>
                  <Text style={styles.metricValNumber}>{activePin.vwc}</Text>
                  <Text style={styles.metricValUnit}>VWC</Text>
                </View>
                <Text style={styles.metricDesc}>{activePin.desc}</Text>
              </View>

              <TouchableOpacity
                style={styles.valveActionBtn}
                activeOpacity={0.8}
                onPress={() =>
                  showToast(`Issuing irrigation command to ${activePin.valveLabel}...`)
                }
              >
                <Text style={styles.valveActionText}>{activePin.valveLabel}</Text>
                <ArrowRight size={13} color="#c6e85a" />
              </TouchableOpacity>
            </View>

            {/* Footer Metadata */}
            <View style={styles.tooltipFooterRow}>
              <Text style={styles.tooltipMetaText}>{activePin.meta}</Text>
              <Text style={styles.tooltipSyncText}>Live Sync</Text>
            </View>

            {/* Arrow Pointer Down */}
            <View style={styles.tooltipPointer} />
          </View>
        </View>

        {/* 3. BOTTOM TELEMETRY DOCK */}
        <View style={styles.telemetryDockCard}>
          <View style={styles.dockInfoCol}>
            <View style={styles.dockHeaderRow}>
              <Animated.View
                style={[
                  styles.dockPulseDot,
                  { opacity: pulseAnim },
                ]}
              />
              <Text style={styles.dockStatusTitle}>MESH TELEMETRY ONLINE</Text>
            </View>

            <Text style={styles.dockMainText}>Updated 12 min ago</Text>

            <View style={styles.dockMetaRow}>
              <View style={styles.dockLoRaBadge}>
                <Wifi size={13} color="#556253" />
                <Text style={styles.dockLoRaText}>LoRa 98%</Text>
              </View>
              <Text style={styles.dockDotDivider}>•</Text>
              <Text style={styles.dockSubText}>5/5 Nodes reporting</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.dockRefreshBtn}
            activeOpacity={0.8}
            onPress={handleRefreshPulse}
            disabled={isRefreshing}
            accessibilityLabel="Refresh telemetry stream"
          >
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <RefreshCw size={20} color="#c6e85a" />
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* 4. EXPANDABLE QUICK ZONAL SPECS (BENTO MINI-CARDS) */}
        <View style={styles.bentoRow}>
          {/* Card 1: Optimal Zone */}
          <View style={styles.bentoCard}>
            <View style={styles.bentoHeaderRow}>
              <Text style={styles.bentoLabelText}>OPTIMAL ZONE</Text>
              <CheckCircle2 size={16} color="#2e7d32" />
            </View>
            <View style={styles.bentoMetricWrap}>
              <Text style={styles.bentoMainVal}>
                11.8 <Text style={styles.bentoValUnit}>Acres</Text>
              </Text>
              <Text style={styles.bentoSubText}>64% of Sector 4</Text>
            </View>
          </View>

          {/* Card 2: Moisture Deficit */}
          <View style={styles.bentoCard}>
            <View style={styles.bentoHeaderRow}>
              <Text style={styles.bentoLabelTextRed}>MOISTURE DEFICIT</Text>
              <AlertTriangle size={16} color="#ba1a1a" />
            </View>
            <View style={styles.bentoMetricWrap}>
              <Text style={styles.bentoMainVal}>
                3.2 <Text style={styles.bentoValUnit}>Acres</Text>
              </Text>
              <Text style={styles.bentoSubText}>Valve 2 scheduled (18:00)</Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
    backgroundColor: 'rgba(249, 250, 248, 0.85)',
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
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    letterSpacing: 1.2,
    color: '#191c1b',
  },
  topAppRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
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

  /* Scrollable Body */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
    gap: 12,
  },

  /* Map Canvas */
  mapCanvas: {
    width: '100%',
    height: MAP_HEIGHT,
    position: 'relative',
    backgroundColor: '#e7e8e6',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  basemapImage: {
    width: '100%',
    height: '100%',
  },

  /* Top Filters */
  topFiltersRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 30,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  filterPillActive: {
    backgroundColor: '#c6e85a',
  },
  filterPillText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 0.6,
    color: '#556253',
  },
  filterPillTextActive: {
    color: '#161e00',
  },

  /* Vertical Legend */
  legendPill: {
    position: 'absolute',
    left: 12,
    top: 68,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 7,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 20,
  },
  legendTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    color: '#454937',
    marginBottom: 4,
  },
  legendBound: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    color: '#191c1b',
  },
  legendColorBar: {
    marginVertical: 4,
  },
  legendSub: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 8,
    color: '#757965',
    marginTop: 2,
  },

  /* Right Map Controls */
  mapControlsCol: {
    position: 'absolute',
    right: 12,
    top: 68,
    gap: 8,
    alignItems: 'center',
    zIndex: 20,
  },
  compassBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compassN: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    color: '#e53935',
    lineHeight: 10,
  },
  zoomStack: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  zoomBtn: {
    width: 40,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    height: StyleSheet.hairlineWidth,
    width: 24,
    backgroundColor: '#e7e8e6',
    alignSelf: 'center',
  },
  crosshairBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  /* Sensor Pins */
  pinContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateX: -18 }, { translateY: -18 }],
    zIndex: 25,
  },
  pinPingWave: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(198, 232, 90, 0.4)',
  },
  pinActiveRing: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(198, 232, 90, 0.6)',
  },
  pinDisc: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E2A1E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  pinCenterDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  pinLabelTag: {
    marginTop: 2,
    backgroundColor: 'rgba(30, 42, 30, 0.8)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  pinLabelText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    color: '#ffffff',
  },

  /* Telemetry Tooltip */
  telemetryTooltip: {
    position: 'absolute',
    width: 250,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 18,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 40,
  },
  tooltipHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  tooltipTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  tooltipGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#c6e85a',
  },
  tooltipTitleText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: '#191c1b',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tooltipActiveBadge: {
    backgroundColor: '#d8e7d4',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  tooltipActiveBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 8,
    color: '#3d4a3c',
  },
  tooltipMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  metricValRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  metricValNumber: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 20,
    color: '#191c1b',
  },
  metricValUnit: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: '#556253',
  },
  metricDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 10,
    color: '#556253',
    marginTop: 1,
  },
  valveActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E2A1E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  valveActionText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: '#c6e85a',
    letterSpacing: 0.6,
  },
  tooltipFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e7e8e6',
  },
  tooltipMetaText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 9,
    color: '#757965',
  },
  tooltipSyncText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    color: '#516600',
  },
  tooltipPointer: {
    position: 'absolute',
    bottom: -6,
    left: 104,
    width: 12,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    transform: [{ rotate: '45deg' }],
  },

  /* 3. BOTTOM TELEMETRY DOCK */
  telemetryDockCard: {
    marginHorizontal: 16,
    marginTop: -20,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    zIndex: 35,
  },
  dockInfoCol: {
    flex: 1,
  },
  dockHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dockPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#2e7d32',
  },
  dockStatusTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 1,
    color: '#516600',
  },
  dockMainText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    color: '#191c1b',
    marginTop: 2,
  },
  dockMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  dockLoRaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dockLoRaText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: '#556253',
  },
  dockDotDivider: {
    fontSize: 11,
    color: '#757965',
  },
  dockSubText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: '#556253',
  },
  dockRefreshBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E2A1E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  /* 4. BENTO MINI-CARDS */
  bentoRow: {
    marginHorizontal: 16,
    flexDirection: 'row',
    gap: 10,
  },
  bentoCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    justifyContent: 'space-between',
  },
  bentoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bentoLabelText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    color: '#556253',
  },
  bentoLabelTextRed: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    color: '#ba1a1a',
  },
  bentoMetricWrap: {
    marginTop: 8,
  },
  bentoMainVal: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 17,
    color: '#191c1b',
  },
  bentoValUnit: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: '#556253',
  },
  bentoSubText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: '#757965',
    marginTop: 2,
  },
});

