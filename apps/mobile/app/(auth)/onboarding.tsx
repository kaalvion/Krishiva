import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Rect,
  Line,
  Polyline,
} from 'react-native-svg';
import { ArrowUpRight } from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function OnboardingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Top Graphic: Topographic Contour Lines using react-native-svg */}
      <View style={styles.graphicContainer} pointerEvents="none">
        <Svg
          width={SCREEN_WIDTH * 1.15}
          height={SCREEN_HEIGHT * 0.58}
          viewBox="0 0 450 520"
          style={styles.svgOverlay}
        >
          <Defs>
            <LinearGradient id="softLimeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#E2F59E" stopOpacity="0.95" />
              <Stop offset="100%" stopColor="#C6E85A" stopOpacity="0.8" />
            </LinearGradient>
            <LinearGradient id="lightTintGrad" x1="20%" y1="0%" x2="90%" y2="100%">
              <Stop offset="0%" stopColor="#EFF8D2" stopOpacity="0.75" />
              <Stop offset="100%" stopColor="#F7FAF0" stopOpacity="0.1" />
            </LinearGradient>
            <LinearGradient id="fadeDown" x1="50%" y1="60%" x2="50%" y2="100%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
            </LinearGradient>
          </Defs>

          {/* Soft Lime Top-Right Elevation Nest Patches */}
          <Path
            d="M 270 40 C 310 15, 390 10, 430 70 C 460 120, 420 180, 360 175 C 310 170, 270 145, 260 110 C 252 80, 250 55, 270 40 Z"
            fill="url(#softLimeGrad)"
          />
          <Path
            d="M 295 65 C 320 48, 375 45, 395 85 C 410 120, 385 150, 345 150 C 315 150, 290 130, 288 105 C 285 88, 285 75, 295 65 Z"
            fill="#F4F9DE"
          />
          <Path
            d="M 320 85 C 335 75, 365 72, 375 95 C 385 115, 368 132, 345 130 C 330 128, 318 118, 316 102 C 315 92, 315 88, 320 85 Z"
            fill="#E4F4A5"
          />

          {/* Left Side Tint Wash */}
          <Path
            d="M -20 220 C 40 250, 90 320, 80 410 C 70 480, 20 500, -30 520 Z"
            fill="url(#lightTintGrad)"
            opacity="0.8"
          />

          {/* Organic Concentric Contour Lines */}
          <Path
            d="M -30 80 C 70 90, 140 160, 150 250 C 160 350, 90 440, -20 480"
            stroke="#8CA07E"
            strokeWidth="1.25"
            fill="none"
            opacity="0.65"
          />
          <Path
            d="M -30 120 C 50 125, 115 180, 120 260 C 125 340, 70 410, -20 450"
            stroke="#8CA07E"
            strokeWidth="1.25"
            fill="none"
            opacity="0.65"
          />
          <Path
            d="M -30 160 C 30 165, 85 210, 90 280 C 95 340, 50 390, -20 410"
            stroke="#7B936B"
            strokeWidth="1.5"
            fill="none"
            opacity="0.85"
          />

          {/* Central flowing ridges (S-curves across upper half) */}
          <Path
            d="M 120 -20 C 110 80, 150 160, 220 220 C 270 260, 310 320, 315 420"
            stroke="#8CA07E"
            strokeWidth="1.25"
            fill="none"
            opacity="0.65"
          />
          <Path
            d="M 155 -20 C 145 70, 185 145, 250 200 C 300 240, 345 300, 355 400"
            stroke="#8CA07E"
            strokeWidth="1.25"
            fill="none"
            opacity="0.65"
          />
          <Path
            d="M 190 -20 C 180 60, 220 130, 280 180 C 335 220, 380 270, 395 360"
            stroke="#7B936B"
            strokeWidth="1.5"
            fill="none"
            opacity="0.85"
          />
          <Path
            d="M 225 -20 C 215 50, 255 110, 315 160 C 365 200, 420 240, 440 320"
            stroke="#8CA07E"
            strokeWidth="1.25"
            fill="none"
            opacity="0.65"
          />

          {/* Top-Right closed elevation loops and topographic nests */}
          <Path
            d="M 245 40 C 290 10, 410 0, 445 75 C 475 140, 420 210, 345 200 C 285 190, 240 160, 230 115 C 220 75, 225 50, 245 40 Z"
            stroke="#8CA07E"
            strokeWidth="1.25"
            fill="none"
            opacity="0.65"
          />
          <Path
            d="M 270 40 C 310 15, 390 10, 430 70 C 460 120, 420 180, 360 175 C 310 170, 270 145, 260 110 C 252 80, 250 55, 270 40 Z"
            stroke="#8CA07E"
            strokeWidth="1.25"
            fill="none"
            opacity="0.65"
          />
          <Path
            d="M 295 65 C 320 48, 375 45, 395 85 C 410 120, 385 150, 345 150 C 315 150, 290 130, 288 105 C 285 88, 285 75, 295 65 Z"
            stroke="#7B936B"
            strokeWidth="1.5"
            fill="none"
            opacity="0.85"
          />
          <Path
            d="M 320 85 C 335 75, 365 72, 375 95 C 385 115, 368 132, 345 130 C 330 128, 318 118, 316 102 C 315 92, 315 88, 320 85 Z"
            stroke="#8CA07E"
            strokeWidth="1.25"
            fill="none"
            opacity="0.65"
          />

          {/* Bottom Right Organic Loops */}
          <Path
            d="M 430 350 C 380 340, 340 370, 330 420 C 320 480, 370 520, 440 520"
            stroke="#8CA07E"
            strokeWidth="1.25"
            fill="none"
            opacity="0.65"
          />
          <Path
            d="M 450 380 C 410 370, 370 395, 360 440 C 350 480, 390 520, 450 520"
            stroke="#8CA07E"
            strokeWidth="1.25"
            fill="none"
            opacity="0.65"
          />
          <Path
            d="M 390 445 C 385 460, 400 485, 425 485 C 445 485, 455 465, 450 450 C 440 435, 400 430, 390 445 Z"
            stroke="#8CA07E"
            strokeWidth="1.25"
            fill="none"
            opacity="0.65"
          />

          {/* Fading Mask Overlay */}
          <Rect x="0" y="320" width="450" height="200" fill="url(#fadeDown)" />
        </Svg>
      </View>

      {/* Top Branding Pill / Tag (KRISHIVA OS) */}
      <View style={styles.topBrandingArea}>
        <View style={styles.brandingPill}>
          <View style={styles.pulseDot} />
          <Text style={styles.brandingText}>KRISHIVA OS</Text>
        </View>
      </View>

      {/* Main Content Area */}
      <View style={styles.contentArea}>
        {/* Display Headline */}
        <View style={styles.headlineGroup}>
          {/* Line 1: AUTOMATE */}
          <Text style={styles.headlineLight}>AUTOMATE</Text>

          {/* Line 2: [FARMING] in elegant outlined pill */}
          <View style={styles.farmingPillWrapper}>
            <View style={styles.outlinePill}>
              <Text style={styles.farmingPillText}>FARMING</Text>
            </View>
          </View>

          {/* Line 3: WITH */}
          <Text style={styles.headlineLight}>WITH</Text>

          {/* Line 4: → A TAP */}
          <View style={styles.tapRow}>
            {/* Elegant thin vector arrow */}
            <View style={styles.arrowIconWrapper}>
              <Svg width="44" height="14" viewBox="0 0 46 14" fill="none">
                <Line
                  x1="0"
                  y1="7"
                  x2="43"
                  y2="7"
                  stroke="#191c1b"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <Polyline
                  points="37 1 43 7 37 13"
                  stroke="#191c1b"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <Text style={styles.headlineTap}>A TAP</Text>
          </View>
        </View>

        {/* Subtext description */}
        <Text style={styles.subtext}>
          Control pumps, valves, lights and sirens effortlessly from anywhere in the world.
        </Text>

        {/* Action Buttons Group */}
        <View style={styles.actionGroup}>
          {/* GET STARTED Lime Pill Button */}
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={() => router.push('/(auth)/register')}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel="Get Started with Krishiva"
          >
            <Text style={styles.getStartedText}>GET STARTED</Text>
            <View style={styles.getStartedArrowCircle}>
              <ArrowUpRight size={18} color="#ffffff" strokeWidth={2.4} />
            </View>
          </TouchableOpacity>

          {/* Secondary "I already have an account" Button */}
          <TouchableOpacity
            style={styles.alreadyAccountButton}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="I already have an account"
          >
            <Text style={styles.alreadyAccountText}>
              I already have an account
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'space-between',
  },
  graphicContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '56%',
    overflow: 'hidden',
  },
  svgOverlay: {
    position: 'absolute',
    top: -20,
    left: -20,
  },
  topBrandingArea: {
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 20) + 12 : 16,
    zIndex: 10,
  },
  brandingPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(30, 42, 30, 0.12)',
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#516600',
  },
  brandingText: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: '#1E2A1E',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  contentArea: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 28,
    paddingBottom: 24,
    zIndex: 10,
  },
  headlineGroup: {
    marginBottom: 16,
  },
  headlineLight: {
    fontSize: 35,
    fontFamily: 'Manrope_300Light',
    color: '#191c1b',
    letterSpacing: 3,
    textTransform: 'uppercase',
    lineHeight: 44,
  },
  farmingPillWrapper: {
    paddingLeft: 44,
    marginVertical: 4,
  },
  outlinePill: {
    alignSelf: 'flex-start',
    borderWidth: 1.25,
    borderColor: '#1E2A1E',
    borderRadius: 9999,
    paddingHorizontal: 24,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  farmingPillText: {
    fontSize: 25,
    fontFamily: 'Manrope_300Light',
    color: '#191c1b',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  tapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
  },
  arrowIconWrapper: {
    justifyContent: 'center',
  },
  headlineTap: {
    fontSize: 34,
    fontFamily: 'Manrope_300Light',
    color: '#191c1b',
    letterSpacing: 3.5,
    textTransform: 'uppercase',
    lineHeight: 44,
  },
  subtext: {
    fontSize: 13.5,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
    lineHeight: 20,
    maxWidth: 300,
    marginBottom: 24,
    paddingLeft: 2,
  },
  actionGroup: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  getStartedButton: {
    width: '100%',
    height: 60,
    borderRadius: 9999,
    backgroundColor: '#C6E85A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 28,
    paddingRight: 8,
    shadowColor: '#C6E85A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 3,
  },
  getStartedText: {
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
    color: '#1E2A1E',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  getStartedArrowCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E2A1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alreadyAccountButton: {
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alreadyAccountText: {
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    color: '#556253',
  },
});
