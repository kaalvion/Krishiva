import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Cpu,
  Sprout,
  Maximize2,
  Wifi,
  Clock,
  Radio,
  Layers,
  Droplets,
  Thermometer,
  CloudRain,
  Activity,
} from 'lucide-react-native';
import { useActiveFarm } from '../../../src/context/FarmContext';
import { useDevices } from '../../../src/hooks/useDevices';
import { useHeatmap } from '../../../src/hooks/useHeatmap';
import { useIsScreenFocused } from '../../../src/hooks/useIsScreenFocused';
import { Card } from '../../../src/components/Card';
import { Badge } from '../../../src/components/Badge';
import { ErrorView } from '../../../src/components/ErrorView';
import { LoadingView } from '../../../src/components/LoadingView';
import { EmptyState } from '../../../src/components/EmptyState';
import { FieldHeatmap } from '../../../src/components/FieldHeatmap';
import { AlertBanner } from '../../../src/components/AlertBanner';
import { colors } from '../../../src/theme/colors';
import type { Device, HeatmapCell } from '../../../src/types';

export default function DashboardScreen() {
  const router = useRouter();
  const { activeFarm } = useActiveFarm();
  const isScreenFocused = useIsScreenFocused();

  // Queries refetch every 15s while screen is focused, pause when screen is not
  const {
    data: devices,
    isLoading: devicesLoading,
    isError: devicesError,
    error: devicesErr,
    refetch: refetchDevices,
    isRefetching: isRefetchingDevices,
  } = useDevices(activeFarm?.id, {
    refetchInterval: isScreenFocused ? 15000 : false,
  });

  const {
    data: heatmapData,
    isLoading: heatmapLoading,
    isError: heatmapError,
    error: heatmapErr,
    refetch: refetchHeatmap,
    isRefetching: isRefetchingHeatmap,
  } = useHeatmap(activeFarm?.id, {
    refetchInterval: isScreenFocused ? 15000 : false,
  });

  const isRefreshing = isRefetchingDevices || isRefetchingHeatmap;

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchDevices(), refetchHeatmap()]);
  }, [refetchDevices, refetchHeatmap]);

  if (!activeFarm) {
    return (
      <View style={styles.noFarmContainer}>
        <EmptyState
          icon={<Layers size={32} color={colors.primary} />}
          title="No Farm Selected"
          description="Please select a farm from your farms list to view its dashboard."
          actionTitle="Back to Farms"
          onAction={() => router.replace('/(app)/farms')}
        />
      </View>
    );
  }

  const cells: HeatmapCell[] = heatmapData?.cells ?? [];
  const onlineCount = devices?.filter((d) => d.status === 'online').length ?? 0;
  const totalCount = devices?.length ?? 0;
  const offlineCount = Math.max(0, totalCount - onlineCount);

  // Compute sensor averages across devices that have data
  const cellsWithMoisture = cells.filter((c) => c.soilMoisture !== null && c.soilMoisture !== undefined);
  const avgMoisture =
    cellsWithMoisture.length > 0
      ? Math.round(
          cellsWithMoisture.reduce((acc, c) => acc + (c.soilMoisture ?? 0), 0) /
            cellsWithMoisture.length
        )
      : null;

  const cellsWithTemp = cells.filter((c) => c.temperature !== null && c.temperature !== undefined);
  const avgTemp =
    cellsWithTemp.length > 0
      ? Number(
          (
            cellsWithTemp.reduce((acc, c) => acc + (c.temperature ?? 0), 0) /
            cellsWithTemp.length
          ).toFixed(1)
        )
      : null;

  const cellsWithHumidity = cells.filter((c) => c.humidity !== null && c.humidity !== undefined);
  const avgHumidity =
    cellsWithHumidity.length > 0
      ? Math.round(
          cellsWithHumidity.reduce((acc, c) => acc + (c.humidity ?? 0), 0) /
            cellsWithHumidity.length
        )
      : null;

  // Find latest updated timestamp across all cells
  const latestRecordedTimestamps = cells
    .map((c) => c.recordedAt)
    .filter((t): t is string => Boolean(t))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  const latestRecordedAt = latestRecordedTimestamps[0] || null;

  const formatLastUpdated = (timestamp: string | null) => {
    if (!timestamp) return 'No data yet';
    try {
      const d = new Date(timestamp);
      const diffMs = Date.now() - d.getTime();
      if (diffMs < 30000) return 'Just now';
      if (diffMs < 60000) return 'Less than a minute ago';
      const mins = Math.floor(diffMs / 60000);
      if (mins < 60) return `${mins}m ago`;
      return (
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
        ', ' +
        d.toLocaleDateString([], { month: 'short', day: 'numeric' })
      );
    } catch {
      return timestamp;
    }
  };

  const formatLastSeen = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    try {
      const date = new Date(timestamp);
      return (
        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
        ', ' +
        date.toLocaleDateString([], { month: 'short', day: 'numeric' })
      );
    } catch {
      return timestamp;
    }
  };

  // Status color logic based on requirements:
  // Soil moisture: <=15 red "Critical", <=25 orange "Low", <=60 green "Good", above 60 blue "Wet"
  const getMoistureBadge = (val: number | null) => {
    if (val === null) return { text: 'No data', color: colors.textMuted, bg: '#F5F5F5' };
    if (val <= 15) return { text: 'Critical', color: '#D32F2F', bg: '#FFEBEE' };
    if (val <= 25) return { text: 'Low', color: '#EF6C00', bg: '#FFF3E0' };
    if (val <= 60) return { text: 'Good', color: '#2E7D32', bg: '#E8F5E9' };
    return { text: 'Wet', color: '#1976D2', bg: '#E3F2FD' };
  };

  // Temperature: >=42 red, >=35 orange, else green
  const getTempBadge = (val: number | null) => {
    if (val === null) return { text: 'No data', color: colors.textMuted, bg: '#F5F5F5' };
    if (val >= 42) return { text: 'Extreme', color: '#D32F2F', bg: '#FFEBEE' };
    if (val >= 35) return { text: 'Hot', color: '#EF6C00', bg: '#FFF3E0' };
    return { text: 'Normal', color: '#2E7D32', bg: '#E8F5E9' };
  };

  // Humidity: >=90 orange, else green
  const getHumidityBadge = (val: number | null) => {
    if (val === null) return { text: 'No data', color: colors.textMuted, bg: '#F5F5F5' };
    if (val >= 90) return { text: 'High', color: '#EF6C00', bg: '#FFF3E0' };
    return { text: 'Good', color: '#2E7D32', bg: '#E8F5E9' };
  };

  const moistureBadge = getMoistureBadge(avgMoisture);
  const tempBadge = getTempBadge(avgTemp);
  const humidityBadge = getHumidityBadge(avgHumidity);

  const renderDeviceCard = ({ item }: { item: Device }) => {
    const isOnline = item.status === 'online';

    return (
      <Card style={styles.deviceCard}>
        <View style={styles.deviceHeader}>
          <View style={styles.deviceInfoLeft}>
            <View
              style={[
                styles.deviceIconCircle,
                isOnline ? styles.deviceIconOnline : styles.deviceIconOffline,
              ]}
            >
              <Cpu size={20} color={isOnline ? colors.primary : colors.textSecondary} />
            </View>
            <View style={styles.deviceNameBlock}>
              <Text style={styles.deviceName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.nodeIdText}>
                Hardware Node #{item.nodeId} • {item.type.replace('_', ' ')}
              </Text>
            </View>
          </View>
          <Badge
            label={item.status}
            variant={isOnline ? 'success' : 'neutral'}
          />
        </View>

        <View style={styles.deviceDivider} />

        {/* Footer info: capabilities & last seen */}
        <View style={styles.deviceFooter}>
          <View style={styles.capabilitiesRow}>
            {item.capabilities.map((cap) => (
              <View key={cap} style={styles.capChip}>
                <Text style={styles.capChipText}>{cap}</Text>
              </View>
            ))}
          </View>

          <View style={styles.lastSeenRow}>
            <Clock size={12} color={colors.textMuted} />
            <Text style={styles.lastSeenText}>
              Last seen: {formatLastSeen(item.lastSeenAt)}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerBlock}>
      {/* Active Alerts Banner */}
      <AlertBanner farmId={activeFarm.id} />

      {/* Farm Overview Card */}
      <Card style={styles.overviewCard}>
        <View style={styles.overviewHeader}>
          <View>
            <Text style={styles.overviewFarmName}>{activeFarm.name}</Text>
            <Text style={styles.overviewLocation}>Timezone: {activeFarm.timezone}</Text>
          </View>
          <Badge
            label={activeFarm.role}
            variant={
              activeFarm.role === 'owner'
                ? 'success'
                : activeFarm.role === 'admin'
                ? 'warning'
                : 'neutral'
            }
          />
        </View>

        <View style={styles.statGrid}>
          <View style={styles.statCard}>
            <Sprout size={18} color={colors.primary} />
            <Text style={styles.statLabel}>Primary Crop</Text>
            <Text style={styles.statValue}>{activeFarm.cropType}</Text>
          </View>
          <View style={styles.statCard}>
            <Maximize2 size={18} color={colors.primary} />
            <Text style={styles.statLabel}>Total Area</Text>
            <Text style={styles.statValue}>{activeFarm.areaAcres} Acres</Text>
          </View>
          <View style={styles.statCard}>
            <Radio size={18} color={colors.primary} />
            <Text style={styles.statLabel}>Devices</Text>
            <Text style={styles.statValue}>
              {onlineCount}/{totalCount} Online
            </Text>
          </View>
        </View>
      </Card>

      {/* Live Telemetry Status Bar */}
      <View style={styles.telemetryStatusRow}>
        <View style={styles.telemetryTimeBlock}>
          <Activity size={14} color={colors.primary} />
          <Text style={styles.telemetryTimeText}>
            Updated: {formatLastUpdated(latestRecordedAt)}
          </Text>
        </View>
        <View style={styles.deviceStatusPills}>
          <View style={styles.statusPill}>
            <View style={[styles.statusDot, { backgroundColor: colors.online }]} />
            <Text style={styles.statusPillText}>{onlineCount} Online</Text>
          </View>
          {offlineCount > 0 && (
            <View style={styles.statusPill}>
              <View style={[styles.statusDot, { backgroundColor: colors.offline }]} />
              <Text style={styles.statusPillText}>{offlineCount} Offline</Text>
            </View>
          )}
        </View>
      </View>

      {/* Summary Sensor Cards */}
      <View style={styles.sensorCardsRow}>
        {/* Soil Moisture */}
        <Card style={styles.sensorCard}>
          <View style={styles.sensorCardHeader}>
            <View style={[styles.sensorIconCircle, { backgroundColor: '#E3F2FD' }]}>
              <Droplets size={16} color="#1976D2" />
            </View>
            <View style={[styles.sensorBadge, { backgroundColor: moistureBadge.bg }]}>
              <Text style={[styles.sensorBadgeText, { color: moistureBadge.color }]}>
                {moistureBadge.text}
              </Text>
            </View>
          </View>
          <Text style={styles.sensorValue}>
            {avgMoisture !== null ? `${avgMoisture}%` : '--'}
          </Text>
          <Text style={styles.sensorLabel}>Soil Moisture (Avg)</Text>
        </Card>

        {/* Temperature */}
        <Card style={styles.sensorCard}>
          <View style={styles.sensorCardHeader}>
            <View style={[styles.sensorIconCircle, { backgroundColor: '#FBE9E7' }]}>
              <Thermometer size={16} color="#E65100" />
            </View>
            <View style={[styles.sensorBadge, { backgroundColor: tempBadge.bg }]}>
              <Text style={[styles.sensorBadgeText, { color: tempBadge.color }]}>
                {tempBadge.text}
              </Text>
            </View>
          </View>
          <Text style={styles.sensorValue}>
            {avgTemp !== null ? `${avgTemp}°C` : '--'}
          </Text>
          <Text style={styles.sensorLabel}>Temperature (Avg)</Text>
        </Card>

        {/* Humidity */}
        <Card style={styles.sensorCard}>
          <View style={styles.sensorCardHeader}>
            <View style={[styles.sensorIconCircle, { backgroundColor: '#E0F2F1' }]}>
              <CloudRain size={16} color="#00897B" />
            </View>
            <View style={[styles.sensorBadge, { backgroundColor: humidityBadge.bg }]}>
              <Text style={[styles.sensorBadgeText, { color: humidityBadge.color }]}>
                {humidityBadge.text}
              </Text>
            </View>
          </View>
          <Text style={styles.sensorValue}>
            {avgHumidity !== null ? `${avgHumidity}%` : '--'}
          </Text>
          <Text style={styles.sensorLabel}>Humidity (Avg)</Text>
        </Card>
      </View>

      {/* Field Heatmap */}
      <FieldHeatmap cells={cells} />

      {/* Devices Section Title */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Wifi size={18} color={colors.primaryDark} />
          <Text style={styles.sectionTitle}>Farm IoT Nodes</Text>
        </View>
        <Text style={styles.deviceCountText}>
          {totalCount} {totalCount === 1 ? 'node' : 'nodes'}
        </Text>
      </View>
    </View>
  );

  const initialLoading = devicesLoading && heatmapLoading;
  const hasError = devicesError && !devices;

  return (
    <View style={styles.container}>
      {initialLoading ? (
        <LoadingView label="Loading farm telemetry..." />
      ) : hasError ? (
        <ErrorView
          title="Could Not Load Dashboard"
          message={devicesErr?.message || heatmapErr?.message || 'Failed to fetch farm data.'}
          onRetry={handleRefresh}
          retrying={isRefreshing}
        />
      ) : (
        <FlatList
          data={devices ?? []}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          renderItem={renderDeviceCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<Cpu size={32} color={colors.primary} />}
              title="No Devices Found"
              description="No sensor or actuator nodes have been registered for this farm yet."
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  noFarmContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerBlock: {
    marginBottom: 8,
  },
  overviewCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    elevation: 3,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  overviewFarmName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textInverse,
    letterSpacing: -0.5,
  },
  overviewLocation: {
    fontSize: 12,
    color: '#C8E6C9',
    marginTop: 2,
  },
  statGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    padding: 10,
    marginHorizontal: 3,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#C8E6C9',
    marginTop: 4,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 13,
    color: colors.textInverse,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  telemetryStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  telemetryTimeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  telemetryTimeText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  deviceStatusPills: {
    flexDirection: 'row',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sensorCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  sensorCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
  },
  sensorCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sensorIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sensorBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sensorBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  sensorValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  sensorLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 6,
    paddingHorizontal: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 6,
  },
  deviceCountText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  deviceCard: {
    marginBottom: 12,
    padding: 16,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  deviceIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceIconOnline: {
    backgroundColor: colors.primarySurface,
  },
  deviceIconOffline: {
    backgroundColor: colors.borderLight,
  },
  deviceNameBlock: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  nodeIdText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  deviceDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 12,
  },
  deviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  capabilitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  capChip: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  capChipText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  lastSeenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  lastSeenText: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
