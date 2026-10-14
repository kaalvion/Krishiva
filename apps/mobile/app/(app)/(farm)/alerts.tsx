import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCheck,
  Check,
  Clock,
  Cpu,
  Layers,
} from 'lucide-react-native';
import { useActiveFarm } from '../../../src/context/FarmContext';
import {
  useAlerts,
  useAcknowledgeAlert,
  useAcknowledgeAll,
} from '../../../src/hooks/useAlerts';
import { useIsScreenFocused } from '../../../src/hooks/useIsScreenFocused';
import { Card } from '../../../src/components/Card';
import { Badge } from '../../../src/components/Badge';
import { EmptyState } from '../../../src/components/EmptyState';
import { ErrorView } from '../../../src/components/ErrorView';
import { LoadingView } from '../../../src/components/LoadingView';
import { colors } from '../../../src/theme/colors';
import type { AlertItem, AlertSeverity } from '../../../src/types';

export default function AlertsScreen() {
  const { activeFarm } = useActiveFarm();
  const isScreenFocused = useIsScreenFocused();
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  const isOwnerOrAdmin = activeFarm?.role === 'owner' || activeFarm?.role === 'admin';

  // Fetch alerts based on active tab
  const isAcknowledged = activeTab === 'history';
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useAlerts(activeFarm?.id, isAcknowledged, {
    refetchInterval: isScreenFocused && !isAcknowledged ? 30000 : false,
  });

  const acknowledgeAlertMutation = useAcknowledgeAlert(activeFarm?.id);
  const acknowledgeAllMutation = useAcknowledgeAll(activeFarm?.id);

  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const handleAcknowledgeSingle = async (alertId: string) => {
    try {
      setAcknowledgingId(alertId);
      await acknowledgeAlertMutation.mutateAsync(alertId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not acknowledge alert';
      Alert.alert('Error', msg);
    } finally {
      setAcknowledgingId(null);
    }
  };

  const handleAcknowledgeAll = () => {
    Alert.alert(
      'Acknowledge All Alerts',
      'Are you sure you want to mark all active alerts as acknowledged for this farm?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Acknowledge All',
          style: 'default',
          onPress: async () => {
            try {
              const res = await acknowledgeAllMutation.mutateAsync();
              Alert.alert('Done', `Acknowledged ${res.count} alert${res.count === 1 ? '' : 's'}.`);
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Could not acknowledge alerts';
              Alert.alert('Error', msg);
            }
          },
        },
      ]
    );
  };

  const alerts = data?.alerts ?? [];
  const unacknowledgedCount = data?.unacknowledgedCount ?? 0;

  const getAlertTitle = (type: string): string => {
    switch (type) {
      case 'SOIL_MOISTURE_CRITICAL':
        return 'Critically dry soil';
      case 'SOIL_MOISTURE_LOW':
        return 'Low soil moisture';
      case 'TEMPERATURE_HIGH':
        return 'High temperature';
      case 'HUMIDITY_HIGH':
        return 'High humidity';
      case 'DEVICE_OFFLINE':
        return 'Device offline';
      default:
        return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    }
  };

  const getSeverityStyle = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return {
          textColor: colors.error,
          surfaceColor: colors.errorSurface,
          borderColor: '#FFCDD2',
          icon: <AlertTriangle size={20} color={colors.error} />,
          badgeVariant: 'neutral' as const,
        };
      case 'warning':
        return {
          textColor: colors.warning,
          surfaceColor: '#FFF3E0',
          borderColor: '#FFE0B2',
          icon: <AlertCircle size={20} color={colors.warning} />,
          badgeVariant: 'warning' as const,
        };
      case 'info':
      default:
        return {
          textColor: '#1976D2',
          surfaceColor: '#E3F2FD',
          borderColor: '#BBDEFB',
          icon: <Info size={20} color="#1976D2" />,
          badgeVariant: 'neutral' as const,
        };
    }
  };

  const formatRelativeTime = (timestamp: string): string => {
    try {
      const now = Date.now();
      const past = new Date(timestamp).getTime();
      const diffSec = Math.floor((now - past) / 1000);

      if (isNaN(diffSec) || diffSec < 0) return 'Just now';
      if (diffSec < 60) return `${diffSec}s ago`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour}h ago`;
      const diffDays = Math.floor(diffHour / 24);
      if (diffDays < 7) return `${diffDays}d ago`;

      const d = new Date(timestamp);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return timestamp;
    }
  };

  const renderAlertCard = ({ item }: { item: AlertItem }) => {
    const sev = getSeverityStyle(item.severity);
    const isAcking = acknowledgingId === item.id;

    return (
      <Card
        style={[
          styles.alertCard,
          { borderLeftColor: sev.textColor, borderLeftWidth: 4 },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconBox, { backgroundColor: sev.surfaceColor }]}>
              {sev.icon}
            </View>
            <View style={styles.titleColumn}>
              <Text style={styles.alertTitle} numberOfLines={1}>
                {getAlertTitle(item.type)}
              </Text>
              <View style={styles.deviceRow}>
                <Cpu size={12} color={colors.textMuted} />
                <Text style={styles.deviceText} numberOfLines={1}>
                  {item.deviceName || `Device ${item.deviceId.slice(0, 8)}`}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.badgeColumn}>
            <View
              style={[
                styles.severityPill,
                { backgroundColor: sev.surfaceColor, borderColor: sev.borderColor },
              ]}
            >
              <Text style={[styles.severityPillText, { color: sev.textColor }]}>
                {item.severity.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.messageText}>{item.message}</Text>

        <View style={styles.cardFooter}>
          <View style={styles.timeRow}>
            <Clock size={12} color={colors.textMuted} />
            <Text style={styles.timeText}>{formatRelativeTime(item.createdAt)}</Text>
          </View>

          {/* Action button: only for owners/admins on unacknowledged alerts */}
          {!item.acknowledged && isOwnerOrAdmin && (
            <TouchableOpacity
              style={styles.ackButton}
              onPress={() => handleAcknowledgeSingle(item.id)}
              disabled={isAcking}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Acknowledge alert"
            >
              {isAcking ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Check size={14} color={colors.primary} />
                  <Text style={styles.ackButtonText}>Acknowledge</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {item.acknowledged && (
            <View style={styles.resolvedRow}>
              <CheckCheck size={14} color={colors.success} />
              <Text style={styles.resolvedText}>
                {item.acknowledgedAt
                  ? `Acknowledged ${formatRelativeTime(item.acknowledgedAt)}`
                  : 'Acknowledged'}
              </Text>
            </View>
          )}
        </View>
      </Card>
    );
  };

  if (!activeFarm) {
    return (
      <View style={styles.noFarmContainer}>
        <EmptyState
          icon={<Layers size={32} color={colors.primary} />}
          title="No Farm Selected"
          description="Please select a farm to view alerts."
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Segmented Control */}
      <View style={styles.segmentContainer}>
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              activeTab === 'active' && styles.segmentButtonActive,
            ]}
            onPress={() => setActiveTab('active')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === 'active' && styles.segmentTextActive,
              ]}
            >
              Active {unacknowledgedCount > 0 ? `(${unacknowledgedCount})` : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentButton,
              activeTab === 'history' && styles.segmentButtonActive,
            ]}
            onPress={() => setActiveTab('history')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === 'history' && styles.segmentTextActive,
              ]}
            >
              History
            </Text>
          </TouchableOpacity>
        </View>

        {/* Top Action: Acknowledge All for owners/admins when active alerts exist */}
        {activeTab === 'active' && isOwnerOrAdmin && alerts.length > 0 && (
          <TouchableOpacity
            style={styles.ackAllButton}
            onPress={handleAcknowledgeAll}
            disabled={acknowledgeAllMutation.isPending}
            activeOpacity={0.7}
          >
            {acknowledgeAllMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <CheckCheck size={16} color={colors.primary} />
                <Text style={styles.ackAllButtonText}>Acknowledge all</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Main Content */}
      {isLoading ? (
        <LoadingView label="Loading alerts..." />
      ) : isError ? (
        <ErrorView
          message={error instanceof Error ? error.message : 'Failed to load alerts'}
          onRetry={refetch}
        />
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          renderItem={renderAlertCard}
          contentContainerStyle={[
            styles.listContent,
            alerts.length === 0 && styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={
                activeTab === 'active' ? (
                  <CheckCheck size={36} color={colors.primary} />
                ) : (
                  <Clock size={36} color={colors.textMuted} />
                )
              }
              title={
                activeTab === 'active'
                  ? 'No active alerts'
                  : 'No alert history'
              }
              description={
                activeTab === 'active'
                  ? 'All good! Sensors and devices are reporting within normal ranges.'
                  : 'Acknowledged and resolved alerts will appear here.'
              }
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
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  segmentContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#EEF2EE',
    borderRadius: 8,
    padding: 3,
  },
  segmentButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  segmentButtonActive: {
    backgroundColor: colors.card,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  ackAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.primarySurface,
  },
  ackAllButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  alertCard: {
    padding: 14,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  titleColumn: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deviceText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  badgeColumn: {
    alignItems: 'flex-end',
  },
  severityPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  severityPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  messageText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 10,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  ackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: colors.primarySurface,
  },
  ackButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  resolvedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resolvedText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '600',
  },
});
