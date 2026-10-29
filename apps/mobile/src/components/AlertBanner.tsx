import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertTriangle, AlertCircle, ChevronRight } from 'lucide-react-native';
import { useLiveAlerts } from '../hooks/live';
import { colors } from '../theme/colors';

interface AlertBannerProps {
  farmId: string;
}

export function AlertBanner({ farmId }: AlertBannerProps) {
  const router = useRouter();
  const { alerts, unacknowledgedCount } = useLiveAlerts(farmId, false);
  const hasCritical = alerts.some((a) => a.severity === 'critical');

  if (!unacknowledgedCount || unacknowledgedCount === 0) {
    return null;
  }

  const isCritical = hasCritical;
  const bannerBg = isCritical ? colors.errorSurface : '#FFF3E0';
  const borderColor = isCritical ? '#FFCDD2' : '#FFE0B2';
  const textColor = isCritical ? colors.error : colors.warning;
  const iconColor = isCritical ? colors.error : colors.warning;

  const handlePress = () => {
    router.push('/(app)/(farm)/alerts');
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={[
        styles.container,
        { backgroundColor: bannerBg, borderColor },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${unacknowledgedCount} active alert${unacknowledgedCount > 1 ? 's' : ''}. Tap to view alerts.`}
    >
      <View style={styles.leftRow}>
        <View style={styles.iconWrapper}>
          {isCritical ? (
            <AlertTriangle size={20} color={iconColor} />
          ) : (
            <AlertCircle size={20} color={iconColor} />
          )}
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: textColor }]}>
            {unacknowledgedCount} Active Alert{unacknowledgedCount > 1 ? 's' : ''}
          </Text>
          <Text style={styles.subtitle}>
            {isCritical
              ? 'Critical threshold exceeded or device offline'
              : 'Requires attention on your farm'}
          </Text>
        </View>
      </View>
      <ChevronRight size={18} color={textColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
});
