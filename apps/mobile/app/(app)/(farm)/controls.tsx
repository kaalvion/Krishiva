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
  TextInput,
  ActivityIndicator,
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
  Database,
  Send,
  MessageSquare,
} from 'lucide-react-native';
import { useActiveFarm } from '../../../src/context/FarmContext';
import { useServerStatus, ServerStatusBanner } from '../../../src/context/ServerStatusContext';
import { useLiveDevices, useRecentCommands } from '../../../src/hooks/live';
import { useCommandStatus, useIssueCommand } from '../../../src/hooks/useCommand';
import { formatInTimezone } from '../../../src/utils/freshness';
import { ControlButton } from '../../../src/components/ControlButton';
import { Card } from '../../../src/components/Card';
import { Badge } from '../../../src/components/Badge';
import { EmptyState } from '../../../src/components/EmptyState';
import { LoadingView } from '../../../src/components/LoadingView';
import { colors } from '../../../src/theme/colors';
import { sendHardwareMessage } from '../../../src/services/api';
import { useLanguage } from '../../../src/context/LanguageContext';
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
  const { serverOnline } = useServerStatus();
  const { t } = useLanguage();

  // Active command in-flight tracking
  const [activeCommand, setActiveCommand] = useState<ActiveCommandTracker | null>(null);

  // Pump ON modal state
  const [pumpModalDevice, setPumpModalDevice] = useState<Device | null>(null);
  const [selectedDurationMins, setSelectedDurationMins] = useState<number>(15);

  // Instant message & direct hardware command state
  const [instantMessage, setInstantMessage] = useState<string>('');
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);
  const [messageFeedback, setMessageFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedMessageDeviceId, setSelectedMessageDeviceId] = useState<string | null>(null);

  // Error alert message state
  const [friendlyErrorMessage, setFriendlyErrorMessage] = useState<string | null>(null);

  // Live data fetching directly from Firestore
  const {
    devices,
    loading: devicesLoading,
    refresh: refreshDevices,
    fromCache: devicesFromCache,
  } = useLiveDevices(activeFarm?.id);

  const {
    commands: recentCommands,
    loading: commandsLoading,
    refresh: refreshCommands,
    fromCache: commandsFromCache,
  } = useRecentCommands(activeFarm?.id, devices);

  // Mutation to issue commands through backend API
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
      onSettled: () => {
        refreshCommands();
      },
    }
  );

  const isViewer = activeFarm?.role === 'viewer';
  const isFromCache = devicesFromCache || commandsFromCache;

  // Filter devices that have at least one actuator capability
  const actuatorDevices = useMemo(() => {
    return devices.filter((d) =>
      d.capabilities.some((c) =>
        ACTUATOR_CAPABILITIES.includes(c.toLowerCase() as (typeof ACTUATOR_CAPABILITIES)[number])
      )
    );
  }, [devices]);

  // Selected device for hardware message/command dispatch
  const activeMessageDevice = useMemo(() => {
    if (selectedMessageDeviceId) {
      return devices.find((d) => d.id === selectedMessageDeviceId) || devices[0];
    }
    return actuatorDevices[0] || devices[0];
  }, [devices, actuatorDevices, selectedMessageDeviceId]);

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
    refreshDevices();
    refreshCommands();
  };

  const executeCommand = async (
    device: Device,
    action: ActuatorAction,
    durationSeconds?: number
  ) => {
    if (!serverOnline) {
      Alert.alert('Server Offline', 'Needs the server. Try again when it is back online.');
      return;
    }

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
    if (!serverOnline) {
      Alert.alert('Server Offline', 'Needs the server. Try again when it is back online.');
      return;
    }

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
    if (!serverOnline) {
      Alert.alert('Server Offline', 'Needs the server. Try again when it is back online.');
      return;
    }
    if (!pumpModalDevice) return;
    const dev = pumpModalDevice;
    const durationSeconds = selectedDurationMins === 0 ? undefined : selectedDurationMins * 60;
    setPumpModalDevice(null);
    executeCommand(dev, 'PUMP_ON', durationSeconds);
  };

  const handleSendHardwareMessage = async (customText?: string) => {
    const msgToSend = (customText !== undefined ? customText : instantMessage).trim();
    if (!msgToSend) return;
    if (!activeFarm || !activeMessageDevice) {
      Alert.alert('No Device', 'No active device available to send commands.');
      return;
    }
    if (!serverOnline) {
      Alert.alert('Server Offline', 'Needs the server. Try again when it is back online.');
      return;
    }
    if (isViewer) {
      setFriendlyErrorMessage('Only owners and admins can send hardware commands.');
      return;
    }

    setIsSendingMessage(true);
    setMessageFeedback(null);
    try {
      await sendHardwareMessage(activeFarm.id, activeMessageDevice.id, msgToSend);
      setMessageFeedback({
        type: 'success',
        text: `Command "${msgToSend}" dispatched to ${activeMessageDevice.name}!`,
      });
      if (customText === undefined) {
        setInstantMessage('');
      }
      refreshCommands();
    } catch (err: any) {
      setMessageFeedback({
        type: 'error',
        text: err.message || 'Failed to dispatch message to hardware.',
      });
    } finally {
      setIsSendingMessage(false);
    }
  };

  const formatCommandTime = (timeStr?: string) => {
    return formatInTimezone(timeStr, activeFarm.timezone);
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
          refreshing={false}
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
          <Text style={styles.cacheBannerText}>{t('common.showing_offline')}</Text>
        </View>
      )}

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
          <Text style={styles.sectionTitle}>{t('controls.title')}</Text>
        </View>
        <Text style={styles.actuatorCountText}>
          {actuatorDevices.length} {t('controls.available')}
        </Text>
      </View>

      {devicesLoading && actuatorDevices.length === 0 ? (
        <LoadingView label="Loading actuator devices..." />
      ) : actuatorDevices.length === 0 ? (
        <Card style={styles.emptyCard}>
          <EmptyState
            icon={<Sliders size={32} color={colors.textSecondary} />}
            title={t('controls.no_actuators')}
            description={t('controls.no_actuators_desc')}
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
                  const disableButtons = isViewer || isCommandInFlight || !serverOnline;

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

      {/* Hardware Instant Message & Direct Command Section */}
      {activeMessageDevice && (
        <Card style={styles.instantMessageCard}>
          <View style={styles.instantMessageHeader}>
            <View style={styles.instantMessageTitleRow}>
              <View style={styles.messageIconCircle}>
                <MessageSquare size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.instantMessageTitle}>{t('controls.hardware_direct')}</Text>
                <Text style={styles.instantMessageSubtitle}>
                  {t('controls.target_gateway')}: {activeMessageDevice.name} ({activeMessageDevice.id})
                </Text>
              </View>
            </View>
          </View>

          {/* Quick preset action buttons */}
          <View style={styles.quickActionsContainer}>
            <Text style={styles.quickActionsLabel}>{t('controls.quick_overrides')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickChipsRow}
            >
              {[
                { label: 'Pump ON', cmd: 'PUMP:ON' },
                { label: 'Pump OFF', cmd: 'PUMP:OFF' },
                { label: 'Valve ON', cmd: 'VALVE:ON' },
                { label: 'Valve OFF', cmd: 'VALVE:OFF' },
                { label: 'Light ON', cmd: 'LIGHT:ON' },
                { label: 'Light OFF', cmd: 'LIGHT:OFF' },
                { label: 'Siren ON', cmd: 'SIREN:ON' },
                { label: 'Siren OFF', cmd: 'SIREN:OFF' },
                { label: 'AUTO: true', cmd: 'AUTO:true' },
                { label: 'AUTO: false', cmd: 'AUTO:false' },
                { label: 'STATUS', cmd: 'STATUS' },
              ].map((chip) => (
                <TouchableOpacity
                  key={chip.cmd}
                  style={styles.quickChip}
                  disabled={isSendingMessage || isViewer || !serverOnline}
                  onPress={() => handleSendHardwareMessage(chip.cmd)}
                >
                  <Text style={styles.quickChipText}>{chip.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Custom text input & send button */}
          <View style={styles.messageInputRow}>
            <TextInput
              style={styles.messageTextInput}
              placeholder="e.g. RELAY1:ON, AUTO:false, PING..."
              placeholderTextColor={colors.textMuted}
              value={instantMessage}
              onChangeText={setInstantMessage}
              editable={!isSendingMessage && !isViewer && serverOnline}
              returnKeyType="send"
              onSubmitEditing={() => handleSendHardwareMessage()}
            />
            <TouchableOpacity
              style={[
                styles.sendMessageBtn,
                (!instantMessage.trim() || isSendingMessage || isViewer || !serverOnline) &&
                  styles.sendMessageBtnDisabled,
              ]}
              disabled={!instantMessage.trim() || isSendingMessage || isViewer || !serverOnline}
              onPress={() => handleSendHardwareMessage()}
            >
              {isSendingMessage ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Send size={16} color={colors.textInverse} />
              )}
            </TouchableOpacity>
          </View>

          {/* Message feedback alert */}
          {messageFeedback && (
            <View
              style={[
                styles.feedbackBox,
                messageFeedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError,
              ]}
            >
              {messageFeedback.type === 'success' ? (
                <CheckCircle2 size={15} color="#2E7D32" />
              ) : (
                <AlertCircle size={15} color={colors.error} />
              )}
              <Text
                style={[
                  styles.feedbackText,
                  messageFeedback.type === 'success'
                    ? styles.feedbackTextSuccess
                    : styles.feedbackTextError,
                ]}
              >
                {messageFeedback.text}
              </Text>
              <TouchableOpacity onPress={() => setMessageFeedback(null)}>
                <X size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
        </Card>
      )}

      {/* Recent Commands History Section */}
      <View style={[styles.sectionHeader, { marginTop: 20 }]}>
        <View style={styles.sectionTitleRow}>
          <Clock size={18} color={colors.primaryDark} />
          <Text style={styles.sectionTitle}>{t('controls.recent_commands')}</Text>
        </View>
        <Text style={styles.actuatorCountText}>
          {recentCommands.length} {t('controls.dispatched')}
        </Text>
      </View>

      <Card style={styles.historyCard}>
        {commandsLoading && recentCommands.length === 0 ? (
          <LoadingView label="Loading recent commands..." />
        ) : recentCommands.length === 0 ? (
          <View style={styles.noCommandsContainer}>
            <Text style={styles.noCommandsText}>{t('controls.no_commands')}</Text>
          </View>
        ) : (
          recentCommands.slice(0, 15).map((cmd, idx) => {
            const isLast = idx === Math.min(recentCommands.length, 15) - 1;
            const targetDev = devices.find((d) => d.id === cmd.deviceId);

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
                <Text style={styles.modalTitle}>{t('controls.pump_control')}</Text>
              </View>
              <TouchableOpacity onPress={() => setPumpModalDevice(null)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalTargetText}>
              Device: <Text style={styles.boldText}>{pumpModalDevice?.name}</Text>
            </Text>

            <Text style={styles.durationPrompt}>
              {t('controls.select_duration')}
            </Text>

            {/* Duration choice chips */}
            <View style={styles.durationPillsRow}>
              {[0, 5, 15, 30, 60].map((mins) => {
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
                      {mins === 0 ? t('controls.instant') : `${mins}m`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.confirmBox}>
              <Text style={styles.confirmQuestion}>Are you sure?</Text>
              {selectedDurationMins === 0 ? (
                <Text style={styles.confirmDesc}>
                  This will dispatch an instant PUMP_ON command with continuous runtime without an auto-off timer.
                </Text>
              ) : (
                <Text style={styles.confirmDesc}>
                  This will dispatch a PUMP_ON command with duration of{' '}
                  {selectedDurationMins} minutes ({selectedDurationMins * 60} seconds).
                </Text>
              )}
            </View>

            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setPumpModalDevice(null)}
              >
                <Text style={styles.cancelModalBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.startPumpBtn}
                onPress={handleConfirmPump}
              >
                <Text style={styles.startPumpBtnText}>{t('controls.confirm_pump')}</Text>
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
  instantMessageCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  instantMessageHeader: {
    marginBottom: 12,
  },
  instantMessageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  messageIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instantMessageTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  instantMessageSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  quickActionsContainer: {
    marginBottom: 12,
  },
  quickActionsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  messageInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageTextInput: {
    flex: 1,
    height: 42,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: colors.text,
  },
  sendMessageBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendMessageBtnDisabled: {
    backgroundColor: colors.textMuted,
    opacity: 0.6,
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  feedbackSuccess: {
    backgroundColor: '#E8F5E9',
  },
  feedbackError: {
    backgroundColor: '#FFEBEE',
  },
  feedbackText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
  },
  feedbackTextSuccess: {
    color: '#2E7D32',
  },
  feedbackTextError: {
    color: colors.error,
  },
});
