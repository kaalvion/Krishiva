import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  Modal,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DateTimePicker, {
  type DateTimePickerChangeEvent,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { TimePickerModal } from '../../../src/components/TimePickerModal';
import {
  ArrowLeft,
  Settings,
  User,
  Clock,
  Radio,
  SlidersHorizontal,
  Droplets,
  PowerOff,
  Sliders,
  Sun,
  Moon,
  Bell,
  BellOff,
  Check,
  ShieldCheck,
  Tag,
  X,
  ArrowUpRight,
  Trash2,
  Edit2,
} from 'lucide-react-native';
import { useActiveFarm } from '../../../src/context/FarmContext';
import { useServerStatus, ServerStatusBanner } from '../../../src/context/ServerStatusContext';
import { useLiveDevices, useLiveSchedules } from '../../../src/hooks/live';
import {
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
} from '../../../src/hooks/useSchedules';
import type {
  ActuatorAction,
  ScheduleDays,
  CreateScheduleInput,
  Device,
} from '../../../src/types';

const ACTUATOR_CAPS = ['pump', 'valve', 'light', 'siren'] as const;

const DURATION_PRESETS = [
  { label: '5 min', seconds: 300 },
  { label: '15 min', seconds: 900 },
  { label: '30 min', seconds: 1800 },
  { label: '60 min', seconds: 3600 },
];

const DAYS_BUTTONS = [
  { label: 'S', day: 0 },
  { label: 'M', day: 1 },
  { label: 'T', day: 2 },
  { label: 'W', day: 3 },
  { label: 'T', day: 4 },
  { label: 'F', day: 5 },
  { label: 'S', day: 6 },
];

const ACTION_OPTIONS: {
  action: ActuatorAction;
  label: string;
  icon: 'droplets' | 'power_off' | 'valve' | 'sun' | 'moon' | 'bell' | 'bell_off';
}[] = [
  { action: 'PUMP_ON', label: 'Turn ON Borewell Pump', icon: 'droplets' },
  { action: 'PUMP_OFF', label: 'Turn OFF Borewell Pump', icon: 'power_off' },
  { action: 'VALVE_ON', label: 'Turn ON Drip Valve', icon: 'valve' },
  { action: 'VALVE_OFF', label: 'Turn OFF Drip Valve', icon: 'valve' },
  { action: 'LIGHT_ON', label: 'Turn ON Perimeter Light', icon: 'sun' },
  { action: 'LIGHT_OFF', label: 'Turn OFF Perimeter Light', icon: 'moon' },
  { action: 'SIREN_ON', label: 'Arm Pest Siren', icon: 'bell' },
  { action: 'SIREN_OFF', label: 'Disarm Pest Siren', icon: 'bell_off' },
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
  const [hStr, mStr] = (time24 || '06:00').split(':');
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
  const { serverOnline } = useServerStatus();

  const { devices } = useLiveDevices(farmId);
  const { schedules } = useLiveSchedules(farmId);

  const createScheduleMutation = useCreateSchedule(farmId);
  const updateScheduleMutation = useUpdateSchedule(farmId);
  const deleteScheduleMutation = useDeleteSchedule(farmId);

  // Filter actuator-capable devices
  const actuatorDevices = useMemo(() => {
    if (!devices) return [];
    return devices.filter((d) =>
      d.capabilities?.some((cap) =>
        ACTUATOR_CAPS.includes(cap.toLowerCase() as (typeof ACTUATOR_CAPS)[number])
      )
    );
  }, [devices]);

  // Find schedule if editing
  const existingSchedule = useMemo(() => {
    if (!isEditing || !schedules) return null;
    return schedules.find((s) => s.id === scheduleId) || null;
  }, [isEditing, schedules, scheduleId]);

  // DateTimePicker states
  const [pickerDate, setPickerDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(6, 0, 0, 0);
    return d;
  });
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const [deviceModalVisible, setDeviceModalVisible] = useState(false);

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
      daysMode: 'custom',
      selectedDays: [1, 2, 3, 4, 5],
      durationSeconds: 900, // 15 min default
      name: 'Morning sugarcane cycle',
    },
  });

  const selectedDeviceId = watch('deviceId');
  const selectedAction = watch('action');
  const selectedTime = watch('time');
  const daysMode = watch('daysMode');
  const selectedDays = watch('selectedDays') || [];
  const selectedDuration = watch('durationSeconds') || 900;
  const scheduleName = watch('name') || '';

  // Selected device object
  const currentDevice = useMemo(() => {
    return (
      actuatorDevices.find((d) => d.id === selectedDeviceId) ||
      actuatorDevices[0] ||
      null
    );
  }, [actuatorDevices, selectedDeviceId]);

  // Auto-select first actuator device when devices load
  useEffect(() => {
    if (!isEditing && actuatorDevices.length > 0 && !selectedDeviceId) {
      const firstDev = actuatorDevices[0];
      setValue('deviceId', firstDev.id);
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

      const [hStr, mStr] = (existingSchedule.time || '06:00').split(':');
      const d = new Date();
      d.setHours(parseInt(hStr, 10) || 6, parseInt(mStr, 10) || 0, 0, 0);
      setPickerDate(d);
    }
  }, [existingSchedule, reset]);

  // Time picker change handlers
  const handleTimeChange = (_event: DateTimePickerEvent, date?: Date) => {
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

  // Day toggle handler
  const handleToggleDay = (dayNum: number) => {
    setValue('daysMode', 'custom');
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

  const handleSetDaily = () => {
    setValue('daysMode', 'daily');
    setValue('selectedDays', [0, 1, 2, 3, 4, 5, 6]);
  };

  const handleSetCustomDays = () => {
    setValue('daysMode', 'custom');
    if (selectedDays.length === 7) {
      setValue('selectedDays', [1, 2, 3, 4, 5]); // default weekdays
    }
  };

  // Custom duration dialog
  const handleCustomDuration = () => {
    Alert.prompt
      ? Alert.prompt(
          'Custom Duration',
          'Enter automatic shutoff time in minutes (1 to 60):',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Set',
              onPress: (val?: string) => {
                const mins = parseInt(val || '15', 10);
                if (!isNaN(mins) && mins >= 1 && mins <= 60) {
                  setValue('durationSeconds', mins * 60);
                } else {
                  Alert.alert('Invalid Duration', 'Please enter a number between 1 and 60 minutes.');
                }
              },
            },
          ],
          'plain-text',
          Math.round(selectedDuration / 60).toString()
        )
      : Alert.alert('Duration', `Current duration: ${Math.round(selectedDuration / 60)} minutes.`);
  };

  // Delete schedule
  const handleDelete = () => {
    if (!serverOnline) {
      Alert.alert('Server Offline', 'Needs the server. Try again when it is back online.');
      return;
    }
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

  // Submit schedule
  const onSubmit = async (formData: ScheduleFormData) => {
    if (!serverOnline) {
      Alert.alert('Server Offline', 'Needs the server. Try again when it is back online.');
      return;
    }
    if (!farmId) return;

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
          deviceId: formData.deviceId || currentDevice?.id || 'node-1',
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
      let errorMessage = 'Failed to save schedule. Please try again.';
      if (err?.statusCode === 400 || err?.status === 400) {
        if (err?.message?.includes('capability')) {
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

  const renderActionIcon = (type: (typeof ACTION_OPTIONS)[number]['icon'], isSelected: boolean) => {
    const iconColor = isSelected ? '#161e00' : '#556253';
    switch (type) {
      case 'droplets':
        return <Droplets size={22} color={iconColor} />;
      case 'power_off':
        return <PowerOff size={22} color={iconColor} />;
      case 'valve':
        return <Sliders size={22} color={iconColor} />;
      case 'sun':
        return <Sun size={22} color={iconColor} />;
      case 'moon':
        return <Moon size={22} color={iconColor} />;
      case 'bell':
        return <Bell size={22} color={iconColor} />;
      case 'bell_off':
        return <BellOff size={22} color={iconColor} />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. Header & Top Bar */}
      <View style={styles.topHeader}>
        <View style={styles.topHeaderLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <ArrowLeft size={22} color="#191c1b" />
          </TouchableOpacity>
          <Text style={styles.topHeaderTitle}>Automation Unit Detail</Text>
        </View>

        <View style={styles.topHeaderRight}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => Alert.alert('Diagnostics', 'Schedule diagnostics & telemetry')}
            activeOpacity={0.7}
          >
            <Settings size={20} color="#191c1b" />
          </TouchableOpacity>
          <View style={styles.headerAvatarMini}>
            <User size={16} color="#ffffff" />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ServerStatusBanner />

        {/* Schedule Details Context Row */}
        <View style={styles.contextHeader}>
          <Text style={styles.screenTitle}>SCHEDULE DETAILS</Text>
          <View style={styles.activeBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.activeBadgeText}>ACTIVE</Text>
          </View>
        </View>

        {/* Timezone Sync Banner */}
        <View style={styles.timezoneBanner}>
          <View style={styles.timezoneIconCircle}>
            <Clock size={18} color="#516600" />
          </View>
          <Text style={styles.timezoneText}>
            Times follow the farm’s automated local timezone{' '}
            <Text style={styles.timezoneBold}>
              ({activeFarm?.timezone || 'Asia/Kolkata, UTC+5:30'}).
            </Text>
          </Text>
        </View>

        {/* 2. Target Actuator Device */}
        <View style={styles.sectionGroup}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>TARGET ACTUATOR DEVICE</Text>
            <Text style={styles.pairedNodeLabel}>PAIRED NODE</Text>
          </View>

          <View style={styles.deviceCard}>
            {/* Radio selected indicator */}
            <View style={styles.radioOuter}>
              <View style={styles.radioInner} />
            </View>

            <View style={styles.deviceIconBox}>
              <Radio size={22} color="#191c1b" />
            </View>

            <View style={styles.deviceDetails}>
              <View style={styles.deviceNameRow}>
                <Text style={styles.deviceNameText} numberOfLines={1}>
                  {currentDevice?.name || 'GSM Master Controller'}
                </Text>
                <View style={styles.deviceOnlinePill}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.deviceOnlineText}>Online</Text>
                </View>
              </View>
              <Text style={styles.deviceSubtext} numberOfLines={1}>
                Node #{currentDevice?.nodeId || 1} • F0:24:F9:0D:B7:48 • Borewell & Valves
              </Text>
            </View>

            <TouchableOpacity
              style={styles.tuneButton}
              onPress={() => setDeviceModalVisible(true)}
              activeOpacity={0.7}
              accessibilityLabel="Select device"
            >
              <SlidersHorizontal size={17} color="#556253" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. Action Grid (The 8 commands) */}
        <View style={styles.sectionGroup}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>ACTION</Text>
            <Text style={styles.sectionSubtitle}>Tap to select command</Text>
          </View>

          <View style={styles.actionGrid}>
            {ACTION_OPTIONS.map((item) => {
              const isSelected = selectedAction === item.action;

              return (
                <TouchableOpacity
                  key={item.action}
                  style={[
                    styles.actionTile,
                    isSelected ? styles.actionTileActive : styles.actionTileInactive,
                  ]}
                  onPress={() => setValue('action', item.action)}
                  activeOpacity={0.85}
                >
                  <View style={styles.actionTileTop}>
                    {renderActionIcon(item.icon, isSelected)}
                    {isSelected ? (
                      <View style={styles.checkCircle}>
                        <Check size={12} color="#C6E85A" strokeWidth={3} />
                      </View>
                    ) : (
                      <View style={styles.uncheckCircle} />
                    )}
                  </View>

                  <Text
                    style={[
                      styles.actionLabel,
                      isSelected ? styles.actionLabelActive : styles.actionLabelInactive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 4. Execution Time */}
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionTitle}>EXECUTION TIME</Text>
          <View style={styles.timeCard}>
            <View style={styles.timeLeft}>
              <View style={styles.clockCircle}>
                <Clock size={24} color="#161e00" />
              </View>
              <View style={styles.timeCol}>
                <Text style={styles.hugeTimeDisplay}>
                  {formatTime12h(selectedTime)}
                </Text>
                <Text style={styles.timeSubtext}>
                  24h format: {selectedTime} • Sunrise irrigation
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.timeEditButton}
              onPress={() => {
                const [h, m] = (selectedTime || '06:00').split(':').map(Number);
                const d = new Date();
                d.setHours(h ?? 6, m ?? 0, 0, 0);
                setPickerDate(d);
                setShowPicker(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.timeEditText}>Edit</Text>
              <Edit2 size={13} color="#191c1b" />
            </TouchableOpacity>
          </View>

          {/* Time Picker Modal */}
          <TimePickerModal
            visible={showPicker}
            initialTime={pickerDate}
            onClose={() => setShowPicker(false)}
            onConfirm={(date: Date) => {
              setPickerDate(date);
              const h = String(date.getHours()).padStart(2, '0');
              const m = String(date.getMinutes()).padStart(2, '0');
              setValue('time', `${h}:${m}`);
            }}
          />
        </View>

        {/* 5. Duration (Automatic Shutoff) */}
        <View style={styles.sectionGroup}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>DURATION (AUTOMATIC SHUTOFF)</Text>
            <View style={styles.dryRunRow}>
              <ShieldCheck size={14} color="#516600" />
              <Text style={styles.dryRunText}>Dry-run safe</Text>
            </View>
          </View>
          <Text style={styles.durationHelpText}>
            Pump will automatically deactivate after specified interval to prevent dry run or soil runoff.
          </Text>

          <View style={styles.durationPillsRow}>
            {DURATION_PRESETS.map((preset) => {
              const isSelected = selectedDuration === preset.seconds;

              return (
                <TouchableOpacity
                  key={preset.label}
                  style={[
                    styles.durationPill,
                    isSelected ? styles.durationPillActive : styles.durationPillInactive,
                  ]}
                  onPress={() => setValue('durationSeconds', preset.seconds)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.durationPillText,
                      isSelected && styles.durationPillTextActive,
                    ]}
                  >
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Custom Duration Pill */}
            <TouchableOpacity
              style={[
                styles.durationPill,
                !DURATION_PRESETS.some((p) => p.seconds === selectedDuration)
                  ? styles.durationPillActive
                  : styles.durationPillInactive,
              ]}
              onPress={handleCustomDuration}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.durationPillText,
                  !DURATION_PRESETS.some((p) => p.seconds === selectedDuration) &&
                    styles.durationPillTextActive,
                ]}
              >
                Custom
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 6. Frequency & Recurrence */}
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionTitle}>FREQUENCY</Text>

          {/* Segmented Track */}
          <View style={styles.freqTrack}>
            <TouchableOpacity
              style={[
                styles.freqTab,
                daysMode === 'daily' && styles.freqTabActive,
              ]}
              onPress={handleSetDaily}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.freqTabText,
                  daysMode === 'daily' && styles.freqTabTextActive,
                ]}
              >
                Daily (Every day)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.freqTab,
                daysMode === 'custom' && styles.freqTabActive,
              ]}
              onPress={handleSetCustomDays}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.freqTabText,
                  daysMode === 'custom' && styles.freqTabTextActive,
                ]}
              >
                Select Days
              </Text>
            </TouchableOpacity>
          </View>

          {/* Day Circles Card */}
          <View style={styles.daysCard}>
            <View style={styles.daysCirclesRow}>
              {DAYS_BUTTONS.map((item, index) => {
                const isActive = selectedDays.includes(item.day);

                return (
                  <TouchableOpacity
                    key={`${item.label}-${index}`}
                    style={[
                      styles.dayCircle,
                      isActive ? styles.dayCircleActive : styles.dayCircleInactive,
                    ]}
                    onPress={() => handleToggleDay(item.day)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.dayCircleText,
                        isActive && styles.dayCircleTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.daysFooterRow}>
              <Text style={styles.daysFooterLeft}>
                Repeats weekly on selected weekday mornings
              </Text>
              <Text style={styles.daysFooterRight}>
                {selectedDays.length} DAYS ACTIVE
              </Text>
            </View>
          </View>
        </View>

        {/* 7. Schedule Name */}
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionTitle}>SCHEDULE NAME</Text>
          <View style={styles.nameCard}>
            <Tag size={20} color="#556253" />
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.nameInput}
                  value={value}
                  onChangeText={onChange}
                  placeholder="Morning sugarcane cycle"
                  placeholderTextColor="#757965"
                />
              )}
            />
            {scheduleName.length > 0 && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => setValue('name', '')}
              >
                <X size={14} color="#556253" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Spacing for bottom bar */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* 8. Sticky Bottom Bar */}
      <View style={styles.bottomBar}>
        {/* Save Changes Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#161e00" />
          ) : (
            <>
              <Text style={styles.saveButtonText}>SAVE CHANGES</Text>
              <View style={styles.saveArrowCircle}>
                <ArrowUpRight size={19} color="#ffffff" />
              </View>
            </>
          )}
        </TouchableOpacity>

        {/* Delete Schedule Button */}
        {isEditing && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            activeOpacity={0.85}
          >
            <Trash2 size={16} color="#ba1a1a" />
            <Text style={styles.deleteButtonText}>Delete Schedule</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Device Picker Modal */}
      <Modal
        visible={deviceModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDeviceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Actuator Node</Text>
              <TouchableOpacity onPress={() => setDeviceModalVisible(false)}>
                <X size={20} color="#191c1b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalDeviceList}>
              {actuatorDevices.map((dev) => (
                <TouchableOpacity
                  key={dev.id}
                  style={[
                    styles.modalDeviceItem,
                    dev.id === selectedDeviceId && styles.modalDeviceItemSelected,
                  ]}
                  onPress={() => {
                    setValue('deviceId', dev.id);
                    setDeviceModalVisible(false);
                  }}
                >
                  <Radio size={20} color="#516600" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.modalDeviceName}>{dev.name}</Text>
                    <Text style={styles.modalDeviceSub}>
                      Node #{dev.nodeId} • {dev.type}
                    </Text>
                  </View>
                  {dev.id === selectedDeviceId && (
                    <Check size={18} color="#516600" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9faf8',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(249, 250, 248, 0.92)',
    borderBottomWidth: 1,
    borderBottomColor: '#edeeec',
  },
  topHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topHeaderTitle: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
  },
  topHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#516600',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 8,
  },
  screenTitle: {
    fontSize: 22,
    fontFamily: 'Manrope_300Light',
    color: '#191c1b',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#c6e85a',
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
  activeBadgeText: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    color: '#161e00',
    letterSpacing: 0.5,
  },
  timezoneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(211, 225, 166, 0.4)',
    padding: 12,
    borderRadius: 16,
    marginBottom: 16,
  },
  timezoneIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  timezoneText: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    color: '#454937',
    flex: 1,
    lineHeight: 17,
  },
  timezoneBold: {
    fontFamily: 'Manrope_700Bold',
    color: '#191c1b',
  },
  sectionGroup: {
    marginBottom: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    color: '#556253',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  pairedNodeLabel: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    color: '#516600',
    letterSpacing: 0.8,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontFamily: 'Manrope_400Regular',
    color: '#757965',
  },
  deviceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#c6e85a',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#161e00',
  },
  deviceIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#f3f4f2',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  deviceDetails: {
    flex: 1,
    minWidth: 0,
  },
  deviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deviceNameText: {
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
    flexShrink: 1,
  },
  deviceOnlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d8e7d4',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 99,
  },
  onlineDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#516600',
  },
  deviceOnlineText: {
    fontSize: 9,
    fontFamily: 'Manrope_700Bold',
    color: '#5b6859',
  },
  deviceSubtext: {
    fontSize: 10,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
    marginTop: 2,
  },
  tuneButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f2',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionTile: {
    width: '48.5%',
    minHeight: 96,
    borderRadius: 20,
    padding: 12,
    justifyContent: 'space-between',
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  actionTileActive: {
    backgroundColor: '#C6E85A',
  },
  actionTileInactive: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  actionTileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#161e00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uncheckCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#edeeec',
  },
  actionLabel: {
    fontSize: 13,
    lineHeight: 17,
    marginTop: 8,
  },
  actionLabelActive: {
    fontFamily: 'Manrope_700Bold',
    color: '#161e00',
  },
  actionLabelInactive: {
    fontFamily: 'Manrope_600SemiBold',
    color: '#556253',
  },
  timeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  timeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  clockCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#C6E85A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeCol: {
    flex: 1,
  },
  hugeTimeDisplay: {
    fontSize: 30,
    fontFamily: 'Manrope_300Light',
    color: '#191c1b',
    letterSpacing: -0.5,
  },
  timeSubtext: {
    fontSize: 11,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
    marginTop: 2,
  },
  timeEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3f4f2',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
  },
  timeEditText: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
  },
  dryRunRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dryRunText: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    color: '#516600',
  },
  durationHelpText: {
    fontSize: 11,
    fontFamily: 'Manrope_400Regular',
    color: '#757965',
    marginBottom: 8,
    lineHeight: 16,
  },
  durationPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  durationPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  durationPillActive: {
    backgroundColor: '#C6E85A',
  },
  durationPillInactive: {
    backgroundColor: '#ffffff',
  },
  durationPillText: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: '#556253',
  },
  durationPillTextActive: {
    fontFamily: 'Manrope_700Bold',
    color: '#161e00',
  },
  freqTrack: {
    flexDirection: 'row',
    backgroundColor: '#edeeec',
    borderRadius: 99,
    padding: 4,
    marginBottom: 10,
  },
  freqTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freqTabActive: {
    backgroundColor: '#C6E85A',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  freqTabText: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    color: '#556253',
  },
  freqTabTextActive: {
    fontFamily: 'Manrope_700Bold',
    color: '#161e00',
  },
  daysCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  daysCirclesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleActive: {
    backgroundColor: '#1E2A1E',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  dayCircleInactive: {
    backgroundColor: '#f3f4f2',
  },
  dayCircleText: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: '#556253',
  },
  dayCircleTextActive: {
    fontFamily: 'Manrope_700Bold',
    color: '#ffffff',
  },
  daysFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  daysFooterLeft: {
    fontSize: 11,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
    flex: 1,
  },
  daysFooterRight: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    color: '#516600',
    letterSpacing: 0.5,
  },
  nameCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  nameInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
    paddingVertical: 4,
  },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f3f4f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(249, 250, 248, 0.94)',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#edeeec',
    gap: 8,
  },
  saveButton: {
    width: '100%',
    height: 52,
    borderRadius: 99,
    backgroundColor: '#C6E85A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 24,
    paddingRight: 6,
    shadowColor: '#C6E85A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 3,
  },
  saveButtonText: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: '#161e00',
    letterSpacing: 0.8,
  },
  saveArrowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E2A1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: '100%',
    height: 42,
    borderRadius: 99,
    backgroundColor: 'rgba(255, 218, 214, 0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  deleteButtonText: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: '#ba1a1a',
  },
  iosModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  iosModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
  },
  iosModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iosModalTitle: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
  },
  iosDoneBtn: {
    padding: 6,
  },
  iosDoneText: {
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
    color: '#516600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
  },
  modalDeviceList: {
    paddingBottom: 20,
  },
  modalDeviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: '#f3f4f2',
  },
  modalDeviceItemSelected: {
    borderWidth: 1.5,
    borderColor: '#C6E85A',
  },
  modalDeviceName: {
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
  },
  modalDeviceSub: {
    fontSize: 11,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
    marginTop: 2,
  },
});
