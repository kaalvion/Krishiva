import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Droplets,
  Thermometer,
  CloudRain,
  Cpu,
  Layers,
  Calendar,
  Filter,
  Database,
} from 'lucide-react-native';
import { useActiveFarm } from '../../../src/context/FarmContext';
import { ServerStatusBanner } from '../../../src/context/ServerStatusContext';
import { useLiveDevices, useLiveHeatmap, useDeviceHistory } from '../../../src/hooks/live';
import { LineChart, type ChartDataPoint } from '../../../src/components/LineChart';
import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';
import { colors } from '../../../src/theme/colors';

type MetricType = 'soilMoisture' | 'temperature' | 'humidity';
type RangeOption = 6 | 24 | 168;

export default function AnalyticsScreen() {
  const router = useRouter();
  const { activeFarm } = useActiveFarm();

  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('soilMoisture');
  const [selectedRange, setSelectedRange] = useState<RangeOption>(24);
  const [filterWithDataOnly, setFilterWithDataOnly] = useState<boolean>(false);

  // Fetch devices live from Firestore
  const {
    devices,
    loading: devicesLoading,
    refresh: refreshDevices,
    fromCache: devicesFromCache,
  } = useLiveDevices(activeFarm?.id);

  // Fetch heatmap live (for identifying devices with active readings)
  const {
    cells,
    loading: heatmapLoading,
    fromCache: heatmapFromCache,
  } = useLiveHeatmap(activeFarm?.id);

  // Filter devices
  const availableDevices = useMemo(() => {
    if (!devices || devices.length === 0) return [];
    if (!filterWithDataOnly || cells.length === 0) return devices;

    const deviceIdsWithData = new Set(
      cells
        .filter((c) => c.soilMoisture !== null || c.temperature !== null || c.humidity !== null)
        .map((c) => c.deviceId)
    );

    return devices.filter((d) => deviceIdsWithData.has(d.id));
  }, [devices, cells, filterWithDataOnly]);

  // Set default selected device once loaded
  const currentDeviceId = useMemo(() => {
    if (selectedDeviceId && availableDevices.some((d) => d.id === selectedDeviceId)) {
      return selectedDeviceId;
    }
    return availableDevices.length > 0 ? availableDevices[0].id : null;
  }, [selectedDeviceId, availableDevices]);

  // Query history directly from Firestore UTC daily buckets
  const {
    readings: historyReadings,
    loading: historyLoading,
    error: historyErr,
    fromCache: historyFromCache,
    refetch: refetchHistory,
  } = useDeviceHistory(currentDeviceId ?? undefined, activeFarm?.id, selectedRange);

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    refreshDevices();
    await refetchHistory();
    setRefreshing(false);
  };

  // Convert history readings to chart data points
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (!historyReadings || historyReadings.length === 0) return [];
    return historyReadings
      .filter((r) => r[selectedMetric] !== null && r[selectedMetric] !== undefined)
      .map((r) => ({
        x: new Date(r.recordedAt).getTime(),
        y: Number(r[selectedMetric]),
        recordedAt: r.recordedAt,
      }));
  }, [historyReadings, selectedMetric]);

  if (!activeFarm) {
    return (
      <View style={styles.noFarmContainer}>
        <EmptyState
          icon={<Layers size={32} color={colors.primary} />}
          title="No Farm Selected"
          description="Please select a farm from your farms list to view its analytics."
          actionTitle="Back to Farms"
          onAction={() => router.replace('/(app)/farms')}
        />
      </View>
    );
  }

  // Metric metadata
  const metricConfig = {
    soilMoisture: {
      label: 'Soil Moisture',
      unit: '%',
      color: '#1976D2',
      icon: <Droplets size={16} color={selectedMetric === 'soilMoisture' ? '#FFFFFF' : '#1976D2'} />,
    },
    temperature: {
      label: 'Temperature',
      unit: '°C',
      color: '#E65100',
      icon: <Thermometer size={16} color={selectedMetric === 'temperature' ? '#FFFFFF' : '#E65100'} />,
    },
    humidity: {
      label: 'Humidity',
      unit: '%',
      color: '#00897B',
      icon: <CloudRain size={16} color={selectedMetric === 'humidity' ? '#FFFFFF' : '#00897B'} />,
    },
  }[selectedMetric];

  const currentDevice = devices.find((d) => d.id === currentDeviceId);
  const isFromCache = historyFromCache || devicesFromCache || heatmapFromCache;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      {/* Server Status Banner */}
      <ServerStatusBanner />

      {/* Showing Cached Data Banner if from cache */}
      {isFromCache && (
        <View style={styles.cacheBanner}>
          <Database size={13} color={colors.textSecondary} />
          <Text style={styles.cacheBannerText}>Showing saved offline data</Text>
        </View>
      )}

      {/* Device Selector Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Select Hardware Node</Text>
        <TouchableOpacity
          style={[styles.filterToggle, filterWithDataOnly && styles.filterToggleActive]}
          onPress={() => setFilterWithDataOnly(!filterWithDataOnly)}
        >
          <Filter size={12} color={filterWithDataOnly ? colors.primary : colors.textSecondary} />
          <Text
            style={[
              styles.filterToggleText,
              filterWithDataOnly && styles.filterToggleTextActive,
            ]}
          >
            {filterWithDataOnly ? 'Has data' : 'All devices'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.deviceChipScroll}
      >
        {availableDevices.map((device) => {
          const isSelected = device.id === currentDeviceId;
          return (
            <TouchableOpacity
              key={device.id}
              style={[styles.deviceChip, isSelected && styles.deviceChipSelected]}
              onPress={() => setSelectedDeviceId(device.id)}
            >
              <Cpu size={14} color={isSelected ? colors.textInverse : colors.primary} />
              <Text
                style={[
                  styles.deviceChipText,
                  isSelected && styles.deviceChipTextSelected,
                ]}
              >
                {device.name}
              </Text>
              <Text
                style={[
                  styles.deviceNodeText,
                  isSelected && styles.deviceNodeTextSelected,
                ]}
              >
                #{device.nodeId}
              </Text>
            </TouchableOpacity>
          );
        })}
        {availableDevices.length === 0 && !devicesLoading && (
          <Text style={styles.noDevicesText}>
            {filterWithDataOnly ? 'No devices with data found' : 'No devices registered'}
          </Text>
        )}
      </ScrollView>

      {/* Metric Selector Toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[
            styles.metricTab,
            selectedMetric === 'soilMoisture' && { backgroundColor: '#1976D2', borderColor: '#1976D2' },
          ]}
          onPress={() => setSelectedMetric('soilMoisture')}
        >
          <Droplets size={14} color={selectedMetric === 'soilMoisture' ? '#FFFFFF' : '#1976D2'} />
          <Text
            style={[
              styles.metricTabText,
              selectedMetric === 'soilMoisture' && styles.metricTabTextActive,
            ]}
          >
            Moisture
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.metricTab,
            selectedMetric === 'temperature' && { backgroundColor: '#E65100', borderColor: '#E65100' },
          ]}
          onPress={() => setSelectedMetric('temperature')}
        >
          <Thermometer size={14} color={selectedMetric === 'temperature' ? '#FFFFFF' : '#E65100'} />
          <Text
            style={[
              styles.metricTabText,
              selectedMetric === 'temperature' && styles.metricTabTextActive,
            ]}
          >
            Temperature
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.metricTab,
            selectedMetric === 'humidity' && { backgroundColor: '#00897B', borderColor: '#00897B' },
          ]}
          onPress={() => setSelectedMetric('humidity')}
        >
          <CloudRain size={14} color={selectedMetric === 'humidity' ? '#FFFFFF' : '#00897B'} />
          <Text
            style={[
              styles.metricTabText,
              selectedMetric === 'humidity' && styles.metricTabTextActive,
            ]}
          >
            Humidity
          </Text>
        </TouchableOpacity>
      </View>

      {/* Range Selector Toggle */}
      <View style={styles.rangeRow}>
        <View style={styles.rangeLabelBlock}>
          <Calendar size={14} color={colors.textSecondary} />
          <Text style={styles.rangeLabel}>Time Window</Text>
        </View>

        <View style={styles.rangePills}>
          {([6, 24, 168] as RangeOption[]).map((hours) => {
            const isSelected = selectedRange === hours;
            const label = hours === 6 ? '6h' : hours === 24 ? '24h' : '7d';
            return (
              <TouchableOpacity
                key={hours}
                style={[styles.rangePill, isSelected && styles.rangePillActive]}
                onPress={() => setSelectedRange(hours)}
              >
                <Text
                  style={[
                    styles.rangePillText,
                    isSelected && styles.rangePillTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Chart Section */}
      <View style={styles.chartHeader}>
        <View>
          <Text style={styles.chartTitle}>{metricConfig.label} Trend</Text>
          <Text style={styles.chartSubtitle}>
            {currentDevice?.name || 'Selected Node'} • Past{' '}
            {selectedRange === 6 ? '6 Hours' : selectedRange === 24 ? '24 Hours' : '7 Days'}
          </Text>
        </View>
        <Text style={styles.pointsCountText}>
          {chartData.length} data points
        </Text>
      </View>

      <LineChart
        data={chartData}
        metricLabel={metricConfig.label}
        metricUnit={metricConfig.unit}
        lineColor={metricConfig.color}
        isLoading={historyLoading}
        isError={Boolean(historyErr)}
        errorMessage={historyErr?.message}
        onRetry={refetchHistory}
      />

      {/* Analytics Insight Card */}
      {chartData.length > 0 && (
        <Card style={styles.insightCard}>
          <Text style={styles.insightTitle}>Telemetry Overview</Text>
          <Text style={styles.insightText}>
            Historical trends are automatically recorded into UTC daily buckets from IoT
            telemetry packets. Points above 300 are smoothly downsampled for optimal
            mobile rendering.
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  noFarmContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  cacheBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  cacheBannerText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 4,
  },
  filterToggleActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  filterToggleText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterToggleTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  deviceChipScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 12,
  },
  deviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  deviceChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  deviceChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  deviceChipTextSelected: {
    color: colors.textInverse,
  },
  deviceNodeText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  deviceNodeTextSelected: {
    color: '#C8E6C9',
  },
  noDevicesText: {
    fontSize: 12,
    color: colors.textMuted,
    paddingVertical: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    marginTop: 4,
  },
  metricTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 6,
  },
  metricTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  metricTabTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  rangeLabelBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rangeLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  rangePills: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 2,
    gap: 2,
  },
  rangePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  rangePillActive: {
    backgroundColor: colors.primary,
  },
  rangePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  rangePillTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  chartSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pointsCountText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  insightCard: {
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.primarySurface,
    borderColor: '#C8E6C9',
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 4,
  },
  insightText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
