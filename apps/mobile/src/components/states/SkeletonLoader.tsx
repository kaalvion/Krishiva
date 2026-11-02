import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

export interface SkeletonLoaderProps {
  variant?: 'full' | 'card' | 'metrics' | 'list';
}

export function SkeletonLoader({ variant = 'full' }: SkeletonLoaderProps) {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.9,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      {(variant === 'full' || variant === 'card') && (
        <>
          {/* Top Micro Bar Placeholder */}
          <View style={styles.topMicroBar}>
            <View style={styles.microLeft}>
              <Animated.View style={[styles.circle36, { opacity: pulseAnim }]} />
              <View style={styles.textLinesCol}>
                <Animated.View style={[styles.line96, { opacity: pulseAnim }]} />
                <Animated.View style={[styles.line64, { opacity: pulseAnim }]} />
              </View>
            </View>
            <Animated.View style={[styles.pillBadge, { opacity: pulseAnim }]} />
          </View>

          {/* Hero Skeleton Card */}
          <View style={styles.heroCard}>
            <Animated.View style={[styles.heroLineLong, { opacity: pulseAnim }]} />
            <Animated.View style={[styles.heroLineMedium, { opacity: pulseAnim }]} />
            <Animated.View style={[styles.heroLineShort, { opacity: pulseAnim }]} />

            <View style={styles.heroFooter}>
              <Animated.View style={[styles.pillBadgeSmall, { opacity: pulseAnim }]} />
              <Animated.View style={[styles.circle32, { opacity: pulseAnim }]} />
            </View>
          </View>
        </>
      )}

      {(variant === 'full' || variant === 'metrics') && (
        /* Dual Metric Tiles */
        <View style={styles.metricsRow}>
          <View style={styles.metricTile}>
            <View style={styles.metricHeader}>
              <Animated.View style={[styles.circle24, { opacity: pulseAnim }]} />
              <Animated.View style={[styles.line40, { opacity: pulseAnim }]} />
            </View>
            <Animated.View style={[styles.line64Large, { opacity: pulseAnim }]} />
          </View>

          <View style={styles.metricTile}>
            <View style={styles.metricHeader}>
              <Animated.View style={[styles.circle24, { opacity: pulseAnim }]} />
              <Animated.View style={[styles.line32, { opacity: pulseAnim }]} />
            </View>
            <Animated.View style={[styles.line56Large, { opacity: pulseAnim }]} />
          </View>
        </View>
      )}

      {variant === 'list' && (
        <View style={styles.listCol}>
          {[1, 2, 3].map((key) => (
            <View key={key} style={styles.listItem}>
              <Animated.View style={[styles.circle32, { opacity: pulseAnim }]} />
              <View style={styles.listTextCol}>
                <Animated.View style={[styles.heroLineMedium, { opacity: pulseAnim }]} />
                <Animated.View style={[styles.heroLineShort, { opacity: pulseAnim }]} />
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    gap: 14,
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
    marginVertical: 6,
  },
  topMicroBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  microLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  circle36: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e7e8e6',
  },
  circle32: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e7e8e6',
  },
  circle24: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e7e8e6',
  },
  textLinesCol: {
    gap: 6,
  },
  line96: {
    width: 96,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e7e8e6',
  },
  line64: {
    width: 64,
    height: 9,
    borderRadius: 4,
    backgroundColor: '#edeeec',
  },
  pillBadge: {
    width: 56,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#edeeec',
  },
  pillBadgeSmall: {
    width: 80,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e7e8e6',
  },
  heroCard: {
    backgroundColor: '#f3f4f2',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  heroLineLong: {
    width: '68%',
    height: 14,
    borderRadius: 7,
    backgroundColor: '#e7e8e6',
  },
  heroLineMedium: {
    width: '48%',
    height: 11,
    borderRadius: 5,
    backgroundColor: '#edeeec',
  },
  heroLineShort: {
    width: '78%',
    height: 11,
    borderRadius: 5,
    backgroundColor: '#edeeec',
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricTile: {
    flex: 1,
    backgroundColor: '#f3f4f2',
    borderRadius: 14,
    padding: 12,
    height: 80,
    justifyContent: 'space-between',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  line40: {
    width: 40,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#edeeec',
  },
  line32: {
    width: 32,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#edeeec',
  },
  line64Large: {
    width: 64,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#e7e8e6',
  },
  line56Large: {
    width: 56,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#e7e8e6',
  },
  listCol: {
    gap: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  listTextCol: {
    flex: 1,
    gap: 6,
  },
});
