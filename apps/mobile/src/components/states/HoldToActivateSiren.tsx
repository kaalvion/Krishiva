import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  TouchableOpacity,
  Platform,
  Vibration,
} from 'react-native';
import { Volume2, Megaphone } from 'lucide-react-native';

export interface HoldToActivateSirenProps {
  onTrigger: () => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
}

export function HoldToActivateSiren({
  onTrigger,
  onCancel,
  title = 'ACTIVATE FIELD SIREN',
  subtitle = 'Engages high-decibel acoustic ward across Sector 3. Press and hold to prevent accidental triggers.',
}: HoldToActivateSirenProps) {
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [isFired, setIsFired] = useState<boolean>(false);

  const holdAnim = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<any>(null);

  const handlePressIn = () => {
    if (isFired) return;
    setIsHolding(true);
    setProgressPercent(0);

    // Track percentage for UI text
    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / 2000) * 100));
      setProgressPercent(pct);
    }, 50);

    Animated.timing(holdAnim, {
      toValue: 1,
      duration: 2000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        clearInterval(intervalRef.current);
        setProgressPercent(100);
        setIsFired(true);
        if (Platform.OS !== 'web') Vibration.vibrate([100, 50, 100]);
        onTrigger();

        setTimeout(() => {
          setIsFired(false);
          setIsHolding(false);
          setProgressPercent(0);
          holdAnim.setValue(0);
        }, 3000);
      }
    });
  };

  const handlePressOut = () => {
    if (isFired) return;
    clearInterval(intervalRef.current);
    setIsHolding(false);
    setProgressPercent(0);
    holdAnim.stopAnimation();
    Animated.timing(holdAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const remainingSeconds = ((2000 - (progressPercent / 100) * 2000) / 1000).toFixed(1);

  return (
    <View style={styles.cardContainer}>
      {/* Pull Handle */}
      <View style={styles.grabHandle} />

      {/* Red Siren Icon Circle */}
      <View style={styles.iconCircle}>
        <Volume2 size={28} color="#ba1a1a" />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {/* Hold Button */}
      <Pressable
        style={styles.holdButtonTrack}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel="Hold to activate siren"
      >
        <Animated.View
          style={[
            styles.holdButtonFill,
            {
              width: holdAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
        <View style={styles.buttonContentRow}>
          <Volume2 size={20} color="#ffffff" />
          <Text style={styles.buttonText}>
            {isFired
              ? 'SIREN ACTIVATED!'
              : isHolding
              ? `HOLDING... ${progressPercent}%`
              : 'PRESS & HOLD (2S)'}
          </Text>
        </View>
      </Pressable>

      {/* Bottom status & cancel */}
      <View style={styles.footerRow}>
        <TouchableOpacity
          onPress={() => {
            handlePressOut();
            onCancel?.();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelText}>Cancel Activation</Text>
        </TouchableOpacity>

        <Text style={styles.remainingText}>
          {isHolding ? `${remainingSeconds}s REMAINING` : '2.0s TO ENGAGE'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
    marginVertical: 6,
  },
  grabHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e7e8e6',
    marginBottom: 16,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffdad6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#191c1b',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 13,
    color: '#556253',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 20,
    maxWidth: 280,
  },
  holdButtonTrack: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 218, 214, 0.6)',
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdButtonFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#ba1a1a',
    borderRadius: 28,
  },
  buttonContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 2,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.8,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 14,
    paddingHorizontal: 4,
  },
  cancelText: {
    fontSize: 13,
    color: '#556253',
    fontWeight: '600',
  },
  remainingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#757965',
    letterSpacing: 0.5,
  },
});
