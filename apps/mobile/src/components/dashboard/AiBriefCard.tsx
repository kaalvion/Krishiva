import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Sparkles, CheckCircle2 } from 'lucide-react-native';
import { useLanguage } from '../../context/LanguageContext';
import type { FarmBrief } from '../../hooks/live/useLiveBrief';

interface AiBriefCardProps {
  brief: FarmBrief | null;
  translatedBrief?: {
    headline?: string;
    body?: string;
    actionNow?: string;
  } | null;
  aiEnabled: boolean;
}

export const AiBriefCard: React.FC<AiBriefCardProps> = ({
  brief,
  translatedBrief,
  aiEnabled,
}) => {
  const { t } = useLanguage();

  if (!aiEnabled) {
    return null;
  }

  const urgencyConfig = {
    low: { label: 'Low Urgency', bg: 'rgba(198, 232, 90, 0.2)', color: '#C6E85A' },
    medium: { label: 'Medium Urgency', bg: 'rgba(239, 108, 0, 0.2)', color: '#FFB74D' },
    high: { label: 'Action Needed', bg: 'rgba(186, 26, 26, 0.3)', color: '#FF8A80' },
  }[brief?.urgency || 'low'];

  const headline = translatedBrief?.headline || brief?.headline || 'Daily Agronomy Brief';
  const body =
    translatedBrief?.body ||
    brief?.body ||
    'Daily AI agronomy brief is generated each morning and evening based on live field telemetry.';
  const actionNow = translatedBrief?.actionNow || brief?.actionNow;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={styles.iconCircle}>
            <Sparkles size={16} color="#C6E85A" />
          </View>
          <Text style={styles.cardTitle}>{t('dashboard.ai_insights') || 'Grok AI Brief'}</Text>
        </View>

        {brief && (
          <View style={[styles.urgencyBadge, { backgroundColor: urgencyConfig.bg }]}>
            <Text style={[styles.urgencyText, { color: urgencyConfig.color }]}>
              {urgencyConfig.label}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.headline}>{headline}</Text>
      <Text style={styles.body}>{body}</Text>

      {actionNow && actionNow !== 'null' && (
        <View style={styles.actionRow}>
          <CheckCircle2 size={16} color="#C6E85A" />
          <Text style={styles.actionText} numberOfLines={2}>
            {actionNow}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E2A1E',
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
    backgroundColor: 'rgba(198, 232, 90, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    color: '#C6E85A',
    letterSpacing: 0.2,
  },
  urgencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  urgencyText: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
  },
  headline: {
    fontSize: 18,
    fontFamily: 'Manrope_700Bold',
    color: '#ffffff',
    lineHeight: 24,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    color: '#f3f4f2',
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: '#C6E85A',
  },
});

