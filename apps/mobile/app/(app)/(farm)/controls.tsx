import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Sliders,
  Power,
  Clock,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Cpu,
  Layers,
  Activity,
  X,
  Droplets,
  Sun,
  BellRing,
} from 'lucide-react-native';
import { useActiveFarm } from '../../../src/context/FarmContext';
import { useDevices } from '../../../src/hooks/useDevices';
import { useFarmCommands } from '../../../src/hooks/useFarmCommands';
import { useCommandStatus, useIssueCommand } from '../../../src/hooks/useCommand';
import { ControlButton } from '../../../src/components/ControlButton';
import { Card } from '../../../src/components/Card';
import { Badge } from '../../../src/components/Badge';
import { EmptyState } from '../../../src/components/EmptyState';
import { ErrorView } from '../../../src/components/ErrorView';
import { LoadingView } from '../../../src/components/LoadingView';
import { colors } from '../../../src/theme/colors';
import type {
  Device,
  ActuatorAction,
  CommandRecord,
  CommandStatus,
} from '../../../src/types';

const ACTUATOR_CAPABILITIES = ['pump', 'valve', 'light', 'siren'] as const;

interface ActiveCommandTracker {
  commandId: string;
  farmId: string;
  deviceId: string;
  action: ActuatorAction;
  deviceName: string;
}

export default function ControlsScreen() {
  const router = useRouter();
  const { activeFarm } = useActiveFarm();

  // Active command in-flight tracking
  const [activeCommand, setActiveCommand] = useState<ActiveCommandTracker | null>(null);

  // Pump ON modal state
  const [pumpModalDevice, setPumpModalDevice] = useState<Device | null>(null);
  const [selectedDurationMins, setSelectedDurationMins] = useState<number>(15);

  // Error alert message state
  const [friendlyErrorMessage, setFriendlyErrorMessage] = useState<string | null>(null);

  // Data fetching
  const {
    data: devices,
    isLoading: devicesLoading,
    isError: devicesError,
    error: devicesErr,
    refetch: refetchDevices,
  } = useDevices(activeFarm?.id);

  const {
    data: recentCommands,
    isLoading: commandsLoading,
    refetch: refetchCommands,
    isRefetching: commandsRefetching,
  } = useFarmCommands(activeFarm?.id, 50);

  // Mutation to issue commands
  const issueCommandMutation = useIssueCommand();

  // Poll status of the currently active command
  const {
    data: currentCommandRecord,
    isTimedOut,
  } = useCommandStatus(
    activeCommand?.commandId,
    activeCommand?.farmId,
    activeCommand?.deviceId,
    {
      maxPollSeconds: 40,
      onSettled: (record) => {
        // Automatically refresh recent commands list once command finishes
        refetchCommands();
      },
    }
  );

  const isViewer = activeFarm?.role === 'viewer';

  // Filter devices that have at least one actuator capability
  const actuatorDevices = useMemo(() => {
    if (!devices) return [];
    return devices.filter((d) =>
      d.capabilities.some((c) =>
        ACTUATOR_CAPABILITIES.includes(c.toLowerCase() as (typeof ACTUATOR_CAPABILITIES)[number])
      )
    );
  }, [devices]);

  // Determine if a command is currently in flight
  const isCommandInFlight = useMemo(() => {
    if (!activeCommand) return false;
    if (isTimedOut) return false;
    const status = currentCommandRecord?.status;
    if (status === 'acknowledged' || status === 'failed' || status === 'expired') {
      return false;
    }
    return true;
  }, [activeCommand, currentCommandRecord, isTimedOut]);

  if (!activeFarm) {
    return (
      <View style={styles.noFarmContainer}>
        <EmptyState
          icon={<Layers size={32} color={colors.primary} />}
          title="No Farm Selected"
          description="Please select a farm from your farms list to control devices."
          actionTitle="Back to Farms"
          onAction={() => router.replace('/(app)/farms')}
        />
      </View>
    );
  }

  const handleRefresh = async () => {
    await Promise.all([refetchDevices(), refetchCommands()]);
  };

  const executeCommand = async (
    device: Device,
    action: ActuatorAction,
    durationSeconds?: number
  ) => {
    if (isViewer) {
      setFriendlyErrorMessage('Only owners and admins can control devices.');
      return;
    }

    setFriendlyErrorMessage(null);

    try {
      const res = await issueCommandMutation.mutateAsync({
        farmId: activeFarm.id,
        deviceId: device.id,
        action,
        durationSeconds,
      });

      setActiveCommand({
        commandId: res.commandId,
        farmId: activeFarm.id,
        deviceId: device.id,
        action,
        deviceName: device.name,
      });
    } catch (err: any) {
      let msg = err.message || 'Failed to issue command.';
      if (err.statusCode === 403) {
        msg = 'Only owners and admins can control devices.';
      } else if (err.statusCode === 400) {
        msg = `Device "${device.name}" does not support this action or configuration.`;
      }
      setFriendlyErrorMessage(msg);
    }
  };

  const handleActionPress = (device: Device, action: ActuatorAction) => {
    if (isViewer) {
      setFriendlyErrorMessage('Only owners and admins can control devices.');
      return;
    }

    if (action === 'PUMP_ON') {
      setPumpModalDevice(device);
      setSelectedDurationMins(15);
      return;
    }

    // Confirmation for other actions
    const isON = action.endsWith('_ON');
    const actionLabel = action.replace('_', ' ');
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to trigger ${actionLabel} on "${device.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: isON ? 'default' : 'destructive',
          onPress: () => executeCommand(device, action),
        },
      ]
    );
  };

  const handleConfirmPump = () => {
    if (!pumpModalDevice) return;
    const dev = pumpModalDevice;
    const durationSeconds = selectedDurationMins * 60;
    setPumpModalDevice(null);
    executeCommand(dev, 'PUMP_ON', durationSeconds);
  };

  const formatCommandTime = (timeStr: string) => {
    try {
      const d = new Date(timeStr);
      return (
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
        ', ' +
        d.toLocaleDateString([], { month: 'short', day: 'numeric' })
      );
    } catch {
      return timeStr;
    }
  };

  const renderLiveStatusBanner = () => {
    if (!activeCommand) return null;

    let statusText = 'Pending: Queuing command...';
    let statusVariant: 'warning' | 'neutral' | 'success' | 'error' = 'warning';
    let icon = <Activity size={18} color="#EF6C00" />;

    const status = isTimedOut ? 'expired' : currentCommandRecord?.status ?? 'pending';
    const errorText = currentCommandRecord?.error;

    if (status === 'pending') {
      statusText = `Pending: Queuing ${activeCommand.action} for ${activeCommand.deviceName}...`;
      statusVariant = 'warning';
      icon = <Activity size={18} color="#EF6C00" />;
    } else if (status === 'published') {
      statusText = `Sent: Dispatched ${activeCommand.action} to ${activeCommand.deviceName} via MQTT...`;
      statusVariant = 'neutral';
      icon = <Activity size={18} color="#1976D2" />;
    } else if (status === 'acknowledged') {
      statusText = `Acknowledged: ${activeCommand.deviceName} confirmed ${activeCommand.action}!`;
      statusVariant = 'success';
      icon = <CheckCircle2 size={18} color="#2E7D32" />;
    } else if (status === 'expired' || isTimedOut) {
      statusText = `Timed out: No acknowledgment received within 40s (${activeCommand.action}).`;
      statusVariant = 'error';
      icon = <XCircle size={18} color="#D32F2F" />;
    } else if (status === 'failed') {
      statusText = `Failed: ${errorText || 'Command rejected or device offline.'}`;
      statusVariant = 'error';
      icon = <XCircle size={18} color="#D32F2F" />;
    }

    const isFinal =
      status === 'acknowledged' || status === 'failed' || status === 'expired' || isTimedOut;

    return (
      <Card
        style={[
          styles.liveStatusCard,
          statusVariant === 'success' && styles.liveStatusSuccess,
          statusVariant === 'error' && styles.liveStatusError,
          statusVariant === 'neutral' && styles.liveStatusSent,
          statusVariant === 'warning' && styles.liveStatusPending,
        ]}
      >
        <View style={styles.liveStatusContent}>
          {icon}
          <View style={styles.liveStatusTextContainer}>
            <Text style={styles.liveStatusTitle}>
              {status === 'pending'
                ? 'Pending'
                : status === 'published'
                ? 'Sent'
                : status === 'acknowledged'
                ? 'Acknowledged'
                : 'Command Ended'}
            </Text>
            <Text style={styles.liveStatusDesc}>{statusText}</Text>
          </View>
          {isFinal && (
            <TouchableOpacity
              style={styles.liveDismissBtn}
              onPress={() => setActiveCommand(null)}
            >
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  const getCapabilityIcon = (cap: string) => {
    switch (cap.toLowerCase()) {
      case 'pump':
        return <Droplets size={16} color={colors.primary} />;
      case 'valve':
        return <Sliders size={16} color="#00897B" />;
      case 'light':
        return <Sun size={16} color="#F57C00" />;
      case 'siren':
        return <BellRing size={16} color="#D32F2F" />;
      default:
        return <Power size={16} color={colors.primary} />;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={commandsRefetching}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      {/* Viewer Permission Banner */}
      {isViewer && (
        <View style={styles.viewerBanner}>
          <ShieldAlert size={18} color="#D32F2F" />
          <Text style={styles.viewerBannerText}>
            Only owners and admins can control devices. Your role is Viewer (read-only).
          </Text>
        </View>
      )}

      {/* Friendly Error Notice */}
      {friendlyErrorMessage && (
        <View style={styles.errorNotice}>
          <AlertCircle size={16} color={colors.error} />
          <Text style={styles.errorNoticeText}>{friendlyErrorMessage}</Text>
          <TouchableOpacity onPress={() => setFriendlyErrorMessage(null)}>
            <X size={14} color={colors.error} />
          </TouchableOpacity>
        </View>
      )}

      {/* Live In-flight Command Status */}
      {renderLiveStatusBanner()}

      {/* Actuator Devices List */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Power size={18} color={colors.primaryDark} />
          <Text style={styles.sectionTitle}>Remote Actuators</Text>
        </View>
        <Text style={styles.actuatorCountText}>
          {actuatorDevices.length} available
        </Text>
      </View>

      {devicesLoading ? (
        <LoadingView label="Loading actuator devices..." />
      ) : actuatorDevices.length === 0 ? (
        <Card style={styles.emptyCard}>
          <EmptyState
            icon={<Sliders size={32} color={colors.textSecondary} />}
            title="No Actuators Configured"
            description="None of your registered devices have pump, valve, light, or siren capabilities."
          />
        </Card>
      ) : (
        actuatorDevices.map((device) => {
          const deviceCaps = device.capabilities
            .map((c) => c.toLowerCase())
            .filter((c) =>
              ACTUATOR_CAPABILITIES.includes(c as (typeof ACTUATOR_CAPABILITIES)[number])
            );

          return (
            <Card key={device.id} style={styles.deviceCard}>
              <View style={styles.deviceHeader}>
                <View style={styles.deviceLeft}>
                  <View style={styles.deviceIconCircle}>
                    <Cpu size={20} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.deviceName}>{device.name}</Text>
                    <Text style={styles.deviceNodeText}>
                      Hardware Node #{device.nodeId} • {device.status}
                    </Text>
                  </View>
                </View>
                <Badge
                  label={device.status}
                  variant={device.status === 'online' ? 'success' : 'neutral'}
                />
              </View>

              <View style={styles.deviceDivider} />

              {/* Controls for each actuator capability on this device */}
              <View style={styles.controlsList}>
                {deviceCaps.map((cap) => {
                  const upperCap = cap.toUpperCase();
                  const onAction = `${upperCap}_ON` as ActuatorAction;
                  const offAction = `${upperCap}_OFF` as ActuatorAction;

                  const isThisDeviceActive =
                    isCommandInFlight && activeCommand?.deviceId === device.id;
                  const disableButtons = isViewer || isCommandInFlight;

                  return (
                    <View key={cap} style={styles.capControlRow}>
                      <View style={styles.capLabelBlock}>
                        {getCapabilityIcon(cap)}
                        <Text style={styles.capTitle}>{cap.toUpperCase()}</Text>
                      </View>

                      <View style={styles.buttonPair}>
                        <ControlButton
                          label="ON"
                          actionType="ON"
                          capability={cap}
                          disabled={disableButtons}
                          loading={
                            isThisDeviceActive && activeCommand?.action === onAction
                          }
                          onPress={() => handleActionPress(device, onAction)}
                        />
                        <ControlButton
                          label="OFF"
                          actionType="OFF"
                          capability={cap}
                          disabled={disableButtons}
                          loading={
                            isThisDeviceActive && activeCommand?.action === offAction
                          }
                          onPress={() => handleActionPress(device, offAction)}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card>
          );
        })
      )}

      {/* Recent Commands History Section */}
      <View style={[styles.sectionHeader, { marginTop: 20 }]}>
        <View style={styles.sectionTitleRow}>
          <Clock size={18} color={colors.primaryDark} />
          <Text style={styles.sectionTitle}>Recent Commands</Text>
        </View>
        <Text style={styles.actuatorCountText}>
          {recentCommands?.length ?? 0} dispatched
        </Text>
      </View>

      <Card style={styles.historyCard}>
        {commandsLoading ? (
          <LoadingView label="Loading recent commands..." />
        ) : !recentCommands || recentCommands.length === 0 ? (
          <View style={styles.noCommandsContainer}>
            <Text style={styles.noCommandsText}>No actuator commands issued yet</Text>
          </View>
        ) : (
          recentCommands.slice(0, 15).map((cmd, idx) => {
            const isLast = idx === Math.min(recentCommands.length, 15) - 1;
            const targetDev = devices?.find((d) => d.id === cmd.deviceId);

            let statusVariant: 'success' | 'warning' | 'danger' | 'neutral' = 'neutral';
            if (cmd.status === 'acknowledged') statusVariant = 'success';
            else if (cmd.status === 'pending') statusVariant = 'warning';
            else if (cmd.status === 'published') statusVariant = 'neutral';
            else if (cmd.status === 'failed' || cmd.status === 'expired') statusVariant = 'danger';

            return (
              <View
                key={cmd.id || cmd.commandId || idx}
                style={[styles.commandItem, !isLast && styles.commandItemBorder]}
              >
                <View style={styles.commandMain}>
                  <View style={styles.commandTitleRow}>
                    <Text style={styles.commandActionText}>
                      {cmd.action.replace('_', ' ')}
                    </Text>
                    {cmd.durationSeconds && (
                      <Text style={styles.commandDurationText}>
                        ({Math.round(cmd.durationSeconds / 60)}m)
                      </Text>
                    )}
                  </View>
                  <Text style={styles.commandTargetText}>
                    {targetDev?.name || `Device ID: ${cmd.deviceId.substring(0, 8)}...`}
                    {cmd.error ? ` • ${cmd.error}` : ''}
                  </Text>
                </View>

                <View style={styles.commandMeta}>
                  <Badge label={cmd.status} variant={statusVariant} />
                  <Text style={styles.commandTimeText}>
                    {formatCommandTime(cmd.createdAt)}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </Card>

      {/* Pump ON Duration & Confirmation Modal */}
      <Modal
        visible={pumpModalDevice !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPumpModalDevice(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setPumpModalDevice(null)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Droplets size={22} color={colors.primary} />
                <Text style={styles.modalTitle}>Irrigation Pump Control</Text>
              </View>
              <TouchableOpacity onPress={() => setPumpModalDevice(null)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalTargetText}>
              Device: <Text style={styles.boldText}>{pumpModalDevice?.name}</Text>
            </Text>

            <Text style={styles.durationPrompt}>
              Select runtime duration before starting:
            </Text>

            {/* Duration choice chips */}
            <View style={styles.durationPillsRow}>
              {[5, 15, 30, 60].map((mins) => {
                const isSelected = selectedDurationMins === mins;
                return (
                  <TouchableOpacity
                    key={mins}
                    style={[
                      styles.durationPill,
                      isSelected && styles.durationPillActive,
                    ]}
                    onPress={() => setSelectedDurationMins(mins)}
                  >
                    <Text
                      style={[
                        styles.durationPillText,
                        isSelected && styles.durationPillTextActive,
                      ]}
                    >
                      {mins} mins
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.confirmBox}>
              <Text style={styles.confirmQuestion}>Are you sure?</Text>
              <Text style={styles.confirmDesc}>
                This will dispatch a PUMP_ON command with duration of{' '}
                {selectedDurationMins} minutes ({selectedDurationMins * 60} seconds).
              </Text>
            </View>

            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setPumpModalDevice(null)}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.startPumpBtn}
                onPress={handleConfirmPump}
              >
                <Text style={styles.startPumpBtnText}>Confirm & Start Pump</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  viewerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  viewerBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#B71C1C',
    fontWeight: '600',
    lineHeight: 18,
  },
  errorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorSurface,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  errorNoticeText: {
    flex: 1,
    fontSize: 12,
    color: colors.error,
    fontWeight: '600',
  },
  liveStatusCard: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  liveStatusPending: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFE082',
  },
  liveStatusSent: {
    backgroundColor: '#E3F2FD',
    borderColor: '#90CAF9',
  },
  liveStatusSuccess: {
    backgroundColor: '#E8F5E9',
    borderColor: '#A5D6A7',
  },
  liveStatusError: {
    backgroundColor: '#FFEBEE',
    borderColor: '#EF9A9A',
  },
  liveStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  liveStatusTextContainer: {
    flex: 1,
  },
  liveStatusTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  liveStatusDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  liveDismissBtn: {
    padding: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  actuatorCountText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  deviceCard: {
    marginBottom: 14,
    padding: 16,
    borderRadius: 16,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deviceIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  deviceNodeText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  deviceDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 12,
  },
  controlsList: {
    gap: 12,
  },
  capControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  capLabelBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 100,
  },
  capTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  buttonPair: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  emptyCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  historyCard: {
    padding: 6,
    borderRadius: 16,
  },
  noCommandsContainer: {
    padding: 24,
    alignItems: 'center',
  },
  noCommandsText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  commandItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  commandItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  commandMain: {
    flex: 1,
    marginRight: 8,
  },
  commandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commandActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  commandDurationText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  commandTargetText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  commandMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  commandTimeText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  modalTargetText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  boldText: {
    fontWeight: '700',
    color: colors.text,
  },
  durationPrompt: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  durationPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  durationPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
  },
  durationPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  durationPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  durationPillTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  confirmBox: {
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 10,
    marginBottom: 18,
  },
  confirmQuestion: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  confirmDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  modalActionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelModalBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  startPumpBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  startPumpBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textInverse,
  },
});
