import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Radio, Signal, BatteryCharging, Battery } from 'lucide-react-native';

interface StatusStripProps {
  masterStatus?: string;
  syncedLabel?: string;
  isOnline?: boolean;
}

export const StatusStrip: React.FC<StatusStripProps> = ({
  masterStatus = 'GSM Master: Online',
  syncedLabel = 'Synced just now',
  isOnline = true,
}) => {
  return (
    <View style={styles.container}>
      {/* Left: Router Icon + Master Status & Sync */}
      <View style={styles.leftGroup}>
        <View style={styles.iconCircle}>
          <Radio size={18} color="#161e00" />
        </View>
        <View style={styles.textColumn}>
          <View style={styles.statusRow}>
            <View style={[styles.pulseDot, !isOnline && styles.pulseDotOffline]} />
            <Text style={styles.statusText} numberOfLines={1}>
              {masterStatus}
            </Text>
          </View>
          <Text style={styles.syncText} numberOfLines={1}>
            {syncedLabel}
          </Text>
        </View>
      </View>

      {/* Right: Badges for 4G LTE & Battery */}
      <View style={styles.rightGroup}>
        <View style={styles.badgePill}>
          <Signal size={12} color="#516600" />
          <Text style={styles.badgeText}>4G LTE</Text>
        </View>
        <View style={styles.badgePill}>
          <Battery size={13} color="#516600" />
          <Text style={styles.badgeText}>94%</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#C6E85A',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textColumn: {
    flex: 1,
    minWidth: 0,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#516600',
  },
  pulseDotOffline: {
    backgroundColor: '#ba1a1a',
  },
  statusText: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
  },
  syncText: {
    fontSize: 11,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
    marginTop: 1,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3f4f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    color: '#191c1b',
    letterSpacing: 0.3,
  },
});
