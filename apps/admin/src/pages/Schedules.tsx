import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  type Farm,
  type FarmRole,
  type Schedule,
  type ActuatorAction,
  type ScheduleDays,
} from '../types';
import {
  useSchedules,
  useDevices,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
} from '../hooks';
import { DataTable, type Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import {
  Plus,
  Edit2,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  ShieldAlert,
} from 'lucide-react';

const scheduleSchema = z.object({
  name: z.string().optional(),
  deviceId: z.string().min(1, 'Target device is required'),
  action: z.string().min(1, 'Action is required'),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format (24-hour)'),
  daysMode: z.enum(['daily', 'custom']),
  selectedDays: z.array(z.number()).optional(),
  durationSeconds: z.coerce.number().min(0).optional(),
  enabled: z.boolean(),
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const Schedules: React.FC = () => {
  const { currentFarm, role } = useOutletContext<{ currentFarm: Farm; role: FarmRole }>();
  const farmId = currentFarm?.id;
  const isViewer = role === 'viewer';
  const toast = useToast();

  const { data: schedules = [], isLoading, refetch } = useSchedules(farmId);
  const { data: devices = [] } = useDevices(farmId);
  const { mutateAsync: createSchedule, isPending: isCreating } = useCreateSchedule(farmId);
  const { mutateAsync: updateSchedule, isPending: isUpdating } = useUpdateSchedule(farmId);
  const { mutateAsync: deleteSchedule, isPending: isDeleting } = useDeleteSchedule(farmId);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null);

  // Form setup
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      name: '',
      deviceId: '',
      action: 'PUMP_ON',
      time: '06:00',
      daysMode: 'daily',
      selectedDays: [1, 2, 3, 4, 5],
      durationSeconds: 1800,
      enabled: true,
    },
  });

  const daysMode = watch('daysMode');
  const selectedDays = watch('selectedDays') || [];
  const actionValue = watch('action');
  const isDurationAction = typeof actionValue === 'string' && actionValue.endsWith('_ON');

  // Filter actuator devices
  const actuatorDevices = (devices || []).filter((d) =>
    (d?.capabilities || []).some((c) =>
      ['pump', 'valve', 'light', 'siren'].includes(typeof c === 'string' ? c.toLowerCase() : '')
    )
  );

  const openCreateModal = () => {
    setEditingSchedule(null);
    reset({
      name: 'Morning Irrigation',
      deviceId: actuatorDevices[0]?.id || '',
      action: 'PUMP_ON',
      time: '06:00',
      daysMode: 'daily',
      selectedDays: [1, 2, 3, 4, 5],
      durationSeconds: 1800,
      enabled: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    const isDaily = schedule.days === 'daily';
    reset({
      name: schedule.name || '',
      deviceId: schedule.deviceId,
      action: schedule.action,
      time: schedule.time,
      daysMode: isDaily ? 'daily' : 'custom',
      selectedDays: Array.isArray(schedule.days) ? schedule.days : [1, 2, 3, 4, 5],
      durationSeconds: schedule.durationSeconds || 0,
      enabled: schedule.enabled,
    });
    setModalOpen(true);
  };

  const toggleDay = (dayIndex: number) => {
    if (selectedDays.includes(dayIndex)) {
      setValue(
        'selectedDays',
        selectedDays.filter((d) => d !== dayIndex)
      );
    } else {
      setValue('selectedDays', [...selectedDays, dayIndex].sort());
    }
  };

  const handleToggleEnable = async (schedule: Schedule) => {
    if (isViewer) return;
    try {
      await updateSchedule({
        scheduleId: schedule.id,
        input: { enabled: !schedule.enabled },
      });
      toast.success(
        'Schedule Updated',
        `Schedule "${schedule.name || schedule.action}" is now ${
          !schedule.enabled ? 'Enabled' : 'Disabled'
        }`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle schedule';
      toast.error('Update Error', msg);
    }
  };

  const onSubmitForm = async (values: ScheduleFormValues) => {
    try {
      const days: ScheduleDays =
        values.daysMode === 'daily' ? 'daily' : values.selectedDays || [];

      if (values.daysMode === 'custom' && (!values.selectedDays || values.selectedDays.length === 0)) {
        toast.error('Validation Error', 'Please select at least one day of the week.');
        return;
      }

      if (editingSchedule) {
        await updateSchedule({
          scheduleId: editingSchedule.id,
          input: {
            name: values.name,
            deviceId: values.deviceId,
            action: values.action as ActuatorAction,
            time: values.time,
            days,
            durationSeconds: isDurationAction ? values.durationSeconds : undefined,
            enabled: values.enabled,
          },
        });
        toast.success('Schedule Updated', 'Schedule modifications saved successfully.');
      } else {
        await createSchedule({
          name: values.name,
          deviceId: values.deviceId,
          action: values.action as ActuatorAction,
          time: values.time,
          days,
          durationSeconds: isDurationAction ? values.durationSeconds : undefined,
          enabled: values.enabled,
        });
        toast.success('Schedule Created', 'New scheduled task configured successfully.');
      }

      setModalOpen(false);
      reset();
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save schedule';
      toast.error('Schedule Error', msg);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSchedule(deleteTarget.id);
      toast.success('Schedule Deleted', 'Scheduled task was removed.');
      setDeleteTarget(null);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete schedule';
      toast.error('Delete Error', msg);
    }
  };

  const formatDaysDisplay = (days?: ScheduleDays | null) => {
    if (!days) return 'None';
    if (days === 'daily') return 'Every day';
    if (!Array.isArray(days) || days.length === 0) return 'None';
    if (days.length === 7) return 'Every day';
    return days.map((d) => (typeof d === 'number' && DAY_LABELS[d] ? DAY_LABELS[d] : String(d))).join(', ');
  };

  const columns: Column<Schedule>[] = [
    {
      header: 'Status',
      accessor: (s) => (
        <button
          type="button"
          disabled={isViewer}
          onClick={() => handleToggleEnable(s)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            s.enabled ? 'bg-emerald-600' : 'bg-slate-300'
          } ${isViewer ? 'cursor-not-allowed opacity-60' : ''}`}
          title={isViewer ? 'Read-only' : s.enabled ? 'Click to disable' : 'Click to enable'}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
              s.enabled ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      ),
      className: 'w-16',
    },
    {
      header: 'Name & Action',
      accessor: (s) => (
        <div>
          <span className="font-semibold text-slate-800 text-xs block">
            {s.name || s.action}
          </span>
          <span className="font-mono text-[11px] text-emerald-800 font-bold">
            {s.action}
            {s.durationSeconds ? ` (${s.durationSeconds}s)` : ''}
          </span>
        </div>
      ),
    },
    {
      header: 'Time & Days',
      accessor: (s) => (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{s.time}</span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {formatDaysDisplay(s.days)}
          </span>
        </div>
      ),
    },
    {
      header: 'Target Device',
      accessor: (s) => {
        const dev = devices.find((d) => d.id === s.deviceId);
        return (
          <div>
            <span className="text-xs font-semibold text-slate-800 block">
              {dev ? dev.name : s.deviceId}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {s.deviceId}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Last Run',
      accessor: (s) => {
        const d = s.lastRunAt ? new Date(s.lastRunAt) : null;
        const valid = d && !isNaN(d.getTime());
        return valid ? (
          <div>
            <div className="flex items-center gap-1 text-[11px] text-slate-700">
              {s.lastRunStatus === 'issued' ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-rose-500" />
              )}
              <span className="capitalize">{s.lastRunStatus || 'Run'}</span>
            </div>
            <span className="text-[10px] text-slate-400">
              {d.toLocaleString()}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400">Not yet run</span>
        );
      },
    },
    {
      header: 'Actions',
      accessor: (s) =>
        isViewer ? (
          <span className="text-xs text-slate-400">Read-only</span>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openEditModal(s)}
              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
              title="Edit schedule"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget(s)}
              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Delete schedule"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ),
      className: 'w-24 text-right',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Irrigation & Actuator Schedules
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure automated daily and weekly timer schedules. Note: All times use the farm's
            timezone ({currentFarm?.timezone || 'Asia/Kolkata'}).
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isViewer ? (
            <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs">
              <ShieldAlert className="w-4 h-4 text-slate-500" />
              <span>Viewer Role (Read-only)</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Schedule</span>
            </button>
          )}
        </div>
      </div>

      {/* Schedules Table */}
      <DataTable
        columns={columns}
        data={schedules}
        keyExtractor={(s) => s.id}
        loading={isLoading}
        emptyMessage="No automated schedules created for this farm yet."
        emptyAction={
          !isViewer && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 text-white text-xs font-semibold rounded-lg hover:bg-emerald-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Schedule</span>
            </button>
          )
        }
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSchedule ? 'Edit Schedule' : 'Create Automated Schedule'}
        description={`Times use the farm's timezone (${currentFarm?.timezone || 'Asia/Kolkata'}).`}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Schedule Name
            </label>
            <input
              {...register('name')}
              placeholder="e.g. Daily Morning Drip Irrigation"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Target Device
              </label>
              <select
                {...register('deviceId')}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
              >
                {actuatorDevices.map((d) => (
                  <option key={d.id} value={d.id}>
                    Node #{d.nodeId} &bull; {d.name}
                  </option>
                ))}
              </select>
              {errors.deviceId && (
                <p className="mt-1 text-xs text-rose-500 font-medium">
                  {errors.deviceId.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Action
              </label>
              <select
                {...register('action')}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono font-bold text-emerald-900"
              >
                <option value="PUMP_ON">PUMP_ON</option>
                <option value="PUMP_OFF">PUMP_OFF</option>
                <option value="VALVE_ON">VALVE_ON</option>
                <option value="VALVE_OFF">VALVE_OFF</option>
                <option value="LIGHT_ON">LIGHT_ON</option>
                <option value="LIGHT_OFF">LIGHT_OFF</option>
                <option value="SIREN_ON">SIREN_ON</option>
                <option value="SIREN_OFF">SIREN_OFF</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Time (HH:MM 24h format)
              </label>
              <input
                {...register('time')}
                placeholder="06:00"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono font-bold"
              />
              {errors.time && (
                <p className="mt-1 text-xs text-rose-500 font-medium">{errors.time.message}</p>
              )}
            </div>

            {isDurationAction && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Duration (Seconds)
                </label>
                <input
                  type="number"
                  min="5"
                  max="86400"
                  {...register('durationSeconds')}
                  placeholder="1800"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Recurrence Days
            </label>
            <div className="flex items-center gap-4 mb-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="daily"
                  {...register('daysMode')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-semibold text-slate-800">Every day</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="custom"
                  {...register('daysMode')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-semibold text-slate-800">Select specific days</span>
              </label>
            </div>

            {daysMode === 'custom' && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {DAY_LABELS.map((dayName, idx) => {
                  const isSelected = selectedDays.includes(idx);
                  return (
                    <button
                      key={dayName}
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {dayName}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="enabledSwitch"
              {...register('enabled')}
              className="w-4 h-4 text-emerald-600 rounded-md border-slate-300 focus:ring-emerald-500"
            />
            <label htmlFor="enabledSwitch" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Enable schedule immediately
            </label>
          </div>

          <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || isUpdating}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {(isCreating || isUpdating) && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span>{editingSchedule ? 'Save Changes' : 'Create Schedule'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Schedule"
        message={`Are you sure you want to delete the schedule "${
          deleteTarget?.name || deleteTarget?.action
        }"? This cannot be undone.`}
        confirmText="Delete Schedule"
        isDestructive
        loading={isDeleting}
      />
    </div>
  );
};
