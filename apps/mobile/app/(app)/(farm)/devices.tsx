import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Radio,
  Cpu,
  Layers,
  Wind,
  ArrowUpRight,
  Wrench,
  Signal,
  Battery,
  Plus,
  ChevronRight,
  RotateCw,
  RotateCcw,
  MapPin,
  Zap,
  Sprout,
  Droplets,
  Sliders,
  Sun,
  Volume2,
} from 'lucide-react-native';
import { useActiveFarm } from '../../../src/context/FarmContext';
import { useLiveDevices } from '../../../src/hooks/live';
import { computeEffectiveStatus } from '../../../src/utils/freshness';
import { LoadingView } from '../../../src/components/LoadingView';
import { ErrorView } from '../../../src/components/ErrorView';
import type { Device } from '../../../src/types';

type FilterType = 'all' | 'online' | 'offline';

export default function DevicesScreen() {
  const router = useRouter();
  const { activeFarm } = useActiveFarm();
  const {
    devices,
    loading,
    error,
    refresh,
  } = useLiveDevices(activeFarm?.id);

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [spinAnim] = useState(new Animated.Value(0));

  // Local actuator toggle states for interactive micro-feedback
  const [actuatorStates, setActuatorStates] = useState<Record<string, boolean>>({
    pump: true,
    valve: false,
    light: false,
    siren: false,
  });

  const toggleActuator = (key: string) => {
    setActuatorStates((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start(() => {
      spinAnim.setValue(0);
      setIsRefreshing(false);
    });
    refresh();
  }, [refresh, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Calculate counts
  const onlineCount = useMemo(() => {
    return devices.filter(
      (d) => computeEffectiveStatus(d.lastSeenAt) === 'online' || d.status === 'online'
    ).length;
  }, [devices]);

  const offlineCount = devices.length - onlineCount;

  // Filtered list
  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      const isOnline =
        computeEffectiveStatus(d.lastSeenAt) === 'online' || d.status === 'online';
      if (activeFilter === 'online') return isOnline;
      if (activeFilter === 'offline') return !isOnline;
      return true;
    });
  }, [devices, activeFilter]);

  const formatMac = (nodeId: number) => {
    const hex = (nodeId * 37 + 160).toString(16).padStart(4, '0').toUpperCase();
    return `MAC: F0:24:F9:0D:${hex.slice(0, 2)}:${hex.slice(2, 4)}`;
  };

  const renderDeviceCard = (item: Device) => {
    const isOnline =
      computeEffectiveStatus(item.lastSeenAt) === 'online' || item.status === 'online';
    const isGateway = item.type === 'gateway' || item.nodeId === 1;
    const isSatellite = item.name.toLowerCase().includes('satellite') || item.name.toLowerCase().includes('ndvi');
    const isWeather = item.name.toLowerCase().includes('weather') || item.capabilities.includes('WEATHER');

    // Color-coded icon box
    const getIconConfig = () => {
      if (isGateway) {
        return {
          bg: 'rgba(211, 225, 166, 0.5)',
          icon: <Radio size={24} color="#516600" />,
        };
      }
      if (isSatellite) {
        return {
          bg: 'rgba(211, 225, 166, 0.4)',
          icon: <Layers size={24} color="#516600" />,
        };
      }
      if (isWeather) {
        return {
          bg: '#f3f4f2',
          icon: <Wind size={24} color="#556253" />,
        };
      }
      return {
        bg: 'rgba(216, 231, 212, 0.5)',
        icon: <Cpu size={24} color="#3d4a3c" />,
      };
    };

    const iconConfig = getIconConfig();
    const hasActuators =
      isGateway ||
      item.type === 'sensor_actuator' ||
      item.capabilities.some((c) => ['PUMP', 'VALVE', 'LIGHT', 'SIREN', 'ACTUATOR'].includes(c.toUpperCase()));

    return (
      <View
        key={item.id}
        style={[styles.deviceCard, !isOnline && styles.deviceCardOffline]}
      >
        {/* Header Row */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.iconBox, { backgroundColor: iconConfig.bg }]}>
              {iconConfig.icon}
            </View>
            <View style={styles.titleColumn}>
              <Text style={styles.deviceName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.deviceMac}>
                {item.location?.zone ? `${item.location.zone} • ` : ''}
                {formatMac(item.nodeId)}
              </Text>
            </View>
          </View>

          {/* Action Button: Forest circle with diagonal arrow or Wrench for offline */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              !isOnline && styles.actionButtonOffline,
            ]}
            onPress={() =>
              Alert.alert(
                item.name,
                `Node ID: #${item.nodeId}\nType: ${item.type}\nStatus: ${isOnline ? 'Online' : 'Offline'}`
              )
            }
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Details for ${item.name}`}
          >
            {isOnline ? (
              <ArrowUpRight size={18} color="#ffffff" />
            ) : (
              <Wrench size={18} color="#556253" />
            )}
          </TouchableOpacity>
        </View>

        {/* Status & Telemetry Row */}
        <View style={styles.telemetryRow}>
          {/* Online/Offline Badge */}
          {isOnline ? (
            <View style={styles.onlineBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.onlineBadgeText}>ONLINE</Text>
            </View>
          ) : (
            <View style={styles.offlineBadge}>
              <Text style={styles.offlineBadgeText}>OFFLINE</Text>
            </View>
          )}

          {/* Signal Pill */}
          <View style={styles.telemetryPill}>
            <Signal size={12} color="#516600" />
            <Text style={styles.telemetryPillText}>
              {isGateway ? '4G LTE • -78 dBm' : 'LoRa 868MHz • 98%'}
            </Text>
          </View>

          {/* Battery Pill */}
          <View style={styles.telemetryPill}>
            <Battery size={13} color="#516600" />
            <Text style={styles.telemetryPillText}>
              {isGateway ? 'Solar • 94% Batt' : '88% Battery'}
            </Text>
          </View>

          {/* Node Tag */}
          <View style={styles.nodeTag}>
            <Text style={styles.nodeTagText}>
              {isGateway ? `NODE #0${item.nodeId} GATEWAY` : `NODE #0${item.nodeId}`}
            </Text>
          </View>
        </View>

        {/* Connected Actuators Tray (if device controls actuators) */}
        {hasActuators && (
          <View style={styles.actuatorsTray}>
            <View style={styles.actuatorsTrayHeader}>
              <Text style={styles.actuatorsTrayTitle}>CONNECTED ACTUATORS (4)</Text>
              <Text style={styles.actuatorsTraySubtitle}>Active Cycle</Text>
            </View>

            <View style={styles.actuatorsGrid}>
              {/* Actuator 1: Borewell Pump */}
              <TouchableOpacity
                style={styles.actuatorToggle}
                onPress={() => toggleActuator('pump')}
                activeOpacity={0.8}
              >
                <View style={styles.actuatorInfo}>
                  <Droplets
                    size={16}
                    color={actuatorStates.pump ? '#516600' : '#556253'}
                  />
                  <Text style={styles.actuatorName} numberOfLines={1}>
                    Pump (Borewell)
                  </Text>
                </View>
                <View
                  style={[
                    styles.statePill,
                    actuatorStates.pump ? styles.statePillOn : styles.statePillOff,
                  ]}
                >
                  <Text
                    style={[
                      styles.statePillText,
                      actuatorStates.pump ? styles.statePillTextOn : styles.statePillTextOff,
                    ]}
                  >
                    {actuatorStates.pump ? 'ON' : 'OFF'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Actuator 2: Drip Valve N. */}
              <TouchableOpacity
                style={styles.actuatorToggle}
                onPress={() => toggleActuator('valve')}
                activeOpacity={0.8}
              >
                <View style={styles.actuatorInfo}>
                  <Sliders
                    size={16}
                    color={actuatorStates.valve ? '#516600' : '#556253'}
                  />
                  <Text style={styles.actuatorName} numberOfLines={1}>
                    Drip Valve N.
                  </Text>
                </View>
                <View
                  style={[
                    styles.statePill,
                    actuatorStates.valve ? styles.statePillOn : styles.statePillOff,
                  ]}
                >
                  <Text
                    style={[
                      styles.statePillText,
                      actuatorStates.valve ? styles.statePillTextOn : styles.statePillTextOff,
                    ]}
                  >
                    {actuatorStates.valve ? 'ON' : 'OFF'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Actuator 3: Perimeter Light */}
              <TouchableOpacity
                style={styles.actuatorToggle}
                onPress={() => toggleActuator('light')}
                activeOpacity={0.8}
              >
                <View style={styles.actuatorInfo}>
                  <Sun
                    size={16}
                    color={actuatorStates.light ? '#516600' : '#556253'}
                  />
                  <Text style={styles.actuatorName} numberOfLines={1}>
                    Perimeter Light
                  </Text>
                </View>
                <View style={[styles.statePill, styles.statePillAuto]}>
                  <Text style={styles.statePillTextAuto}>AUTO</Text>
                </View>
              </TouchableOpacity>

              {/* Actuator 4: Pest Siren */}
              <TouchableOpacity
                style={styles.actuatorToggle}
                onPress={() => toggleActuator('siren')}
                activeOpacity={0.8}
              >
                <View style={styles.actuatorInfo}>
                  <Volume2
                    size={16}
                    color={actuatorStates.siren ? '#516600' : '#556253'}
                  />
                  <Text style={styles.actuatorName} numberOfLines={1}>
                    Pest Siren
                  </Text>
                </View>
                <View style={[styles.statePill, styles.statePillOff]}>
                  <Text style={styles.statePillTextOff}>ARMED</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Connected Sub-Sensors Chips */}
        {!hasActuators && (
          <View style={styles.sensorsChipsRow}>
            {item.capabilities.length > 0 ? (
              item.capabilities.map((cap) => (
                <View key={cap} style={styles.sensorChip}>
                  <Text style={styles.sensorChipText}>
                    {cap.replace(/_/g, ' ')}
                  </Text>
                </View>
              ))
            ) : (
              <>
                <View style={styles.sensorChip}>
                  <Text style={styles.sensorChipText}>
                    Soil Moisture Tensiometer (42%)
                  </Text>
                </View>
                <View style={styles.sensorChip}>
                  <Text style={styles.sensorChipText}>
                    Flow Meter (14.2 L/m)
                  </Text>
                </View>
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#C6E85A']}
            tintColor="#C6E85A"
          />
        }
      >
        {/* Top Context Banner */}
        <View style={styles.headerContextBanner}>
          <View style={styles.bannerLeft}>
            <View style={styles.titleRow}>
              <Text style={styles.screenTitle}>MY DEVICES</Text>
              <View style={styles.liveHubBadge}>
                <Text style={styles.liveHubText}>LIVE HUB</Text>
              </View>
            </View>
            <View style={styles.locationRow}>
              <MapPin size={13} color="#516600" />
              <Text style={styles.locationText}>
                {activeFarm?.name || 'Nashik Greenfield'} • {devices.length} Nodes Linked
              </Text>
            </View>
          </View>

          {/* Sync & Refresh Button */}
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleRefresh}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Sync and Refresh Nodes"
          >
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <RotateCw size={19} color="#191c1b" />
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Segmented Filter Control */}
        <View style={styles.segmentedContainer}>
          <TouchableOpacity
            style={[
              styles.filterTab,
              activeFilter === 'all' && styles.filterTabActive,
            ]}
            onPress={() => setActiveFilter('all')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === 'all' && styles.filterTabTextActive,
              ]}
            >
              All ({devices.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterTab,
              activeFilter === 'online' && styles.filterTabActive,
            ]}
            onPress={() => setActiveFilter('online')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === 'online' && styles.filterTabTextActive,
              ]}
            >
              Online ({onlineCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterTab,
              activeFilter === 'offline' && styles.filterTabActive,
            ]}
            onPress={() => setActiveFilter('offline')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === 'offline' && styles.filterTabTextActive,
              ]}
            >
              Offline ({offlineCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Devices Feed or Loading / Error / Empty States */}
        {loading && devices.length === 0 ? (
          <LoadingView label="Scanning connected nodes..." />
        ) : error && devices.length === 0 ? (
          <ErrorView
            title="Failed to Load Devices"
            message={error.message || 'Unable to communicate with device registry.'}
            onRetry={handleRefresh}
          />
        ) : filteredDevices.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyStateCard}>
            <View style={styles.emptyIconCircle}>
              <Sprout size={36} color="#516600" />
            </View>
            <Text style={styles.emptyTitle}>No Devices in This Filter</Text>
            <Text style={styles.emptySubtitle}>
              All connected telemetry nodes are currently functioning or moved to another paddock.
            </Text>
            <TouchableOpacity
              style={styles.resetFilterButton}
              onPress={() => setActiveFilter('all')}
              activeOpacity={0.8}
            >
              <RotateCcw size={16} color="#161e00" />
              <Text style={styles.resetFilterText}>Reset Filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Device Cards List */
          <View style={styles.devicesFeed}>
            {filteredDevices.map(renderDeviceCard)}
          </View>
        )}

        {/* Add New Device or Node Button */}
        <TouchableOpacity
          style={styles.addDeviceCard}
          onPress={() =>
            Alert.alert(
              'Add New Device',
              'Scan QR code on your IoT sensor node or search nearby Bluetooth & GSM gateway.'
            )
          }
          activeOpacity={0.85}
        >
          <View style={styles.addIconCircle}>
            <Plus size={22} color="#161e00" />
          </View>
          <View style={styles.addTextColumn}>
            <Text style={styles.addTitle}>+ Add New Device or Node</Text>
            <Text style={styles.addSubtitle}>
              Scan QR code or search nearby Bluetooth & GSM
            </Text>
          </View>
          <ChevronRight size={20} color="#556253" />
        </TouchableOpacity>

        {/* Krishiva Precision Mesh Info Card */}
        <View style={styles.meshInfoCard}>
          <View style={styles.meshIconCircle}>
            <Zap size={18} color="#131e13" />
          </View>
          <View style={styles.meshTextColumn}>
            <Text style={styles.meshTitle}>KRISHIVA PRECISION MESH</Text>
            <Text style={styles.meshDescription}>
              Sub-nodes automatically re-route data through LoRa Gateway #01 if satellite coverage drops.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9faf8',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  headerContextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 12,
  },
  bannerLeft: {
    flex: 1,
    marginRight: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  screenTitle: {
    fontSize: 24,
    fontFamily: 'Manrope_300Light',
    color: '#191c1b',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  liveHubBadge: {
    backgroundColor: '#C6E85A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  liveHubText: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    color: '#161e00',
    letterSpacing: 0.8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
  },
  syncButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  segmentedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#edeeec',
    borderRadius: 99,
    padding: 4,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabActive: {
    backgroundColor: '#C6E85A',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  filterTabText: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    color: '#556253',
  },
  filterTabTextActive: {
    color: '#161e00',
    fontFamily: 'Manrope_700Bold',
  },
  devicesFeed: {
    gap: 14,
    marginBottom: 16,
  },
  deviceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 2,
  },
  deviceCardOffline: {
    opacity: 0.92,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleColumn: {
    flex: 1,
    minWidth: 0,
  },
  deviceName: {
    fontSize: 15,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
  },
  deviceMac: {
    fontSize: 11,
    fontFamily: 'Courier',
    color: '#556253',
    marginTop: 2,
  },
  actionButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1E2A1E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonOffline: {
    backgroundColor: '#f3f4f2',
  },
  telemetryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(198, 232, 90, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#516600',
  },
  onlineBadgeText: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    color: '#3c4d00',
    letterSpacing: 0.5,
  },
  offlineBadge: {
    backgroundColor: '#ffdad6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  offlineBadgeText: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    color: '#ba1a1a',
    letterSpacing: 0.5,
  },
  telemetryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3f4f2',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 99,
  },
  telemetryPillText: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: '#454937',
  },
  nodeTag: {
    backgroundColor: 'rgba(216, 231, 212, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  nodeTagText: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    color: '#3d4a3c',
    textTransform: 'uppercase',
  },
  actuatorsTray: {
    backgroundColor: 'rgba(243, 244, 242, 0.7)',
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
  },
  actuatorsTrayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  actuatorsTrayTitle: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    color: '#556253',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  actuatorsTraySubtitle: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    color: '#516600',
  },
  actuatorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actuatorToggle: {
    width: '48.5%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actuatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
    marginRight: 4,
  },
  actuatorName: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: '#191c1b',
  },
  statePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statePillOn: {
    backgroundColor: '#C6E85A',
  },
  statePillOff: {
    backgroundColor: '#e7e8e6',
  },
  statePillAuto: {
    backgroundColor: '#d8e7d4',
  },
  statePillText: {
    fontSize: 9,
    fontFamily: 'Manrope_700Bold',
  },
  statePillTextOn: {
    color: '#526700',
  },
  statePillTextOff: {
    color: '#454937',
  },
  statePillTextAuto: {
    color: '#5b6859',
  },
  sensorsChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  sensorChip: {
    backgroundColor: '#f3f4f2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  sensorChipText: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: '#191c1b',
  },
  emptyStateCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(211, 225, 166, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
    textAlign: 'center',
    maxWidth: 260,
    marginBottom: 16,
    lineHeight: 18,
  },
  resetFilterButton: {
    backgroundColor: '#C6E85A',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 99,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resetFilterText: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    color: '#161e00',
  },
  addDeviceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  addIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#C6E85A',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  addTextColumn: {
    flex: 1,
  },
  addTitle: {
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
  },
  addSubtitle: {
    fontSize: 11,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
    marginTop: 2,
  },
  meshInfoCard: {
    backgroundColor: '#f3f4f2',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  meshIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#d8e7d4',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  meshTextColumn: {
    flex: 1,
  },
  meshTitle: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    color: '#556253',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  meshDescription: {
    fontSize: 11,
    fontFamily: 'Manrope_400Regular',
    color: '#454937',
    marginTop: 2,
    lineHeight: 16,
  },
});
