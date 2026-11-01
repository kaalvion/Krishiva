import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  MapPin,
  Sun,
  Droplets,
  CloudRain,
  Gauge,
  Wind,
} from 'lucide-react-native';
import type { FarmWeather } from '../../hooks/live/useLiveWeather';

interface WeatherCardProps {
  weather?: FarmWeather | null;
  avgHumidity?: number | null;
  farmName?: string;
  plotName?: string;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({
  weather,
  avgHumidity,
  farmName = 'Nashik Greenfield',
  plotName = 'Plot 4B',
}) => {
  const rain6h = weather?.rainNext6hMm ?? 0;
  const humidity = avgHumidity ?? weather?.hourly?.[0]?.humidity ?? 68;
  const temp = weather?.dailySummary?.[0]?.tempMax ?? 32;
  const minTemp = weather?.dailySummary?.[0]?.tempMin ?? 22;

  return (
    <View style={styles.container}>
      {/* Top Row: Temp, Location, High/Low, Sun & Badge */}
      <View style={styles.topRow}>
        <View style={styles.tempLocationGroup}>
          <Text style={styles.tempValue}>+{temp}°</Text>
          <View style={styles.locationBlock}>
            <View style={styles.locationTitleRow}>
              <MapPin size={13} color="#516600" />
              <Text style={styles.locationText} numberOfLines={1}>
                {farmName}, {plotName}
              </Text>
            </View>
            <Text style={styles.subtext}>
              H: +{temp + 3}° / L: +{minTemp}° • Asia/Kolkata (IST)
            </Text>
          </View>
        </View>

        <View style={styles.statusGroup}>
          <View style={styles.sunCircle}>
            <Sun size={16} color="#516600" />
          </View>
          <View style={styles.growthBadge}>
            <Text style={styles.growthBadgeText}>OPTIMAL GROWTH</Text>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Bottom Row: 4 Mini Metric Items */}
      <View style={styles.metricsRow}>
        {/* Metric 1: Humidity */}
        <View style={styles.metricItem}>
          <Droplets size={13} color="#556253" />
          <Text style={styles.metricValue}>
            {humidity}% <Text style={styles.metricUnit}>Hum</Text>
          </Text>
        </View>

        {/* Metric 2: Rain */}
        <View style={styles.metricItem}>
          <CloudRain size={13} color="#556253" />
          <Text style={styles.metricValue}>
            {rain6h} mm <Text style={styles.metricUnit}>Rain</Text>
          </Text>
        </View>

        {/* Metric 3: Pressure */}
        <View style={styles.metricItem}>
          <Gauge size={13} color="#556253" />
          <Text style={styles.metricValue}>
            1012 <Text style={styles.metricUnit}>hPa</Text>
          </Text>
        </View>

        {/* Metric 4: Wind */}
        <View style={styles.metricItem}>
          <Wind size={13} color="#556253" />
          <Text style={styles.metricValue}>
            14k <Text style={styles.metricUnit}>SW</Text>
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  tempLocationGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    flex: 1,
    minWidth: 0,
    marginRight: 6,
  },
  tempValue: {
    fontSize: 26,
    fontFamily: 'Manrope_300Light',
    color: '#191c1b',
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  locationBlock: {
    flex: 1,
    minWidth: 0,
  },
  locationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  locationText: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
  },
  subtext: {
    fontSize: 10,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
    marginTop: 2,
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  sunCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(211, 225, 166, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  growthBadge: {
    backgroundColor: 'rgba(216, 231, 212, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  growthBadgeText: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    color: '#5b6859',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#edeeec',
    marginBottom: 10,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
  },
  metricUnit: {
    fontSize: 10,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
  },
});
