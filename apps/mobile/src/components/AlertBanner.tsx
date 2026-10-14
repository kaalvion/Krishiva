import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertTriangle, AlertCircle, ChevronRight } from 'lucide-react-native';
import { useUnacknowledgedAlerts } from '../hooks/useAlerts';
import { colors } from '../theme/colors';

interface AlertBannerProps {
  farmId: string;
}

export function AlertBanner({ farmId }: AlertBannerProps) {
  const router = useRouter();
  const { unacknowledgedCount, hasCritical } = useUnacknowledgedAlerts(farmId);

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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
