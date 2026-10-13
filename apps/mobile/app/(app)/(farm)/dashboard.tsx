import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
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
  ArrowLeft,
} from 'lucide-react-native';
import { useActiveFarm } from '../../../src/context/FarmContext';
import { useDevices } from '../../../src/hooks/useDevices';
import { Card } from '../../../src/components/Card';
import { Badge } from '../../../src/components/Badge';
import { ErrorView } from '../../../src/components/ErrorView';
import { LoadingView } from '../../../src/components/LoadingView';
import { EmptyState } from '../../../src/components/EmptyState';
import { Button } from '../../../src/components/Button';
import { colors } from '../../../src/theme/colors';
import type { Device } from '../../../src/types';

export default function DashboardScreen() {
  const router = useRouter();
  const { activeFarm } = useActiveFarm();
  const {
    data: devices,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useDevices(activeFarm?.id);

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

  const onlineCount = devices?.filter((d) => d.status === 'online').length ?? 0;
  const totalCount = devices?.length ?? 0;

  const formatLastSeen = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
        ', ' +
        date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return timestamp;
    }
  };

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

  return (
    <View style={styles.container}>
      {isLoading ? (
        <LoadingView label="Loading devices..." />
      ) : isError ? (
        <ErrorView
          title="Could Not Load Devices"
          message={error?.message || 'Failed to fetch device data from backend.'}
          onRetry={() => refetch()}
          retrying={isRefetching}
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
              refreshing={isRefetching}
              onRefresh={() => refetch()}
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
    marginBottom: 20,
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
