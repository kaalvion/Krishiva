import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, {
  Path,
  Polygon,
  Circle as SvgCircle,
  G,
  Defs,
} from 'react-native-svg';
import {
  ArrowLeft,
  User,
  PenTool,
  Crosshair,
  Layers,
  RotateCcw,
  Compass,
  AlertTriangle,
  X,
  RefreshCw,
  ArrowUpRight,
  CheckCircle2,
  Move,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_HEIGHT = 480;

// Coordinate points for the 4-point polygon
interface Point {
  x: number;
  y: number;
}

const INITIAL_POINTS: Point[] = [
  { x: 72, y: 130 },
  { x: 318, y: 168 },
  { x: 284, y: 390 },
  { x: 108, y: 365 },
];

const SNAPPED_POINTS: Point[] = [
  { x: 72, y: 130 },
  { x: 318, y: 168 },
  { x: 270, y: 370 },
  { x: 108, y: 350 },
];

export default function DrawFieldScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { farmId } = useLocalSearchParams<{ farmId?: string }>();

  // Polygon and interaction state
  const [points, setPoints] = useState<Point[]>(INITIAL_POINTS);
  const [selectedVertex, setSelectedVertex] = useState<number>(1);
  const [showOverlapWarning, setShowOverlapWarning] = useState<boolean>(true);
  const [isSatelliteLayer, setIsSatelliteLayer] = useState<boolean>(true);
  const [isAutoSnapped, setIsAutoSnapped] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toastAnim = useRef(new Animated.Value(-60)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const radarAnim = useRef(new Animated.Value(8)).current;

  // Radar ping animation on farmer GPS point
  useEffect(() => {
    const radar = Animated.loop(
      Animated.sequence([
        Animated.timing(radarAnim, {
          toValue: 24,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(radarAnim, {
          toValue: 8,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    radar.start();
    return () => radar.stop();
  }, [radarAnim]);

  // Pulse animation for active vertex halo
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.35,
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

  const handleAutoSnap = () => {
    setPoints(SNAPPED_POINTS);
    setIsAutoSnapped(true);
    setShowOverlapWarning(false);
    showToast('Boundary auto-snapped to irrigation ditch');
  };

  const handleResetLoop = () => {
    setPoints(INITIAL_POINTS);
    setIsAutoSnapped(false);
    setShowOverlapWarning(true);
    showToast('Boundary vertices reset to default loop');
  };

  const handleUndoCorner = () => {
    showToast('Undo corner adjustment');
  };

  const handleLocateMe = () => {
    showToast('Centered on farmer RTK GPS coordinates');
  };

  const handleToggleLayer = () => {
    setIsSatelliteLayer(!isSatelliteLayer);
    showToast(isSatelliteLayer ? 'Switched to Terrain Map' : 'Switched to High-Res Satellite');
  };

  const handleSaveBoundary = () => {
    Alert.alert(
      'Field Boundary Saved',
      'Field boundary of 1.18 acres (449 m perimeter) has been saved for Plot 4B.',
      [
        {
          text: 'Done',
          onPress: () => router.back(),
        },
      ]
    );
  };

  const polygonPointsStr = points.map((p) => `${p.x},${p.y}`).join(' ');

  // Midpoints calculation
  const midTop = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
  const midRight = { x: (points[1].x + points[2].x) / 2, y: (points[1].y + points[2].y) / 2 };
  const midBottom = { x: (points[2].x + points[3].x) / 2, y: (points[2].y + points[3].y) / 2 };
  const midLeft = { x: (points[3].x + points[0].x) / 2, y: (points[3].y + points[0].y) / 2 };

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
          <Text style={styles.topAppTitle}>Draw Field</Text>
        </View>

        <View style={styles.topAppRight}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
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

      {/* 2. MAP CANVAS HERO AREA */}
      <View style={styles.mapCanvas}>
        {/* Aerial Farmland Basemap Background */}
        <Image
          source={{
            uri: isSatelliteLayer
              ? 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1000'
              : 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?q=80&w=1000',
          }}
          style={styles.basemapImage}
          resizeMode="cover"
        />

        {/* Ambient Topographic Contours & Vector Overlay */}
        <Svg
          style={StyleSheet.absoluteFill}
          viewBox={`0 0 390 ${MAP_HEIGHT}`}
          preserveAspectRatio="none"
        >
          <Defs />
          {/* Subtle Contours */}
          <Path
            d="M-50,120 Q120,80 240,160 T500,100"
            fill="none"
            stroke="#ffffff"
            strokeDasharray="4 6"
            strokeWidth={1.2}
            opacity={0.3}
          />
          <Path
            d="M-20,240 Q150,190 280,290 T540,210"
            fill="none"
            stroke="#ffffff"
            strokeDasharray="3 5"
            strokeWidth={1.2}
            opacity={0.3}
          />
          <Path
            d="M-40,380 Q100,310 260,420 T520,330"
            fill="none"
            stroke="#ffffff"
            strokeDasharray="6 8"
            strokeWidth={1}
            opacity={0.25}
          />

          {/* Polygon Field Geometry */}
          <Polygon
            points={polygonPointsStr}
            fill="#c6e85a"
            fillOpacity={0.24}
            stroke="#c6e85a"
            strokeWidth={3}
            strokeLinejoin="round"
          />

          {/* Midpoint Pips */}
          <SvgCircle
            cx={midTop.x}
            cy={midTop.y}
            r={4.5}
            fill="#ffffff"
            stroke="#516600"
            strokeWidth={1.5}
          />
          <SvgCircle
            cx={midRight.x}
            cy={midRight.y}
            r={4.5}
            fill="#ffffff"
            stroke="#516600"
            strokeWidth={1.5}
          />
          <SvgCircle
            cx={midBottom.x}
            cy={midBottom.y}
            r={4.5}
            fill="#ffffff"
            stroke="#516600"
            strokeWidth={1.5}
          />
          <SvgCircle
            cx={midLeft.x}
            cy={midLeft.y}
            r={4.5}
            fill="#ffffff"
            stroke="#516600"
            strokeWidth={1.5}
          />

          {/* Farmer GPS Anchor (Pulsing wave) */}
          <G x={points[3].x} y={points[3].y}>
            <SvgCircle
              cx={0}
              cy={0}
              r={18}
              fill="#516600"
              fillOpacity={0.2}
            />
            <SvgCircle
              cx={0}
              cy={0}
              r={7}
              fill="#ffffff"
              stroke="#516600"
              strokeWidth={2.5}
            />
            <SvgCircle cx={0} cy={0} r={3.5} fill="#516600" />
          </G>
        </Svg>

        {/* Distance Annotation Micro-Pills */}
        <View style={[styles.distanceTag, { top: midTop.y - 14, left: midTop.x - 24 }]}>
          <Text style={styles.distanceTagText}>142 m</Text>
        </View>

        <View style={[styles.distanceTag, { top: midRight.y - 10, left: midRight.x + 10 }]}>
          <Text style={styles.distanceTagText}>88 m</Text>
        </View>

        <View style={[styles.distanceTag, { top: midBottom.y + 8, left: midBottom.x - 24 }]}>
          <Text style={styles.distanceTagText}>125 m</Text>
        </View>

        <View style={[styles.distanceTag, { top: midLeft.y - 10, left: midLeft.x - 48 }]}>
          <Text style={styles.distanceTagText}>94 m</Text>
        </View>

        {/* Tactile Corner Handles (Vertices) */}
        {points.map((pt, index) => {
          const isSelected = selectedVertex === index;

          return (
            <TouchableOpacity
              key={`vertex-${index}`}
              style={[
                styles.vertexTouchArea,
                { top: pt.y - 18, left: pt.x - 18 },
              ]}
              activeOpacity={0.9}
              onPress={() => setSelectedVertex(index)}
            >
              <View style={[styles.vertexDisc, isSelected && styles.vertexDiscSelected]}>
                {isSelected && (
                  <Animated.View
                    style={[
                      styles.vertexHalo,
                      { opacity: pulseAnim },
                    ]}
                  />
                )}
                <View style={styles.vertexCore} />
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Top-Centered Telemetry Area Chip */}
        <View style={styles.floatingAreaChip}>
          <View style={styles.chipDrawCircle}>
            <PenTool size={14} color="#161e00" />
          </View>
          <View style={styles.chipTextRow}>
            <Text style={styles.chipAcres}>
              {isAutoSnapped ? '1.04' : '1.18'}{' '}
              <Text style={styles.chipAcresUnit}>acres</Text>
            </Text>
            <View style={styles.chipDot} />
            <Text style={styles.chipPerimeter}>
              {isAutoSnapped ? '428 m' : '449 m'} perim.
            </Text>
          </View>
        </View>

        {/* Right-Hand Floating Action Control Column */}
        <View style={styles.rightControlsCol}>
          <TouchableOpacity
            style={styles.controlCircleBtn}
            activeOpacity={0.8}
            onPress={handleLocateMe}
            accessibilityLabel="Locate Me"
          >
            <Crosshair size={20} color="#516600" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlCircleBtn}
            activeOpacity={0.8}
            onPress={handleToggleLayer}
            accessibilityLabel="Toggle Satellite Layer"
          >
            <Layers size={20} color="#556253" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlCircleBtn}
            activeOpacity={0.8}
            onPress={handleUndoCorner}
            accessibilityLabel="Undo Vertex"
          >
            <RotateCcw size={20} color="#556253" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlCircleBtn}
            activeOpacity={0.8}
            onPress={() => showToast('Field map aligned to True North')}
            accessibilityLabel="Align Compass"
          >
            <Compass size={20} color="#ba1a1a" />
          </TouchableOpacity>
        </View>

        {/* Diagnostic Boundary Overlap Warning Banner */}
        {showOverlapWarning && (
          <View style={styles.overlapBanner}>
            <View style={styles.overlapIconWrap}>
              <AlertTriangle size={16} color="#ba1a1a" />
            </View>

            <View style={{ flex: 1 }}>
              <View style={styles.overlapHeaderRow}>
                <Text style={styles.overlapTitle}>Boundary Overlap Detected</Text>
                <TouchableOpacity
                  onPress={() => setShowOverlapWarning(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={16} color="#3d4a3c" />
                </TouchableOpacity>
              </View>

              <Text style={styles.overlapDesc}>
                Overlaps{' '}
                <Text style={{ fontFamily: 'Manrope_700Bold' }}>South Wheat Plot #2</Text> by 0.14 acres.
              </Text>

              <View style={styles.overlapActionsRow}>
                <TouchableOpacity
                  style={styles.autoSnapBtn}
                  activeOpacity={0.8}
                  onPress={handleAutoSnap}
                >
                  <Text style={styles.autoSnapBtnText}>Auto-Snap Boundary</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowOverlapWarning(false)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={styles.ignoreText}>Ignore</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* 3. BOTTOM DRAWER CONTROL CONSOLE */}
      <View style={[styles.bottomDrawer, { paddingBottom: insets.bottom + 12 }]}>
        {/* Center Grab Handle */}
        <View style={styles.grabHandle} />

        {/* Status Line */}
        <View style={styles.drawerStatusRow}>
          <View style={styles.statusPointsLeft}>
            <View style={styles.pointsRingDot} />
            <Text style={styles.pointsCountText}>4 Points Placed</Text>
            <Text style={styles.pointsSubText}>• Loop Closed</Text>
          </View>

          <View style={styles.dragGuidanceBadge}>
            <Move size={13} color="#556253" />
            <Text style={styles.dragGuidanceText}>Tap node to drag</Text>
          </View>
        </View>

        {/* Quick Drawing Toolbar */}
        <View style={styles.drawerToolbarRow}>
          <TouchableOpacity
            style={styles.drawerToolBtn}
            activeOpacity={0.8}
            onPress={handleUndoCorner}
          >
            <RotateCcw size={16} color="#556253" />
            <Text style={styles.drawerToolBtnText}>Undo Corner</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.drawerToolBtn}
            activeOpacity={0.8}
            onPress={handleResetLoop}
          >
            <RefreshCw size={16} color="#757965" />
            <Text style={styles.drawerToolBtnText}>Reset Loop</Text>
          </TouchableOpacity>
        </View>

        {/* Primary Action Button (Save Field Boundary) */}
        <TouchableOpacity
          style={styles.saveBoundaryBtn}
          activeOpacity={0.9}
          onPress={handleSaveBoundary}
        >
          <View style={styles.saveBtnTextCol}>
            <Text style={styles.saveBtnTitle}>SAVE FIELD BOUNDARY</Text>
            <Text style={styles.saveBtnSubtitle}>Plot 4B • Ready for seeding</Text>
          </View>
          <View style={styles.saveArrowCircle}>
            <ArrowUpRight size={20} color="#c6e85a" strokeWidth={2.5} />
          </View>
        </TouchableOpacity>
      </View>
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
    backgroundColor: 'rgba(249, 250, 248, 0.9)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    zIndex: 50,
  },
  topAppLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cancelButtonText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    color: '#556253',
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

  /* 2. MAP CANVAS */
  mapCanvas: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#e7e8e6',
    overflow: 'hidden',
  },
  basemapImage: {
    width: '100%',
    height: '100%',
    opacity: 0.9,
  },
  distanceTag: {
    position: 'absolute',
    backgroundColor: 'rgba(249, 250, 248, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  distanceTagText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: '#454937',
  },
  vertexTouchArea: {
    position: 'absolute',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  vertexDisc: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  vertexDiscSelected: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#c6e85a',
  },
  vertexCore: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#516600',
  },
  vertexHalo: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#cef061',
  },

  /* Floating Area Chip */
  floatingAreaChip: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    backgroundColor: 'rgba(249, 250, 248, 0.94)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    zIndex: 40,
  },
  chipDrawCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#c6e85a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipAcres: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: '#191c1b',
  },
  chipAcresUnit: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: '#556253',
  },
  chipDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#c5c9b1',
  },
  chipPerimeter: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: '#454937',
  },

  /* Right-hand Controls Column */
  rightControlsCol: {
    position: 'absolute',
    top: 60,
    right: 14,
    gap: 10,
    zIndex: 40,
  },
  controlCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },

  /* Overlap Warning Banner */
  overlapBanner: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(216, 231, 212, 0.96)',
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 40,
  },
  overlapIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffdad6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  overlapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overlapTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: '#131e13',
  },
  overlapDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: '#3d4a3c',
    marginTop: 2,
  },
  overlapActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  autoSnapBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  autoSnapBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: '#516600',
  },
  ignoreText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: '#3d4a3c',
    textDecorationLine: 'underline',
  },

  /* 3. BOTTOM DRAWER */
  bottomDrawer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 50,
  },
  grabHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e3e1',
    alignSelf: 'center',
    marginBottom: 2,
  },
  drawerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusPointsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pointsRingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#c6e85a',
    borderWidth: 2,
    borderColor: '#516600',
  },
  pointsCountText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: '#191c1b',
  },
  pointsSubText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: '#556253',
  },
  dragGuidanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3f4f2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  dragGuidanceText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: '#556253',
  },
  drawerToolbarRow: {
    flexDirection: 'row',
    gap: 10,
  },
  drawerToolBtn: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#edeeec',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  drawerToolBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: '#191c1b',
  },
  saveBoundaryBtn: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#c6e85a',
    paddingLeft: 22,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#516600',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  saveBtnTextCol: {
    justifyContent: 'center',
  },
  saveBtnTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    letterSpacing: 1.1,
    color: '#161e00',
  },
  saveBtnSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: '#526700',
    marginTop: 1,
  },
  saveArrowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#131e13',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

