import React, { useCallback, useMemo } from 'react';
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
  Database,
  Sparkles,
  ShieldAlert,
  Sun,
  CheckCircle2,
} from 'lucide-react-native';
import { useActiveFarm } from '../../../src/context/FarmContext';
import { ServerStatusBanner, useServerStatus } from '../../../src/context/ServerStatusContext';
import {
  useLiveDevices,
  useLiveHeatmap,
  useLiveBrief,
  useLiveHealth,
  useLiveWeather,
  useLiveIrrigation,
} from '../../../src/hooks/live';
import {
  computeEffectiveStatus,
  getReadingFreshness,
  getAveragesStalenessNote,
  formatInTimezone,
} from '../../../src/utils/freshness';
import { Card } from '../../../src/components/Card';
import { Badge } from '../../../src/components/Badge';
import { ErrorView } from '../../../src/components/ErrorView';
import { LoadingView } from '../../../src/components/LoadingView';
import { EmptyState } from '../../../src/components/EmptyState';
import { FieldHeatmap } from '../../../src/components/FieldHeatmap';
import { AlertBanner } from '../../../src/components/AlertBanner';
import { colors } from '../../../src/theme/colors';
import type { Device } from '../../../src/types';

export default function DashboardScreen() {
  const router = useRouter();
  const { activeFarm } = useActiveFarm();
  const { aiEnabled } = useServerStatus();

  const {
    devices,
    loading: devicesLoading,
    error: devicesErr,
    fromCache: devicesFromCache,
    refresh: refreshDevices,
  } = useLiveDevices(activeFarm?.id);

  const {
    cells,
    loading: heatmapLoading,
    error: heatmapErr,
    fromCache: heatmapFromCache,
  } = useLiveHeatmap(activeFarm?.id);

  const { brief, loading: briefLoading } = useLiveBrief(activeFarm?.id);
  const { health, loading: healthLoading } = useLiveHealth(activeFarm?.id);
  const { weather, loading: weatherLoading } = useLiveWeather(activeFarm?.id);
  const { irrigation } = useLiveIrrigation(activeFarm?.id);

  const isFromCache = devicesFromCache || heatmapFromCache;
  const isRefreshing = false; // Firestore onSnapshot pushes live updates automatically

  const handleRefresh = useCallback(async () => {
    refreshDevices();
  }, [refreshDevices]);

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

  const onlineCount = devices.filter((d) => computeEffectiveStatus(d.lastSeenAt) === 'online').length;
  const totalCount = devices.length;
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
  const freshness = getReadingFreshness(latestRecordedAt);
  const stalenessNote = getAveragesStalenessNote(cells);

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

  const isWeatherStaleOrMissing =
    !weather ||
    !weather.fetchedAt ||
    Date.now() - new Date(weather.fetchedAt).getTime() > 6 * 60 * 60 * 1000;

  const healthColor =
    health?.color === 'green'
      ? '#2E7D32'
      : health?.color === 'yellow'
      ? '#D97706'
      : '#DC2626';

  const healthBg =
    health?.color === 'green'
      ? '#E8F5E9'
      : health?.color === 'yellow'
      ? '#FEF3C7'
      : '#FEE2E2';

  const urgencyBadge = {
    low: { text: 'Low Urgency', bg: '#E8F5E9', color: '#2E7D32' },
    medium: { text: 'Medium Urgency', bg: '#FEF3C7', color: '#D97706' },
    high: { text: 'Action Needed', bg: '#FEE2E2', color: '#DC2626' },
  }[brief?.urgency || 'low'];

  const irrigationTheme = {
    high: { color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5', label: 'Action Needed' },
    medium: { color: '#D97706', bg: '#FEF3C7', border: '#FDE68A', label: 'Irrigate Soon' },
    low: { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', label: 'Wait for Rain' },
    none: { color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', label: 'Adequate Moisture' },
  }[irrigation?.urgency || 'none'];

  const renderDeviceCard = ({ item }: { item: Device }) => {
    const effectiveStatus = computeEffectiveStatus(item.lastSeenAt);
    const isOnline = effectiveStatus === 'online';

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
            label={effectiveStatus === 'never_reported' ? 'Never Seen' : effectiveStatus}
            variant={isOnline ? 'success' : effectiveStatus === 'never_reported' ? 'neutral' : 'warning'}
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
              Last seen: {formatInTimezone(item.lastSeenAt, activeFarm.timezone)}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerBlock}>
      {/* Server Status Banner */}
      <ServerStatusBanner />

      {/* Showing Cached Data Banner if from cache */}
      {isFromCache && (
        <View style={styles.cacheBanner}>
          <Database size={13} color={colors.textSecondary} />
          <Text style={styles.cacheBannerText}>Showing saved offline data</Text>
        </View>
      )}

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

      {/* 1. Today's Farm Brief Card (Hidden if AI is disabled) */}
      {aiEnabled && (
        <Card style={styles.aiCard}>
          <View style={styles.aiCardHeader}>
            <View style={styles.aiCardTitleRow}>
              <View style={styles.aiIconBubble}>
                <Sparkles size={16} color={colors.primary} />
              </View>
              <Text style={styles.aiCardTitle}>Today's Farm Brief</Text>
            </View>
            {brief && (
              <View style={[styles.urgencyBadge, { backgroundColor: urgencyBadge.bg }]}>
                <Text style={[styles.urgencyBadgeText, { color: urgencyBadge.color }]}>
                  {urgencyBadge.text}
                </Text>
              </View>
            )}
          </View>

          {brief ? (
            <View style={styles.briefContent}>
              <Text style={styles.briefHeadline}>{brief.headline}</Text>
              <Text style={styles.briefBody} numberOfLines={2}>
                {brief.body}
              </Text>
              {brief.actionNow && brief.actionNow !== 'null' && (
                <View style={styles.briefActionRow}>
                  <CheckCircle2 size={14} color={colors.primary} />
                  <Text style={styles.briefActionText} numberOfLines={1}>
                    {brief.actionNow}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.briefSkeleton}>
              <Text style={styles.briefSkeletonTitle}>Brief arrives at 6 AM</Text>
              <Text style={styles.briefSkeletonSub}>
                Daily AI agronomy brief is generated each morning and evening.
              </Text>
            </View>
          )}
        </Card>
      )}

      {/* 2. Farm Health Gauge Card */}
      <Card style={styles.aiCard}>
        <View style={styles.aiCardHeader}>
          <View style={styles.aiCardTitleRow}>
            <View style={[styles.aiIconBubble, { backgroundColor: healthBg }]}>
              <Activity size={16} color={healthColor} />
            </View>
            <Text style={styles.aiCardTitle}>Farm Health</Text>
          </View>
          <View style={[styles.urgencyBadge, { backgroundColor: healthBg }]}>
            <Text style={[styles.urgencyBadgeText, { color: healthColor }]}>
              {health ? `${health.score}/100` : 'Calculating...'}
            </Text>
          </View>
        </View>

        <View style={styles.healthRow}>
          <View style={[styles.healthRing, { borderColor: healthColor }]}>
            <Text style={[styles.healthScoreText, { color: healthColor }]}>
              {health?.score ?? '--'}
            </Text>
          </View>
          <View style={styles.healthDetails}>
            <Text style={styles.healthStatusTitle}>
              {health
                ? health.score >= 80
                  ? 'Optimal Crop Condition'
                  : health.score >= 60
                  ? 'Moderate Condition'
                  : 'Attention Required'
                : 'Evaluating metrics...'}
            </Text>
            {health && health.reasons.length > 0 ? (
              <View style={styles.reasonsWrap}>
                {health.reasons.map((reason, idx) => (
                  <View key={idx} style={styles.reasonChip}>
                    <Text style={styles.reasonChipText}>{reason}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.healthSubtext}>All sensor nodes and parameters are within normal ranges.</Text>
            )}
          </View>
        </View>
      </Card>

      {/* 2.5 Irrigation Forecast Card */}
      {Boolean(irrigation) && (
        <Card style={[styles.aiCard, { borderColor: irrigationTheme.border, borderWidth: 1 }]}>
          <View style={styles.aiCardHeader}>
            <View style={styles.aiCardTitleRow}>
              <View style={[styles.aiIconBubble, { backgroundColor: irrigationTheme.bg }]}>
                <Droplets size={16} color={irrigationTheme.color} />
              </View>
              <Text style={styles.aiCardTitle}>Irrigation Forecast</Text>
            </View>
            <View style={[styles.urgencyBadge, { backgroundColor: irrigationTheme.bg }]}>
              <Text style={[styles.urgencyBadgeText, { color: irrigationTheme.color }]}>
                {irrigationTheme.label}
              </Text>
            </View>
          </View>

          <Text style={styles.irrigationMessage}>{irrigation!.message}</Text>

          <View style={styles.irrigationTrajectoryRow}>
            <View style={styles.trajectoryStep}>
              <Text style={styles.trajectoryLabel}>Current</Text>
              <Text style={[styles.trajectoryValue, { color: colors.text }]}>
                {irrigation!.currentSoil}%
              </Text>
            </View>
            <Text style={styles.trajectoryArrow}>→</Text>
            <View style={styles.trajectoryStep}>
              <Text style={styles.trajectoryLabel}>In 1h</Text>
              <Text
                style={[
                  styles.trajectoryValue,
                  { color: irrigation!.predicted1h < 20 ? '#DC2626' : colors.text },
                ]}
              >
                {irrigation!.predicted1h}%
              </Text>
            </View>
            <Text style={styles.trajectoryArrow}>→</Text>
            <View style={styles.trajectoryStep}>
              <Text style={styles.trajectoryLabel}>In 3h</Text>
              <Text
                style={[
                  styles.trajectoryValue,
                  { color: irrigation!.predicted3h < 25 ? '#D97706' : colors.text },
                ]}
              >
                {irrigation!.predicted3h}%
              </Text>
            </View>
            <Text style={styles.trajectoryArrow}>→</Text>
            <View style={styles.trajectoryStep}>
              <Text style={styles.trajectoryLabel}>In 6h</Text>
              <Text style={[styles.trajectoryValue, { color: colors.textSecondary }]}>
                {irrigation!.predicted6h}%
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* 3. Weather Card */}
      <Card style={styles.aiCard}>
        <View style={styles.aiCardHeader}>
          <View style={styles.aiCardTitleRow}>
            <View style={[styles.aiIconBubble, { backgroundColor: '#E0F2FE' }]}>
              <CloudRain size={16} color="#0284C7" />
            </View>
            <Text style={styles.aiCardTitle}>Weather Forecast</Text>
          </View>
          {!isWeatherStaleOrMissing && (
            <Badge label="Open-Meteo" variant="neutral" />
          )}
        </View>

        {isWeatherStaleOrMissing ? (
          <View style={styles.weatherUnavailableBlock}>
            <Text style={styles.weatherUnavailableText}>Forecast unavailable</Text>
          </View>
        ) : (
          <View style={styles.weatherMetricsRow}>
            <View style={styles.weatherMetric}>
              <Text style={styles.weatherMetricLabel}>Rain Next 6h</Text>
              <Text style={styles.weatherMetricValue}>
                {weather?.rainNext6hMm ?? 0} mm
              </Text>
            </View>
            <View style={styles.weatherDivider} />
            <View style={styles.weatherMetric}>
              <Text style={styles.weatherMetricLabel}>Rain Next 24h</Text>
              <Text style={styles.weatherMetricValue}>
                {weather?.rainNext24hMm ?? 0} mm
              </Text>
            </View>
            <View style={styles.weatherDivider} />
            <View style={styles.weatherMetric}>
              <Text style={styles.weatherMetricLabel}>Max Temp Today</Text>
              <Text style={styles.weatherMetricValue}>
                {weather?.dailySummary?.[0]?.tempMax ?? '--'}°C
              </Text>
            </View>
          </View>
        )}
      </Card>

      {/* Live Telemetry Status Bar */}
      <View style={styles.telemetryStatusRow}>
        <View style={styles.telemetryTimeBlock}>
          <Activity size={14} color={freshness.isLive ? colors.online : colors.warning} />
          <Text style={styles.telemetryTimeText}>{freshness.label}</Text>
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

      {/* Staleness Note for Sensor Summary */}
      {stalenessNote && (
        <View style={styles.stalenessContainer}>
          <Text style={styles.stalenessText}>{stalenessNote}</Text>
        </View>
      )}

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

  const initialLoading = devicesLoading && heatmapLoading && devices.length === 0;
  const hasError = devicesErr && devices.length === 0;

  return (
    <View style={styles.container}>
      {initialLoading ? (
        <LoadingView label="Loading farm telemetry..." />
      ) : hasError ? (
        <ErrorView
          title="Could Not Load Dashboard"
          message={devicesErr?.message || heatmapErr?.message || 'Failed to fetch farm data.'}
          onRetry={handleRefresh}
          retrying={false}
        />
      ) : (
        <FlatList
          data={devices}
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
    marginBottom: 8,
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
  stalenessContainer: {
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  stalenessText: {
    fontSize: 11,
    color: colors.warning,
    fontStyle: 'italic',
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
  aiCard: {
    padding: 16,
    marginBottom: 12,
  },
  aiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiIconBubble: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  urgencyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  briefContent: {
    gap: 6,
  },
  briefHeadline: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 20,
  },
  briefBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  briefActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    backgroundColor: colors.primarySurface,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  briefActionText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    flex: 1,
  },
  briefSkeleton: {
    paddingVertical: 8,
  },
  briefSkeletonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  briefSkeletonSub: {
    fontSize: 12,
    color: colors.textMuted,
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  healthRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthScoreText: {
    fontSize: 24,
    fontWeight: '800',
  },
  healthDetails: {
    flex: 1,
    gap: 4,
  },
  healthStatusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  healthSubtext: {
    fontSize: 12,
    color: colors.textMuted,
  },
  reasonsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  reasonChip: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reasonChipText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  irrigationMessage: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
    marginBottom: 10,
  },
  irrigationTrajectoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  trajectoryStep: {
    alignItems: 'center',
  },
  trajectoryLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  trajectoryValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  trajectoryArrow: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '700',
  },
  weatherUnavailableBlock: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  weatherUnavailableText: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  weatherMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  weatherMetric: {
    alignItems: 'center',
    flex: 1,
  },
  weatherMetricLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
  },
  weatherMetricValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  weatherDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.borderLight,
  },
});
