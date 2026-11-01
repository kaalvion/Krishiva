import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CloudRain, Droplets, Gauge, Wind, Sun } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import type { FarmWeather } from '../../hooks/live/useLiveWeather';

interface WeatherCardProps {
  weather: FarmWeather | null;
  avgHumidity?: number | null;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({ weather, avgHumidity }) => {
  const rain6h = weather?.rainNext6hMm ?? 0;
  const humidity = avgHumidity ?? weather?.hourly?.[0]?.humidity ?? 62;
  const temp = weather?.dailySummary?.[0]?.tempMax ?? 31;
  const rainProb = weather?.hourly?.[0]?.precipProb ?? 15;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={styles.iconCircle}>
            <Sun size={16} color={colors.primaryDark} />
          </View>
          <Text style={styles.cardTitle}>Live Agro-Weather</Text>
        </View>
        <Text style={styles.sourceTag}>Open-Meteo</Text>
      </View>

      <View style={styles.metricsRow}>
        {/* Metric 1: Humidity */}
        <View style={styles.miniMetric}>
          <Droplets size={16} color="#1976D2" />
          <Text style={styles.metricValue}>{humidity}%</Text>
          <Text style={styles.metricLabel}>Humidity</Text>
        </View>

        <View style={styles.divider} />

        {/* Metric 2: Rain (Next 6h) */}
        <View style={styles.miniMetric}>
          <CloudRain size={16} color="#0284C7" />
          <Text style={styles.metricValue}>{rain6h} mm</Text>
          <Text style={styles.metricLabel}>Rain 6h</Text>
        </View>

        <View style={styles.divider} />

        {/* Metric 3: Temp / Pressure */}
        <View style={styles.miniMetric}>
          <Gauge size={16} color="#E65100" />
          <Text style={styles.metricValue}>{temp}°C</Text>
          <Text style={styles.metricLabel}>Max Temp</Text>
        </View>

        <View style={styles.divider} />

        {/* Metric 4: Wind / Precip Prob */}
        <View style={styles.miniMetric}>
          <Wind size={16} color="#556253" />
          <Text style={styles.metricValue}>{rainProb}%</Text>
          <Text style={styles.metricLabel}>Precip</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
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
    marginBottom: 14,
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
  sourceTag: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    color: colors.textSecondary,
    backgroundColor: '#f3f4f2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  miniMetric: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  metricValue: {
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
    color: colors.text,
    marginTop: 6,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
    fontFamily: 'Manrope_400Regular',
    color: colors.textSecondary,
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: colors.borderLight,
  },
});
