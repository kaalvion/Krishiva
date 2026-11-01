import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Rect,
  Polygon,
} from 'react-native-svg';
import {
  Maximize2,
  Layers,
  Crosshair,
  Sprout,
  ArrowUpRight,
  Droplets,
  Sliders,
  Sun,
  Volume2,
} from 'lucide-react-native';
import type { FarmBrief } from '../../hooks/live/useLiveBrief';

interface AiBriefCardProps {
  brief?: FarmBrief | null;
  translatedBrief?: {
    headline?: string;
    body?: string;
    actionNow?: string;
  } | null;
  aiEnabled?: boolean;
  onOpenMap?: () => void;
  plotName?: string;
  hectares?: string;
}

const MAP_IMAGE_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuC9uVl0atJYmZFOW_UkEU8LsIAR-tK2yWk_7XzUN7R5dS9kraBATJUSWFZRfh2C207H3aSfh0SBMWgHUih-tKDmJz1OEZ2FjKfeVqhSwZRzv6tUy-0h4uafAR0z7YJDs1g4zz5bqkRoRV1c3zzno8YCjM5FLCetcsL9kJ1YSCknVp8xgzqick_pkw3OkKIwQtj-QisBl48XLwkLbllpbGabujv7eLJxSrKMpybqnnY';

export const AiBriefCard: React.FC<AiBriefCardProps> = ({
  brief,
  translatedBrief,
  onOpenMap,
  plotName = 'Plot 4B',
  hectares = '18.2 ha',
}) => {
  const [activePin, setActivePin] = useState<string | null>('pump');

  const headline =
    translatedBrief?.headline ||
    brief?.headline ||
    `${plotName}: Soil Moisture 42%`;
  const body =
    translatedBrief?.body ||
    brief?.body ||
    'Optimal root-zone saturation';

  const handlePinPress = (name: string, status: string) => {
    setActivePin(name);
    Alert.alert(name, `Status: ${status}`);
  };

  return (
    <View style={styles.wrapper}>
      {/* Hero Satellite Map Card (~320px tall) */}
      <View style={styles.cardContainer}>
        <ImageBackground
          source={{ uri: MAP_IMAGE_URL }}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          {/* SVG Overlay: Aerial Scrim Gradient + Boundary Polygons */}
          <Svg
            style={StyleSheet.absoluteFill}
            viewBox="0 0 400 320"
            preserveAspectRatio="none"
          >
            <Defs>
              <SvgGradient id="mapScrim" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#000000" stopOpacity="0.45" />
                <Stop offset="45%" stopColor="#000000" stopOpacity="0.05" />
                <Stop offset="100%" stopColor="#000000" stopOpacity="0.8" />
              </SvgGradient>
            </Defs>
            {/* Scrim */}
            <Rect x="0" y="0" width="400" height="320" fill="url(#mapScrim)" />

            {/* Neighboring Field Boundaries */}
            <Polygon
              points="20,40 160,20 180,110 30,125"
              fill="rgba(255,255,255,0.06)"
              stroke="rgba(255,255,255,0.45)"
              strokeDasharray="4, 4"
              strokeWidth="1.5"
            />
            <Polygon
              points="190,18 380,35 365,130 185,115"
              fill="rgba(255,255,255,0.06)"
              stroke="rgba(255,255,255,0.45)"
              strokeDasharray="4, 4"
              strokeWidth="1.5"
            />
            <Polygon
              points="235,135 385,145 370,265 240,245"
              fill="rgba(255,255,255,0.06)"
              stroke="rgba(255,255,255,0.45)"
              strokeDasharray="4, 4"
              strokeWidth="1.5"
            />

            {/* Selected Hero Field (Plot 4B) with Lime Outline & Glow */}
            <Polygon
              points="45,135 220,125 210,255 35,245"
              fill="rgba(198, 232, 90, 0.25)"
              stroke="#C6E85A"
              strokeWidth="2.5"
            />
          </Svg>

          {/* Floating Top Chips */}
          <View style={styles.topChipsRow}>
            <View style={styles.multispectralBadge}>
              <View style={styles.limePulseDot} />
              <Text style={styles.multispectralText}>MULTISPECTRAL ACTIVE</Text>
            </View>

            <View style={styles.hectareBadge}>
              <Text style={styles.hectareText}>{hectares}</Text>
            </View>
          </View>

          {/* Floating Right Map Tools */}
          <View style={styles.toolsColumn}>
            <TouchableOpacity
              style={styles.toolButton}
              onPress={() => Alert.alert('Fullscreen Map', 'Expanding map view')}
              activeOpacity={0.8}
            >
              <Maximize2 size={16} color="#191c1b" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toolButton}
              onPress={() => Alert.alert('Layers', 'NDVI, Moisture, Elevation')}
              activeOpacity={0.8}
            >
              <Layers size={16} color="#191c1b" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toolButton}
              onPress={() => Alert.alert('Locate', 'Centering Plot 4B')}
              activeOpacity={0.8}
            >
              <Crosshair size={16} color="#191c1b" />
            </TouchableOpacity>
          </View>

          {/* Interactive Map Pins */}
          {/* Pin 1: Borewell Pump (ACTIVE) */}
          <TouchableOpacity
            style={[styles.pinWrapper, { top: 165, left: 110 }]}
            onPress={() => handlePinPress('Borewell Pump', 'Active • Running')}
            activeOpacity={0.8}
          >
            <View style={styles.activePinHalo} />
            <View style={styles.activePinCircle}>
              <Droplets size={18} color="#161e00" />
              <View style={styles.pinStatusDotGreen} />
            </View>
          </TouchableOpacity>

          {/* Pin 2: Drip Valve North (Idle) */}
          <TouchableOpacity
            style={[styles.pinWrapper, { top: 142, left: 180 }]}
            onPress={() => handlePinPress('Drip Valve North', 'Standby')}
            activeOpacity={0.8}
          >
            <View style={styles.idlePinCircle}>
              <Sliders size={14} color="#556253" />
              <View style={styles.pinStatusDotGray} />
            </View>
          </TouchableOpacity>

          {/* Pin 3: Perimeter Light */}
          <TouchableOpacity
            style={[styles.pinWrapper, { top: 220, left: 52 }]}
            onPress={() => handlePinPress('Perimeter Light', 'Auto 7:00 PM')}
            activeOpacity={0.8}
          >
            <View style={styles.idlePinCircle}>
              <Sun size={14} color="#556253" />
              <View style={styles.pinStatusDotGray} />
            </View>
          </TouchableOpacity>

          {/* Pin 4: Pest Deterrent */}
          <TouchableOpacity
            style={[styles.pinWrapper, { top: 225, left: 175 }]}
            onPress={() => handlePinPress('Pest Deterrent', 'Arm Ready')}
            activeOpacity={0.8}
          >
            <View style={styles.idlePinCircle}>
              <Volume2 size={14} color="#556253" />
              <View style={styles.pinStatusDotGray} />
            </View>
          </TouchableOpacity>

          {/* Bottom Frosted-Glass Info Bar */}
          <View style={styles.bottomInfoBar}>
            <View style={styles.infoLeft}>
              <View style={styles.infoIconCircle}>
                <Sprout size={18} color="#161e00" />
              </View>
              <View style={styles.infoTextCol}>
                <Text style={styles.infoTitle} numberOfLines={1}>
                  {headline}
                </Text>
                <Text style={styles.infoSubtitle} numberOfLines={1}>
                  {body}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.openMapButton}
              onPress={onOpenMap || (() => Alert.alert('Plot Details', headline))}
              activeOpacity={0.8}
            >
              <ArrowUpRight size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </View>

      {/* Map Status Legend Row */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#C6E85A', borderColor: 'rgba(0,0,0,0.2)', borderWidth: 1 }]} />
          <Text style={styles.legendText}>Running</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#ffffff', borderColor: '#b0b5aa', borderWidth: 1 }]} />
          <Text style={styles.legendText}>Idle</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#bfcd94' }]} />
          <Text style={styles.legendText}>Offline</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginBottom: 16,
  },
  cardContainer: {
    width: '100%',
    height: 320,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  topChipsRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  multispectralBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  limePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C6E85A',
  },
  multispectralText: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  hectareBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  hectareText: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
  },
  toolsColumn: {
    position: 'absolute',
    right: 12,
    top: 54,
    flexDirection: 'column',
    gap: 8,
    zIndex: 10,
  },
  toolButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  pinWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  activePinHalo: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(198, 232, 90, 0.35)',
  },
  activePinCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#C6E85A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  pinStatusDotGreen: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#516600',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  idlePinCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.12)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  pinStatusDotGray: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#b0b5aa',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  bottomInfoBar: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(20, 28, 20, 0.75)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  infoIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#C6E85A',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoTextCol: {
    flex: 1,
    minWidth: 0,
  },
  infoTitle: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: '#ffffff',
  },
  infoSubtitle: {
    fontSize: 11,
    fontFamily: 'Manrope_400Regular',
    color: '#dbe9ae',
    marginTop: 1,
  },
  openMapButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E2A1E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    flexShrink: 0,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  legendText: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: '#556253',
  },
});
