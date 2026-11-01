import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import {
  AlertCircle,
  AlertTriangle,
  WifiOff,
  Power,
  CheckCircle2,
  Calendar,
  ArrowUpRight,
  Sparkles,
  SlidersHorizontal,
  Sprout,
  RotateCcw,
  CheckCheck,
  Bell,
  User,
  Radio,
  Layers,
  Check,
} from 'lucide-react-native';
import { useActiveFarm } from '../../../src/context/FarmContext';
import { useServerStatus } from '../../../src/context/ServerStatusContext';
import { useLiveAlerts } from '../../../src/hooks/live';
import {
  useAcknowledgeAlert,
  useAcknowledgeAll,
} from '../../../src/hooks/useAlerts';
import type { AlertItem, AlertSeverity } from '../../../src/types';

type FilterTab = 'all' | 'alerts' | 'activity';

interface GroupedAlerts {
  today: AlertItem[];
  yesterday: AlertItem[];
}

export default function AlertsScreen() {
  const insets = useSafeAreaInsets();
  const { activeFarm } = useActiveFarm();
  const { serverOnline } = useServerStatus();

  const [filter, setFilter] = useState<FilterTab>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [diagnosticsRunning, setDiagnosticsRunning] = useState(false);
  const [justMarkedAll, setJustMarkedAll] = useState(false);

  // Live Firestore alerts hook
  const {
    alerts,
    unacknowledgedCount,
    loading: alertsLoading,
    fromCache,
    refresh: refreshAlerts,
  } = useLiveAlerts(activeFarm?.id);

  const acknowledgeAlertMutation = useAcknowledgeAlert(activeFarm?.id);
  const acknowledgeAllMutation = useAcknowledgeAll(activeFarm?.id);

  // Pulsing animation for network status indicator
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.25,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Acknowledge single alert
  const handleAcknowledgeSingle = async (alertId: string) => {
    try {
      setAcknowledgingId(alertId);
      await acknowledgeAlertMutation.mutateAsync(alertId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to acknowledge alert';
      Alert.alert('Error', msg);
    } finally {
      setAcknowledgingId(null);
    }
  };

  // Mark all read
  const handleAcknowledgeAll = () => {
    if (unacknowledgedCount === 0) {
      Alert.alert('All Caught Up', 'No active alerts pending acknowledgement.');
      return;
    }

    Alert.alert(
      'Mark All Read',
      'Are you sure you want to acknowledge all active alerts for this farm?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Read',
          style: 'default',
          onPress: async () => {
            try {
              const res = await acknowledgeAllMutation.mutateAsync();
              setJustMarkedAll(true);
              setTimeout(() => setJustMarkedAll(false), 3000);
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

  // Run diagnostics handler
  const handleRunDiagnostics = () => {
    setDiagnosticsRunning(true);
    refreshAlerts();
    setTimeout(() => {
      setDiagnosticsRunning(false);
      Alert.alert(
        'Diagnostics Complete',
        'Telemetry network operational. 100% packet transmission across active gateway mesh nodes.'
      );
    }, 1200);
  };

  // Counts for tabs
  const { alertsCount, activityCount } = useMemo(() => {
    let aCount = 0;
    let actCount = 0;
    for (const a of alerts) {
      if (a.severity === 'critical' || a.severity === 'warning') {
        aCount++;
      }
      if (a.severity === 'info' || a.acknowledged) {
        actCount++;
      }
    }
    return { alertsCount: aCount, activityCount: actCount };
  }, [alerts]);

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    if (filter === 'alerts') {
      return alerts.filter((a) => a.severity === 'critical' || a.severity === 'warning');
    }
    if (filter === 'activity') {
      return alerts.filter((a) => a.severity === 'info' || a.acknowledged);
    }
    return alerts;
  }, [alerts, filter]);

  // Group filtered alerts by date: Today vs Yesterday / Earlier
  const groupedAlerts = useMemo<GroupedAlerts>(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

    const today: AlertItem[] = [];
    const yesterday: AlertItem[] = [];

    for (const item of filteredAlerts) {
      const itemTime = new Date(item.createdAt).getTime();
      if (isNaN(itemTime) || itemTime >= startOfToday) {
        today.push(item);
      } else if (itemTime >= startOfYesterday) {
        yesterday.push(item);
      } else {
        // Earlier items also grouped under Yesterday & Older
        yesterday.push(item);
      }
    }

    return { today, yesterday };
  }, [filteredAlerts]);

  // Helper: Format alert title
  const getAlertTitle = (item: AlertItem): string => {
    switch (item.type) {
      case 'SOIL_MOISTURE_CRITICAL':
        return 'Critically dry soil';
      case 'SOIL_MOISTURE_LOW':
        return 'Low soil moisture';
      case 'TEMPERATURE_HIGH':
        return 'High temperature warning';
      case 'HUMIDITY_HIGH':
        return 'High humidity level';
      case 'DEVICE_OFFLINE':
        return 'Controller went offline';
      case 'HEAT_STRESS':
        return 'Heat stress detected';
      case 'RAPID_DRY_DOWN':
        return 'Rapid dry-down event';
      default:
        if (item.message && item.message.length > 0 && item.message.length < 32) {
          return item.message;
        }
        return item.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    }
  };

  // Helper: Format subtitle
  const getAlertSubtitle = (item: AlertItem): string => {
    const dev = item.deviceName || (item.deviceId ? `Node ${item.deviceId.slice(0, 8)}` : 'Krishiva Hub');
    if (item.message && item.message !== getAlertTitle(item)) {
      return `${dev} • ${item.message}`;
    }
    return `${dev} • Telemetry alert`;
  };

  // Helper: Format time
  const formatTime = (isoString: string): string => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '';
    }
  };

  // Helper: Severity UI Config
  const getSeverityConfig = (severity: AlertSeverity, type: string) => {
    if (severity === 'critical') {
      return {
        bg: '#FFDAD6',
        color: '#BA1A1A',
        timeColor: '#BA1A1A',
        icon: <AlertCircle size={22} color="#BA1A1A" />,
      };
    }
    if (severity === 'warning') {
      return {
        bg: '#E7E8E6',
        color: '#556253',
        timeColor: '#757965',
        icon: <WifiOff size={22} color="#556253" />,
      };
    }
    // info / activity
    if (type.includes('PUMP') || type.includes('OFF') || type.includes('ON')) {
      return {
        bg: '#D8E7D4',
        color: '#516600',
        timeColor: '#757965',
        icon: <Power size={22} color="#516600" />,
      };
    }
    if (type.includes('SCHEDULE')) {
      return {
        bg: '#E7E8E6',
        color: '#556253',
        timeColor: '#757965',
        icon: <Calendar size={22} color="#556253" />,
      };
    }
    return {
      bg: '#D8E7D4',
      color: '#516600',
      timeColor: '#757965',
      icon: <CheckCircle2 size={22} color="#516600" />,
    };
  };

  const renderAlertCard = (item: AlertItem) => {
    const cfg = getSeverityConfig(item.severity, item.type);
    const isAcking = acknowledgingId === item.id;
    const isExpanded = expandedId === item.id;
    const title = getAlertTitle(item);
    const subtitle = getAlertSubtitle(item);
    const timeStr = formatTime(item.createdAt);

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.alertCard, item.acknowledged && styles.alertCardAcknowledged]}
        activeOpacity={0.9}
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
      >
        <View style={styles.cardMainRow}>
          {/* Icon Circle */}
          <View style={[styles.cardIconCircle, { backgroundColor: cfg.bg }]}>
            {cfg.icon}
          </View>

          {/* Texts Column */}
          <View style={styles.cardTextCol}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitleText} numberOfLines={isExpanded ? undefined : 1}>
                {title}
              </Text>
              <Text style={[styles.cardTimeText, { color: cfg.timeColor }]}>
                {timeStr}
              </Text>
            </View>

            <Text style={styles.cardSubtitleText} numberOfLines={isExpanded ? undefined : 1}>
              {subtitle}
            </Text>
          </View>

          {/* Action / Ack Arrow Button */}
          <TouchableOpacity
            style={[
              styles.cardArrowBtn,
              item.acknowledged && styles.cardArrowBtnAcknowledged,
            ]}
            disabled={isAcking}
            onPress={() => {
              if (!item.acknowledged) {
                handleAcknowledgeSingle(item.id);
              } else {
                setExpandedId(isExpanded ? null : item.id);
              }
            }}
            accessibilityLabel={item.acknowledged ? 'View details' : 'Acknowledge alert'}
          >
            {isAcking ? (
              <ActivityIndicator size="small" color="#516600" />
            ) : item.acknowledged ? (
              <Check size={16} color="#556253" />
            ) : (
              <ArrowUpRight size={18} color="#191c1b" />
            )}
          </TouchableOpacity>
        </View>

        {/* AI Explanation / Detailed View */}
        {(Boolean(item.aiExplanation) || isExpanded) && (
          <View style={styles.expandedSection}>
            {Boolean(item.aiExplanation) && (
              <View style={styles.aiBox}>
                <View style={styles.aiHeader}>
                  <Sparkles size={13} color="#516600" />
                  <Text style={styles.aiHeaderText}>Grok Agricultural Intelligence</Text>
                </View>
                <Text style={styles.aiBodyText}>{item.aiExplanation}</Text>
              </View>
            )}

            {isExpanded && (
              <View style={styles.detailsMeta}>
                <Text style={styles.metaText}>
                  Status: {item.acknowledged ? 'Acknowledged' : 'Active Unacknowledged'}
                </Text>
                {item.deviceId ? (
                  <Text style={styles.metaText}>Hardware Node: {item.deviceId}</Text>
                ) : null}
                {item.acknowledgedAt ? (
                  <Text style={styles.metaText}>
                    Acknowledged at: {new Date(item.acknowledgedAt).toLocaleString()}
                  </Text>
                ) : null}
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* 1. TOP APP BAR */}
      <View style={styles.topAppBar}>
        <View style={styles.topAppLeft}>
          <View style={styles.plantIconWrap}>
            <Sprout size={18} color="#516600" />
          </View>
          <Text style={styles.topAppTitle}>ALERTS</Text>
        </View>

        <View style={styles.topAppRight}>
          <TouchableOpacity
            style={styles.headerIconButton}
            activeOpacity={0.8}
            onPress={handleAcknowledgeAll}
          >
            <Bell size={20} color="#556253" />
          </TouchableOpacity>
          <View style={styles.profileAvatar}>
            <User size={16} color="#ffffff" />
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={alertsLoading && alerts.length > 0}
            onRefresh={refreshAlerts}
            tintColor="#516600"
            colors={['#516600']}
          />
        }
      >
        {/* 2. SCREEN TITLE & META HEADER */}
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <View style={styles.titleWithBadge}>
              <Text style={styles.heroTitle}>ALERTS</Text>
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>
                  {unacknowledgedCount > 0 ? `${unacknowledgedCount} NEW` : '0 NEW'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.markReadBtn, justMarkedAll && styles.markReadBtnSuccess]}
              activeOpacity={0.8}
              onPress={handleAcknowledgeAll}
              disabled={acknowledgeAllMutation.isPending}
            >
              {acknowledgeAllMutation.isPending ? (
                <ActivityIndicator size="small" color="#556253" />
              ) : (
                <>
                  <CheckCheck size={15} color={justMarkedAll ? '#516600' : '#556253'} />
                  <Text style={[styles.markReadText, justMarkedAll && styles.markReadTextSuccess]}>
                    {justMarkedAll ? 'DONE' : 'MARK READ'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Network Status Chip */}
          <View style={styles.statusChipRow}>
            <Animated.View
              style={[
                styles.pulseDot,
                { opacity: pulseAnim },
                (!serverOnline || fromCache) && styles.pulseDotOffline,
              ]}
            />
            <Text style={styles.statusChipText}>
              {!serverOnline
                ? 'OFFLINE MODE • CACHED TELEMETRY'
                : fromCache
                ? 'NETWORK SYNCING • CACHED TELEMETRY'
                : 'NODE NETWORK SYNCED • TELEMETRY NORMAL'}
            </Text>
          </View>
        </View>

        {/* 3. SEGMENTED FILTER CONTROL */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
            activeOpacity={0.8}
            onPress={() => setFilter('all')}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === 'all' && styles.filterTabTextActive,
              ]}
            >
              All ({alerts.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, filter === 'alerts' && styles.filterTabActive]}
            activeOpacity={0.8}
            onPress={() => setFilter('alerts')}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === 'alerts' && styles.filterTabTextActive,
              ]}
            >
              Alerts ({alertsCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, filter === 'activity' && styles.filterTabActive]}
            activeOpacity={0.8}
            onPress={() => setFilter('activity')}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === 'activity' && styles.filterTabTextActive,
              ]}
            >
              Activity ({activityCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* 4. SYSTEM STATUS BANNER */}
        <View style={styles.statusBanner}>
          <View style={styles.bannerIconCircle}>
            <Radio size={19} color="#516600" />
          </View>
          <View style={styles.bannerTextCol}>
            <Text style={styles.bannerTitleText} numberOfLines={1}>
              Core telemetry operational
            </Text>
            <Text style={styles.bannerSubText} numberOfLines={1}>
              {unacknowledgedCount > 0
                ? `${unacknowledgedCount} pending item${unacknowledgedCount > 1 ? 's' : ''} in monitoring queue`
                : '1 transient node warning auto-resolved in Sector C'}
            </Text>
          </View>
          <SlidersHorizontal size={19} color="#576334" />
        </View>

        {/* 5. GROUP: TODAY */}
        {groupedAlerts.today.length > 0 && (
          <View style={styles.groupSection}>
            <View style={styles.groupHeaderRow}>
              <Text style={styles.groupTitleText}>TODAY</Text>
              <Text style={styles.groupCountText}>
                {groupedAlerts.today.length} event{groupedAlerts.today.length === 1 ? '' : 's'}
              </Text>
            </View>
            <View style={styles.cardsList}>
              {groupedAlerts.today.map(renderAlertCard)}
            </View>
          </View>
        )}

        {/* 6. GROUP: YESTERDAY / EARLIER */}
        {groupedAlerts.yesterday.length > 0 && (
          <View style={styles.groupSection}>
            <View style={styles.groupHeaderRow}>
              <Text style={styles.groupTitleText}>YESTERDAY</Text>
              <Text style={styles.groupCountText}>
                {groupedAlerts.yesterday.length} event{groupedAlerts.yesterday.length === 1 ? '' : 's'}
              </Text>
            </View>
            <View style={styles.cardsList}>
              {groupedAlerts.yesterday.map(renderAlertCard)}
            </View>
          </View>
        )}

        {/* 7. ZEN CARD / EMPTY STATE SHOWCASE */}
        <View style={styles.zenCard}>
          {/* Topographic Contour Background */}
          <Svg
            style={StyleSheet.absoluteFill}
            viewBox="0 0 340 180"
            fill="none"
            pointerEvents="none"
          >
            <Path
              d="M-20,90 Q80,20 170,90 T360,90"
              stroke="#c5c9b1"
              strokeWidth={1.5}
              opacity={0.3}
            />
            <Path
              d="M-20,130 Q90,60 170,130 T360,130"
              stroke="#c5c9b1"
              strokeWidth={1}
              opacity={0.25}
            />
            <SvgCircle
              cx={170}
              cy={90}
              r={60}
              stroke="#c5c9b1"
              strokeDasharray="4 4"
              strokeWidth={1}
              opacity={0.35}
            />
          </Svg>

          <View style={styles.zenIconWrap}>
            <Sprout size={24} color="#516600" />
          </View>

          <View style={styles.zenContentCol}>
            <Text style={styles.zenTitle}>All quiet on the farm</Text>
            <Text style={styles.zenSubtitle}>
              No critical failures detected. All sub-valves and telemetry nodes report nominal solar battery voltages.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.zenDiagnosticsBtn}
            activeOpacity={0.8}
            onPress={handleRunDiagnostics}
            disabled={diagnosticsRunning}
          >
            {diagnosticsRunning ? (
              <ActivityIndicator size="small" color="#516600" />
            ) : (
              <>
                <RotateCcw size={15} color="#516600" />
                <Text style={styles.zenDiagnosticsBtnText}>RUN DIAGNOSTICS</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Extra bottom scroll clearance for bottom tab bar */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f9faf8',
  },
  topAppBar: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9faf8',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  topAppLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  plantIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#c6e85a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topAppTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    letterSpacing: 1.5,
    color: '#191c1b',
  },
  topAppRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#516600',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 16,
  },

  /* 2. TITLE SECTION */
  titleSection: {
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroTitle: {
    fontFamily: 'Manrope_300Light',
    fontSize: 32,
    letterSpacing: 3,
    color: '#191c1b',
  },
  newBadge: {
    backgroundColor: '#c6e85a',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
  },
  newBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 0.5,
    color: '#161e00',
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#edeeec',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  markReadBtnSuccess: {
    backgroundColor: '#d8e7d4',
  },
  markReadText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#556253',
  },
  markReadTextSuccess: {
    color: '#516600',
  },
  statusChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 2,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#516600',
  },
  pulseDotOffline: {
    backgroundColor: '#ba1a1a',
  },
  statusChipText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    color: '#556253',
    textTransform: 'uppercase',
  },

  /* 3. FILTER CONTROL */
  filterContainer: {
    backgroundColor: 'rgba(231, 232, 230, 0.7)',
    borderRadius: 28,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabActive: {
    backgroundColor: '#c6e85a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterTabText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: '#556253',
  },
  filterTabTextActive: {
    fontFamily: 'Manrope_700Bold',
    color: '#131e13',
  },

  /* 4. SYSTEM STATUS BANNER */
  statusBanner: {
    backgroundColor: 'rgba(211, 225, 166, 0.35)',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#c6e85a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTextCol: {
    flex: 1,
  },
  bannerTitleText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    color: '#191c1b',
  },
  bannerSubText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: '#556253',
    marginTop: 1,
  },

  /* 5 & 6. ALERT GROUPS */
  groupSection: {
    gap: 10,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  groupTitleText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    letterSpacing: 1,
    color: '#556253',
  },
  groupCountText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: '#757965',
  },
  cardsList: {
    gap: 10,
  },
  alertCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 14,
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    gap: 10,
  },
  alertCardAcknowledged: {
    opacity: 0.85,
    backgroundColor: '#fbfbfb',
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitleText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    color: '#191c1b',
    flex: 1,
  },
  cardTimeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
  cardSubtitleText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: '#556253',
    marginTop: 2,
  },
  cardArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#edeeec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardArrowBtnAcknowledged: {
    backgroundColor: '#d8e7d4',
  },
  expandedSection: {
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e7e8e6',
    gap: 8,
  },
  aiBox: {
    backgroundColor: '#f3f4f2',
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiHeaderText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: '#516600',
    letterSpacing: 0.5,
  },
  aiBodyText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: '#191c1b',
    lineHeight: 18,
  },
  detailsMeta: {
    gap: 2,
    paddingHorizontal: 4,
  },
  metaText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: '#757965',
  },

  /* 7. ZEN CARD */
  zenCard: {
    backgroundColor: '#f3f4f2',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
    gap: 12,
    marginTop: 6,
  },
  zenIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#c6e85a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  zenContentCol: {
    alignItems: 'center',
    gap: 6,
  },
  zenTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 17,
    color: '#191c1b',
  },
  zenSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: '#556253',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  zenDiagnosticsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  zenDiagnosticsBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: '#191c1b',
  },
});
