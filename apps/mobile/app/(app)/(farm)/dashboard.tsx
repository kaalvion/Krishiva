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
  Clock,
  Layers,
  Database,
  Wifi,
} from 'lucide-react-native';
import { useActiveFarm } from '../../../src/context/FarmContext';
import { ServerStatusBanner, useServerStatus } from '../../../src/context/ServerStatusContext';
import { useLanguage } from '../../../src/context/LanguageContext';
import { useTranslatedData } from '../../../src/hooks/useTranslatedData';
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
  formatInTimezone,
} from '../../../src/utils/freshness';
import { Card } from '../../../src/components/Card';
import { Badge } from '../../../src/components/Badge';
import { ErrorView } from '../../../src/components/ErrorView';
import { LoadingView } from '../../../src/components/LoadingView';
import { EmptyState } from '../../../src/components/EmptyState';
import { AlertBanner } from '../../../src/components/AlertBanner';
import { colors } from '../../../src/theme/colors';
import type { Device } from '../../../src/types';

// Modular Dashboard Components
import {
  HeaderBlock,
  StatusStrip,
  AiBriefCard,
  HealthGaugeCard,
  WeatherCard,
  FieldHeatmapCard,
  PlotsCarousel,
  QuickControlsCard,
  TodayScheduleCard,
} from '../../../src/components/dashboard';

export default function DashboardScreen() {
  const router = useRouter();
  const { activeFarm } = useActiveFarm();
  const { aiEnabled } = useServerStatus();
  const { t } = useLanguage();

  // Live Firestore hooks (preserved completely)
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

  // Dynamic remote data translation (Tier 2 & 3)
  const translatedDevices = useTranslatedData(devices);
  const translatedBrief = useTranslatedData(brief);

  const isFromCache = devicesFromCache || heatmapFromCache;
  const isRefreshing = false; // Firestore onSnapshot pushes live updates automatically

  const handleRefresh = useCallback(async () => {
    refreshDevices();
  }, [refreshDevices]);

  if (!activeFarm) {
    return (
      <View style={styles.noFarmContainer}>
        <EmptyState
          icon={<Layers size={32} color={colors.primaryDark} />}
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

  // Find latest recorded timestamp for freshness
  const latestRecordedTimestamps = cells
    .map((c) => c.recordedAt)
    .filter((t): t is string => Boolean(t))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  const latestRecordedAt = latestRecordedTimestamps[0] || null;
  const freshness = getReadingFreshness(latestRecordedAt);

  // Sensor averages
  const cellsWithHumidity = cells.filter((c) => c.humidity !== null && c.humidity !== undefined);
  const avgHumidity =
    cellsWithHumidity.length > 0
      ? Math.round(
          cellsWithHumidity.reduce((acc, c) => acc + (c.humidity ?? 0), 0) /
            cellsWithHumidity.length
        )
      : null;

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
              <Cpu size={20} color={isOnline ? colors.primaryDark : colors.textSecondary} />
            </View>
            <View style={styles.deviceNameBlock}>
              <Text style={styles.deviceName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.nodeIdText}>
                Node #{item.nodeId} • {item.type.replace('_', ' ')}
              </Text>
            </View>
          </View>
          <Badge
            label={effectiveStatus === 'never_reported' ? 'Never Seen' : effectiveStatus}
            variant={isOnline ? 'success' : effectiveStatus === 'never_reported' ? 'neutral' : 'warning'}
          />
        </View>

        <View style={styles.deviceDivider} />

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
              {formatInTimezone(item.lastSeenAt, activeFarm.timezone)}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerBlock}>
      {/* 1. Header Block (Greeting & Language Switcher) */}
      <HeaderBlock farmName={activeFarm.name} />

      {/* Offline Status & Active Alert Banners */}
      <ServerStatusBanner />
      <AlertBanner farmId={activeFarm.id} />

      {isFromCache && (
        <View style={styles.cacheBanner}>
          <Database size={13} color={colors.textSecondary} />
          <Text style={styles.cacheBannerText}>{t('common.showing_offline')}</Text>
        </View>
      )}

      {/* 2. Status Strip (GSM Master status & Sync) */}
      <StatusStrip
        masterStatus={onlineCount > 0 ? 'GSM Master: Online' : 'GSM Master: Connecting'}
        syncedLabel={freshness.label}
        isOnline={freshness.isLive}
      />

      {/* 3. Hero Farm Map Overview Card + Grok AI Brief */}
      <AiBriefCard
        brief={brief}
        translatedBrief={translatedBrief}
        aiEnabled={aiEnabled}
        plotName="Plot 4B"
        hectares="18.2 ha"
      />

      {/* 4. Agricultural Plots Horizontal Carousel */}
      <PlotsCarousel />

      {/* 5. Quick Controls 2x2 Grid */}
      <QuickControlsCard />

      {/* 6. Weather Strip (Compact mini-metrics) */}
      <WeatherCard
        weather={weather}
        avgHumidity={avgHumidity}
        farmName={activeFarm.name}
        plotName="Plot 4B"
      />

      {/* 7. Today's Schedule Card */}
      <TodayScheduleCard />

      {/* 8. Health Gauge Card */}
      <HealthGaugeCard
        health={health}
        loading={healthLoading}
      />

      {/* 9. Field Heatmap Card */}
      <FieldHeatmapCard cells={cells} />

      {/* 10. Devices Section Title */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Wifi size={18} color={colors.primaryDark} />
          <Text style={styles.sectionTitle}>{t('dashboard.devices_sensors')}</Text>
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
          data={translatedDevices}
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
              icon={<Cpu size={32} color={colors.primaryDark} />}
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
    paddingBottom: 36,
  },
  headerBlock: {
    marginBottom: 8,
  },
  cacheBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 99,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cacheBannerText: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    color: colors.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Manrope_700Bold',
    color: colors.primaryDark,
  },
  deviceCountText: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    color: colors.textSecondary,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  deviceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 2,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceIconOnline: {
    backgroundColor: colors.primary,
  },
  deviceIconOffline: {
    backgroundColor: colors.surfaceContainer,
  },
  deviceNameBlock: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontFamily: 'Manrope_700Bold',
    color: colors.text,
  },
  nodeIdText: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    color: colors.textSecondary,
    marginTop: 2,
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
  },
  capabilitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  capChip: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  capChipText: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    color: colors.textSecondary,
  },
  lastSeenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lastSeenText: {
    fontSize: 11,
    fontFamily: 'Manrope_400Regular',
    color: colors.textMuted,
  },
});
