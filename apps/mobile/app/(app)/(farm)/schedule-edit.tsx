import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DateTimePicker, {
  type DateTimePickerChangeEvent,
} from '@react-native-community/datetimepicker';
import {
  Clock,
  Trash2,
  Check,
  AlertCircle,
  Sliders,
  Calendar,
} from 'lucide-react-native';
import { useActiveFarm } from '../../../src/context/FarmContext';
import { useDevices } from '../../../src/hooks/useDevices';
import {
  useSchedules,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
} from '../../../src/hooks/useSchedules';
import { Input } from '../../../src/components/Input';
import { Button } from '../../../src/components/Button';
import { Card } from '../../../src/components/Card';
import { colors } from '../../../src/theme/colors';
import type {
  ActuatorAction,
  ScheduleDays,
  CreateScheduleInput,
} from '../../../src/types';

const ACTUATOR_CAPS = ['pump', 'valve', 'light', 'siren'] as const;

const DURATION_PRESETS = [
  { label: '5 min', seconds: 300 },
  { label: '15 min', seconds: 900 },
  { label: '30 min', seconds: 1800 },
  { label: '60 min', seconds: 3600 },
];

const DAYS_MAP = [
  { label: 'Sun', day: 0 },
  { label: 'Mon', day: 1 },
  { label: 'Tue', day: 2 },
  { label: 'Wed', day: 3 },
  { label: 'Thu', day: 4 },
  { label: 'Fri', day: 5 },
  { label: 'Sat', day: 6 },
];

const scheduleFormSchema = z.object({
  deviceId: z.string().min(1, 'Please select an actuator device'),
  action: z.string().min(1, 'Please select an action') as z.ZodType<ActuatorAction>,
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format'),
  daysMode: z.enum(['daily', 'custom']),
  selectedDays: z.array(z.number()).optional(),
  durationSeconds: z.number().min(1).max(3600).optional(),
  name: z.string().max(60, 'Name cannot exceed 60 characters').optional(),
});

type ScheduleFormData = z.infer<typeof scheduleFormSchema>;

export function formatTime12h(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return time24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  const minStr = m < 10 ? `0${m}` : `${m}`;
  return `${hour12}:${minStr} ${ampm}`;
}

export default function ScheduleEditScreen() {
  const router = useRouter();
  const { scheduleId } = useLocalSearchParams<{ scheduleId?: string }>();
  const isEditing = Boolean(scheduleId);

  const { activeFarm } = useActiveFarm();
  const farmId = activeFarm?.id;

  const { data: devices, isLoading: devicesLoading } = useDevices(farmId);
  const { data: schedules } = useSchedules(farmId);

  const createScheduleMutation = useCreateSchedule(farmId);
  const updateScheduleMutation = useUpdateSchedule(farmId);
  const deleteScheduleMutation = useDeleteSchedule(farmId);

  // Filter actuator-capable devices
  const actuatorDevices = useMemo(() => {
    if (!devices) return [];
    return devices.filter((d) =>
      d.capabilities?.some((cap) =>
        ACTUATOR_CAPS.includes(cap as (typeof ACTUATOR_CAPS)[number])
      )
    );
  }, [devices]);

  // Find schedule if editing
  const existingSchedule = useMemo(() => {
    if (!isEditing || !schedules) return null;
    return schedules.find((s) => s.id === scheduleId) || null;
  }, [isEditing, schedules, scheduleId]);

  // Initial time Date object for picker
  const [pickerDate, setPickerDate] = useState<Date>(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    return d;
  });
  const [showPicker, setShowPicker] = useState<boolean>(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      deviceId: '',
      action: 'PUMP_ON',
      time: '06:00',
      daysMode: 'daily',
      selectedDays: [1, 2, 3, 4, 5],
      durationSeconds: 900, // 15 min default
      name: '',
    },
  });

  const selectedDeviceId = watch('deviceId');
  const selectedAction = watch('action');
  const selectedTime = watch('time');
  const daysMode = watch('daysMode');
  const selectedDays = watch('selectedDays') || [];
  const selectedDuration = watch('durationSeconds') || 900;

  const isOnAction = selectedAction ? selectedAction.endsWith('_ON') : false;

  // Selected device object
  const currentDevice = useMemo(() => {
    return actuatorDevices.find((d) => d.id === selectedDeviceId);
  }, [actuatorDevices, selectedDeviceId]);

  // Actions allowed for current device
  const availableActions = useMemo<ActuatorAction[]>(() => {
    if (!currentDevice) return [];
    const actions: ActuatorAction[] = [];
    if (currentDevice.capabilities.includes('pump')) {
      actions.push('PUMP_ON', 'PUMP_OFF');
    }
    if (currentDevice.capabilities.includes('valve')) {
      actions.push('VALVE_ON', 'VALVE_OFF');
    }
    if (currentDevice.capabilities.includes('light')) {
      actions.push('LIGHT_ON', 'LIGHT_OFF');
    }
    if (currentDevice.capabilities.includes('siren')) {
      actions.push('SIREN_ON', 'SIREN_OFF');
    }
    return actions;
  }, [currentDevice]);

  // Auto-select first actuator device when devices load and form has empty deviceId
  useEffect(() => {
    if (!isEditing && actuatorDevices.length > 0 && !selectedDeviceId) {
      const firstDev = actuatorDevices[0];
      setValue('deviceId', firstDev.id);
      if (firstDev.capabilities.includes('pump')) {
        setValue('action', 'PUMP_ON');
      } else if (firstDev.capabilities.includes('valve')) {
        setValue('action', 'VALVE_ON');
      } else if (firstDev.capabilities.includes('light')) {
        setValue('action', 'LIGHT_ON');
      } else if (firstDev.capabilities.includes('siren')) {
        setValue('action', 'SIREN_ON');
      }
    }
  }, [actuatorDevices, isEditing, selectedDeviceId, setValue]);

  // Populate form with existing schedule details
  useEffect(() => {
    if (existingSchedule) {
      const isDaily = existingSchedule.days === 'daily';
      const daysArr = Array.isArray(existingSchedule.days)
        ? existingSchedule.days
        : [0, 1, 2, 3, 4, 5, 6];

      reset({
        deviceId: existingSchedule.deviceId,
        action: existingSchedule.action,
        time: existingSchedule.time,
        daysMode: isDaily ? 'daily' : 'custom',
        selectedDays: daysArr,
        durationSeconds: existingSchedule.durationSeconds || 900,
        name: existingSchedule.name || '',
      });

      // Update date picker
      const [hStr, mStr] = existingSchedule.time.split(':');
      const d = new Date();
      d.setHours(parseInt(hStr, 10), parseInt(mStr, 10), 0, 0);
      setPickerDate(d);
    }
  }, [existingSchedule, reset]);

  // When device changes, ensure action is valid for the device
  const handleSelectDevice = (devId: string) => {
    setValue('deviceId', devId);
    const dev = actuatorDevices.find((d) => d.id === devId);
    if (dev) {
      if (dev.capabilities.includes('pump')) {
        setValue('action', 'PUMP_ON');
      } else if (dev.capabilities.includes('valve')) {
        setValue('action', 'VALVE_ON');
      } else if (dev.capabilities.includes('light')) {
        setValue('action', 'LIGHT_ON');
      } else if (dev.capabilities.includes('siren')) {
        setValue('action', 'SIREN_ON');
      }
    }
  };

  // Time picker change handlers using the non-deprecated onValueChange & onDismiss
  const handleTimeValueChange = (_event: DateTimePickerChangeEvent, date: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (date) {
      setPickerDate(date);
      const h = String(date.getHours()).padStart(2, '0');
      const m = String(date.getMinutes()).padStart(2, '0');
      setValue('time', `${h}:${m}`);
    }
  };

  const handleTimeDismiss = () => {
    setShowPicker(false);
  };

  // Toggle individual day in custom mode
  const toggleDay = (dayNum: number) => {
    let next: number[];
    if (selectedDays.includes(dayNum)) {
      if (selectedDays.length === 1) {
        Alert.alert('Notice', 'Schedule must have at least one active day.');
        return;
      }
      next = selectedDays.filter((d) => d !== dayNum);
    } else {
      next = [...selectedDays, dayNum].sort((a, b) => a - b);
    }
    setValue('selectedDays', next);
  };

  // Delete schedule
  const handleDelete = () => {
    if (!existingSchedule) return;
    Alert.alert(
      'Delete Schedule',
      'Are you sure you want to delete this schedule? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteScheduleMutation.mutateAsync(existingSchedule.id);
              router.back();
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Failed to delete schedule';
              Alert.alert('Error', msg);
            }
          },
        },
      ]
    );
  };

  // Form submit
  const onSubmit = async (formData: ScheduleFormData) => {
    if (!farmId) return;

    // Validate days
    let daysPayload: ScheduleDays;
    if (formData.daysMode === 'daily') {
      daysPayload = 'daily';
    } else {
      const days = formData.selectedDays || [];
      if (days.length === 0) {
        Alert.alert('Invalid Days', 'Please select at least one day for the schedule.');
        return;
      }
      daysPayload = days;
    }

    try {
      if (isEditing && existingSchedule) {
        await updateScheduleMutation.mutateAsync({
          scheduleId: existingSchedule.id,
          data: {
            action: formData.action,
            time: formData.time,
            days: daysPayload,
            durationSeconds: formData.action.endsWith('_ON')
              ? formData.durationSeconds
              : null,
            name: formData.name ? formData.name.trim() : undefined,
          },
        });
        Alert.alert('Success', 'Schedule updated successfully.');
        router.back();
      } else {
        const payload: CreateScheduleInput = {
          deviceId: formData.deviceId,
          action: formData.action,
          time: formData.time,
          days: daysPayload,
          durationSeconds: formData.action.endsWith('_ON')
            ? formData.durationSeconds
            : undefined,
          enabled: true,
          name: formData.name ? formData.name.trim() : undefined,
        };
        await createScheduleMutation.mutateAsync(payload);
        Alert.alert('Success', 'Schedule created successfully.');
        router.back();
      }
    } catch (err: any) {
      // Friendly error handling
      let errorMessage = 'Failed to save schedule. Please try again.';
      if (err?.statusCode === 400 || err?.status === 400) {
        if (err?.message?.includes('capability') || err?.errorText?.includes('capability')) {
          errorMessage = 'The selected device lacks the capability for this action.';
        } else if (err?.message?.includes('20') || err?.message?.includes('limit')) {
          errorMessage = 'Schedule limit reached: a farm can have at most 20 schedules.';
        } else {
          errorMessage = err?.message || 'Invalid schedule details provided.';
        }
      } else if (err?.statusCode === 403 || err?.status === 403) {
        errorMessage = 'Only owners and admins can create or edit schedules.';
      } else if (err?.message) {
        errorMessage = err.message;
      }
      Alert.alert('Error', errorMessage);
    }
  };

  const isSubmitting =
    createScheduleMutation.isPending || updateScheduleMutation.isPending;

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Farm Timezone Notice */}
        <View style={styles.timezoneBanner}>
          <Clock size={16} color={colors.primary} />
          <Text style={styles.timezoneText}>
            Times follow the farm’s timezone ({activeFarm?.timezone || 'Asia/Kolkata'}).
          </Text>
        </View>

        {/* Device Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Target Actuator Device</Text>
          {devicesLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : actuatorDevices.length === 0 ? (
            <Card style={styles.warningCard}>
              <AlertCircle size={20} color={colors.warning} />
              <Text style={styles.warningText}>
                No actuator devices (pumps, valves, lights, sirens) found on this farm.
              </Text>
            </Card>
          ) : (
            <View style={styles.deviceList}>
              {actuatorDevices.map((dev) => {
                const isSelected = dev.id === selectedDeviceId;
                return (
                  <TouchableOpacity
                    key={dev.id}
                    style={[
                      styles.deviceOption,
                      isSelected && styles.deviceOptionSelected,
                    ]}
                    onPress={() => handleSelectDevice(dev.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.deviceOptionLeft}>
                      <View
                        style={[
                          styles.radioCircle,
                          isSelected && styles.radioCircleSelected,
                        ]}
                      >
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                      <View>
                        <Text
                          style={[
                            styles.deviceName,
                            isSelected && styles.deviceNameSelected,
                          ]}
                        >
                          {dev.name}
                        </Text>
                        <Text style={styles.deviceNode}>
                          Node #{dev.nodeId} • {dev.capabilities.join(', ')}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {errors.deviceId && (
            <Text style={styles.errorText}>{errors.deviceId.message}</Text>
          )}
        </View>

        {/* Action Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Action</Text>
          <View style={styles.actionGrid}>
            {availableActions.map((action) => {
              const isSelected = action === selectedAction;
              const isOn = action.endsWith('_ON');
              const label = isOn
                ? `Turn ON (${action.split('_')[0]})`
                : `Turn OFF (${action.split('_')[0]})`;

              return (
                <TouchableOpacity
                  key={action}
                  style={[
                    styles.actionButton,
                    isSelected && styles.actionButtonSelected,
                    isOn && isSelected && styles.actionButtonOn,
                  ]}
                  onPress={() => setValue('action', action)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.actionButtonText,
                      isSelected && styles.actionButtonTextSelected,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {errors.action && (
            <Text style={styles.errorText}>{errors.action.message}</Text>
          )}
        </View>

        {/* Time Picker */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Execution Time</Text>
          <TouchableOpacity
            style={styles.timeCard}
            onPress={() => setShowPicker(true)}
            activeOpacity={0.7}
          >
            <View style={styles.timeCardLeft}>
              <View style={styles.timeIconCircle}>
                <Clock size={22} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.timeDisplay}>
                  {formatTime12h(selectedTime)}
                </Text>
                <Text style={styles.timeSubtext}>24h: {selectedTime}</Text>
              </View>
            </View>
            <Text style={styles.changeTimeText}>Change Time</Text>
          </TouchableOpacity>

          {/* Android Picker */}
          {showPicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={pickerDate}
              mode="time"
              is24Hour={false}
              display="default"
              onValueChange={handleTimeValueChange}
              onDismiss={handleTimeDismiss}
            />
          )}

          {/* iOS / Modal Picker */}
          {showPicker && Platform.OS !== 'android' && (
            <Modal
              visible={showPicker}
              transparent
              animationType="fade"
              onRequestClose={() => setShowPicker(false)}
            >
              <View style={styles.iosModalOverlay}>
                <View style={styles.iosModalContent}>
                  <View style={styles.iosModalHeader}>
                    <Text style={styles.iosModalTitle}>Select Time</Text>
                    <TouchableOpacity
                      onPress={() => setShowPicker(false)}
                      style={styles.iosDoneButton}
                    >
                      <Text style={styles.iosDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={pickerDate}
                    mode="time"
                    is24Hour={false}
                    display="spinner"
                    onValueChange={handleTimeValueChange}
                    onDismiss={handleTimeDismiss}
                  />
                </View>
              </View>
            </Modal>
          )}
        </View>

        {/* Duration (Only for ON actions) */}
        {isOnAction && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Duration (Automatic Shutoff)</Text>
            <Text style={styles.sectionHint}>
              Actuator will safely turn off after this duration.
            </Text>
            <View style={styles.chipRow}>
              {DURATION_PRESETS.map((item) => {
                const isSelected = selectedDuration === item.seconds;
                return (
                  <TouchableOpacity
                    key={item.seconds}
                    style={[
                      styles.chip,
                      isSelected && styles.chipSelected,
                    ]}
                    onPress={() => setValue('durationSeconds', item.seconds)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Days Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Frequency</Text>
          <View style={styles.daysModeRow}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                daysMode === 'daily' && styles.modeButtonSelected,
              ]}
              onPress={() => setValue('daysMode', 'daily')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  daysMode === 'daily' && styles.modeButtonTextSelected,
                ]}
              >
                Daily (Every day)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeButton,
                daysMode === 'custom' && styles.modeButtonSelected,
              ]}
              onPress={() => setValue('daysMode', 'custom')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  daysMode === 'custom' && styles.modeButtonTextSelected,
                ]}
              >
                Select Days
              </Text>
            </TouchableOpacity>
          </View>

          {daysMode === 'custom' && (
            <View style={styles.dayChipsGrid}>
              {DAYS_MAP.map((item) => {
                const isSelected = selectedDays.includes(item.day);
                return (
                  <TouchableOpacity
                    key={item.day}
                    style={[
                      styles.dayCircle,
                      isSelected && styles.dayCircleSelected,
                    ]}
                    onPress={() => toggleDay(item.day)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dayCircleText,
                        isSelected && styles.dayCircleTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Schedule Name */}
        <View style={styles.section}>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Schedule Name (Optional)"
                placeholder="e.g. Morning sugarcane cycle"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                maxLength={60}
                error={errors.name?.message}
              />
            )}
          />
        </View>

        {/* Submit and Delete Actions */}
        <View style={styles.actionContainer}>
          <Button
            title={isEditing ? 'Save Changes' : 'Create Schedule'}
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            disabled={actuatorDevices.length === 0}
            style={styles.submitButton}
          />

          {isEditing && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={deleteScheduleMutation.isPending}
              activeOpacity={0.7}
            >
              {deleteScheduleMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <>
                  <Trash2 size={18} color={colors.error} />
                  <Text style={styles.deleteButtonText}>Delete Schedule</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  timezoneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primarySurface,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  timezoneText: {
    fontSize: 12,
    color: colors.primaryDark,
    flex: 1,
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 10,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: '#FFF3E0',
    borderColor: '#FFE0B2',
  },
  warningText: {
    fontSize: 13,
    color: colors.warning,
    flex: 1,
  },
  deviceList: {
    gap: 8,
  },
  deviceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
  },
  deviceOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  deviceOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  deviceNameSelected: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  deviceNode: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  actionButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  actionButtonOn: {
    borderColor: colors.primary,
    backgroundColor: '#E8F5E9',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  actionButtonTextSelected: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  timeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
  },
  timeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeDisplay: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  timeSubtext: {
    fontSize: 12,
    color: colors.textMuted,
  },
  changeTimeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primarySurface,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  daysModeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  modeButtonSelected: {
    backgroundColor: colors.primarySurface,
    borderColor: colors.primary,
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modeButtonTextSelected: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  dayChipsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  dayCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayCircleText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  dayCircleTextSelected: {
    color: colors.textInverse,
  },
  actionContainer: {
    marginTop: 10,
    gap: 14,
  },
  submitButton: {
    height: 52,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FFCDD2',
    backgroundColor: colors.errorSurface,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.error,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 6,
  },
  iosModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  iosModalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  iosModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  iosModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  iosDoneButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  iosDoneText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
});
