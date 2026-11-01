import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowUpRight, CheckCircle2, SunMedium, Shield } from 'lucide-react-native';

interface TodayScheduleCardProps {
  onViewAll?: () => void;
}

export const TodayScheduleCard: React.FC<TodayScheduleCardProps> = ({
  onViewAll,
}) => {
  const router = useRouter();

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      router.push('/(app)/(farm)/schedules' as any);
    }
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleColumn}>
          <Text style={styles.title}>TODAY'S SCHEDULE</Text>
          <Text style={styles.subtitle}>3 automations queued</Text>
        </View>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleViewAll}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="View All Schedules"
        >
          <ArrowUpRight size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Rows */}
      <View style={styles.rowsList}>
        {/* Row 1: Drip Zone 1 (Done) */}
        <View style={styles.scheduleRow}>
          <View style={styles.leftGroup}>
            <View style={styles.iconCircleGreen}>
              <CheckCircle2 size={16} color="#516600" />
            </View>
            <View style={styles.textGroup}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                Drip Zone 1 • 15 min
              </Text>
              <Text style={styles.rowSubtext}>06:00 AM • Completed</Text>
            </View>
          </View>
          <View style={styles.badgeDone}>
            <Text style={styles.badgeDoneText}>Done</Text>
          </View>
        </View>

        {/* Row 2: Solar Booster Pump (NEXT) */}
        <View style={styles.scheduleRowNext}>
          <View style={styles.leftGroup}>
            <View style={styles.iconCircleLime}>
              <SunMedium size={16} color="#161e00" />
            </View>
            <View style={styles.textGroup}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                Solar Booster Pump • 45 min
              </Text>
              <Text style={styles.rowSubtextGreen}>02:30 PM • Scheduled run</Text>
            </View>
          </View>
          <View style={styles.badgeNext}>
            <Text style={styles.badgeNextText}>NEXT IN 1H 40M</Text>
          </View>
        </View>

        {/* Row 3: Perimeter Security & Lights (Scheduled) */}
        <View style={styles.scheduleRow}>
          <View style={styles.leftGroup}>
            <View style={styles.iconCircleGray}>
              <Shield size={16} color="#556253" />
            </View>
            <View style={styles.textGroup}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                Perimeter Security & Lights
              </Text>
              <Text style={styles.rowSubtext}>06:45 PM • Night Mode</Text>
            </View>
          </View>
          <View style={styles.badgeDone}>
            <Text style={styles.badgeDoneText}>Scheduled</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleColumn: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: '#556253',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
    marginTop: 2,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#131e13',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  rowsList: {
    gap: 10,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(243, 244, 242, 0.6)',
    borderRadius: 16,
    padding: 10,
  },
  scheduleRowNext: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f4f2',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(198, 232, 90, 0.5)',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  iconCircleGreen: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(198, 232, 90, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconCircleLime: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#C6E85A',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconCircleGray: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e2e3e1',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textGroup: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
  },
  rowSubtext: {
    fontSize: 11,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
    marginTop: 1,
  },
  rowSubtextGreen: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    color: '#516600',
    marginTop: 1,
  },
  badgeDone: {
    backgroundColor: '#e2e3e1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    flexShrink: 0,
  },
  badgeDoneText: {
    fontSize: 10,
    fontFamily: 'Manrope_500Medium',
    color: '#556253',
  },
  badgeNext: {
    backgroundColor: '#1E2A1E',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    flexShrink: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  badgeNextText: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    color: '#C6E85A',
    letterSpacing: 0.5,
  },
});

