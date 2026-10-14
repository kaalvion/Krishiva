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
} from 'lucide-react-native';
import { useActiveFarm } from '../../../src/context/FarmContext';
import { useDevices } from '../../../src/hooks/useDevices';
import { useHeatmap } from '../../../src/hooks/useHeatmap';
import { useHistory } from '../../../src/hooks/useHistory';
import { LineChart, type ChartDataPoint } from '../../../src/components/LineChart';
import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';
import { colors } from '../../../src/theme/colors';
import type { Device } from '../../../src/types';

type MetricType = 'soilMoisture' | 'temperature' | 'humidity';
type RangeOption = 6 | 24 | 168;

export default function AnalyticsScreen() {
  const router = useRouter();
  const { activeFarm } = useActiveFarm();

  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('soilMoisture');
  const [selectedRange, setSelectedRange] = useState<RangeOption>(24);
  const [filterWithDataOnly, setFilterWithDataOnly] = useState<boolean>(false);

  // Fetch devices
  const {
    data: devices,
    isLoading: devicesLoading,
    refetch: refetchDevices,
  } = useDevices(activeFarm?.id);

  // Fetch heatmap (for identifying devices with active readings)
  const {
    data: heatmapData,
    refetch: refetchHeatmap,
  } = useHeatmap(activeFarm?.id);

  // Filter devices
  const availableDevices = useMemo(() => {
    if (!devices || devices.length === 0) return [];
    if (!filterWithDataOnly || !heatmapData) return devices;

    const deviceIdsWithData = new Set(
      heatmapData.cells
        .filter((c) => c.soilMoisture !== null || c.temperature !== null || c.humidity !== null)
        .map((c) => c.deviceId)
    );

    return devices.filter((d) => deviceIdsWithData.has(d.id));
  }, [devices, heatmapData, filterWithDataOnly]);

  // Set default selected device once loaded
  const currentDeviceId = useMemo(() => {
    if (selectedDeviceId && availableDevices.some((d) => d.id === selectedDeviceId)) {
      return selectedDeviceId;
    }
    return availableDevices.length > 0 ? availableDevices[0].id : null;
  }, [selectedDeviceId, availableDevices]);

  // Query history for the selected device and range
  const {
    data: historyData,
    isLoading: historyLoading,
    isError: historyError,
    error: historyErr,
    refetch: refetchHistory,
    isRefetching: historyRefetching,
  } = useHistory(currentDeviceId ?? undefined, activeFarm?.id, selectedRange, {
    enabled: Boolean(currentDeviceId) && Boolean(activeFarm?.id),
  });

  const handleRefresh = async () => {
    await Promise.all([refetchDevices(), refetchHeatmap(), refetchHistory()]);
  };

  // Convert history readings to chart data points
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (!historyData?.readings) return [];
    return historyData.readings
      .filter((r) => r[selectedMetric] !== null && r[selectedMetric] !== undefined)
      .map((r) => ({
        x: new Date(r.recordedAt).getTime(),
        y: Number(r[selectedMetric]),
        recordedAt: r.recordedAt,
      }));
  }, [historyData, selectedMetric]);

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

  const currentDevice = devices?.find((d) => d.id === currentDeviceId);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={historyRefetching}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
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
        isError={historyError}
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
    color: colors.text,
  },
  metricTabTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 16,
  },
  rangeLabelBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rangeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  rangePills: {
    flexDirection: 'row',
    gap: 6,
  },
  rangePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  rangePillActive: {
    backgroundColor: colors.primaryDark,
  },
  rangePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  rangePillTextActive: {
    color: colors.textInverse,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  chartTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  chartSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pointsCountText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  insightCard: {
    padding: 14,
    borderRadius: 12,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  insightText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
