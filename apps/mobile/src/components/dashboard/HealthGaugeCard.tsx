import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Activity } from 'lucide-react-native';
import { useLanguage } from '../../context/LanguageContext';
import { colors } from '../../theme/colors';
import type { FarmHealth } from '../../hooks/live/useLiveHealth';

interface HealthGaugeCardProps {
  health: FarmHealth | null;
  loading?: boolean;
}

export const HealthGaugeCard: React.FC<HealthGaugeCardProps> = ({ health }) => {
  const { t } = useLanguage();

  const score = health?.score ?? 0;
  const isHealthy = score >= 80;
  const isModerate = score >= 60 && score < 80;

  const gaugeColor = isHealthy ? '#C6E85A' : isModerate ? '#EF6C00' : '#ba1a1a';
  const gaugeTextColor = isHealthy ? '#1E2A1E' : gaugeColor;
  const badgeBg = isHealthy ? '#f3f4f2' : isModerate ? '#FFF3E0' : '#FFDAD6';

  const conditionText = health
    ? isHealthy
      ? 'Optimal Crop Condition'
      : isModerate
      ? 'Moderate Attention Required'
      : 'Critical Attention Required'
    : 'Evaluating metrics...';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={styles.iconCircle}>
            <Activity size={16} color={colors.primaryDark} />
          </View>
          <Text style={styles.cardTitle}>{t('dashboard.farm_health') || 'Farm Health'}</Text>
        </View>

        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          <Text style={[styles.badgeText, { color: gaugeTextColor }]}>
            {health ? `${health.score}/100` : 'Calculating...'}
          </Text>
        </View>
      </View>

      <View style={styles.gaugeContent}>
        {/* Circular Gauge Ring */}
        <View style={[styles.ringContainer, { borderColor: gaugeColor }]}>
          <Text style={[styles.scoreNumber, { color: gaugeTextColor }]}>
            {health ? health.score : '--'}
          </Text>
          <Text style={styles.scoreUnit}>INDEX</Text>
        </View>

        <View style={styles.detailsColumn}>
          <Text style={styles.conditionTitle}>{conditionText}</Text>
          {health && health.reasons.length > 0 ? (
            <View style={styles.reasonsWrap}>
              {health.reasons.slice(0, 3).map((reason, idx) => (
                <View key={idx} style={styles.reasonChip}>
                  <Text style={styles.reasonChipText} numberOfLines={1}>
                    {reason}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.subtext}>All sensor nodes and parameters are within normal ranges.</Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
    color: colors.primaryDark,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
  },
  gaugeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ringContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9faf8',
  },
  scoreNumber: {
    fontSize: 22,
    fontFamily: 'Manrope_700Bold',
    lineHeight: 26,
  },
  scoreUnit: {
    fontSize: 8,
    fontFamily: 'Manrope_700Bold',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  detailsColumn: {
    flex: 1,
  },
  conditionTitle: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    color: colors.text,
    marginBottom: 6,
  },
  reasonsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  reasonChip: {
    backgroundColor: '#f3f4f2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  reasonChipText: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    color: colors.textSecondary,
  },
  subtext: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
