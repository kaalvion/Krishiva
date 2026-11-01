import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Activity, Radio } from 'lucide-react-native';
import { colors } from '../../theme/colors';

interface StatusStripProps {
  masterStatus?: string;
  syncedLabel?: string;
  isOnline?: boolean;
}

export const StatusStrip: React.FC<StatusStripProps> = ({
  masterStatus = 'GSM Master Online',
  syncedLabel = 'Synced just now',
  isOnline = true,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.leftGroup}>
        <View style={[styles.pulseDot, !isOnline && styles.pulseDotOffline]} />
        <Text style={styles.statusText}>{masterStatus}</Text>
      </View>
      <View style={styles.rightGroup}>
        <Text style={styles.syncText}>{syncedLabel}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f4f2',
    borderRadius: 99,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2E7D32',
  },
  pulseDotOffline: {
    backgroundColor: colors.error,
  },
  statusText: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: colors.primaryDark,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncText: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    color: colors.textSecondary,
  },
});

