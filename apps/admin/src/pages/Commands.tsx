import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  type Farm,
  type FarmRole,
  type CommandRecord,
  type ActuatorAction,
  ApiError,
} from '../types';
import {
  useCommands,
  useDevices,
  useIssueCommand,
  useCommandPoll,
} from '../hooks';
import { DataTable, type Column } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import {
  Zap,
  Play,
  RotateCw,
  Filter,
  CheckCircle2,
  XCircle,
  ShieldAlert,
} from 'lucide-react';

export const Commands: React.FC = () => {
  const { currentFarm, role } = useOutletContext<{ currentFarm: Farm; role: FarmRole }>();
  const farmId = currentFarm?.id;
  const isViewer = role === 'viewer';
  const toast = useToast();

  // Queries
  const { data: commands = [], isLoading, refetch } = useCommands(farmId, 50, 10000);
  const { data: devices = [] } = useDevices(farmId);
  const { mutateAsync: issueCommand, isPending: isIssuing } = useIssueCommand();

  // Filters
  const [deviceFilter, setDeviceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Command dispatch form
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [action, setAction] = useState<ActuatorAction>('PUMP_ON');
  const [durationSeconds, setDurationSeconds] = useState<number>(60);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Live polling state
  const [activePollCommandId, setActivePollCommandId] = useState<string | null>(null);
  const [pollModalOpen, setPollModalOpen] = useState(false);

  const {
    command: liveCommand,
    isFinal,
    isTimedOut,
  } = useCommandPoll(
    activePollCommandId,
    farmId,
    selectedDeviceId,
    pollModalOpen && !!activePollCommandId
  );

  // Filter devices with actuator capabilities
  const actuatorDevices = (devices || []).filter((d) =>
    (d?.capabilities || []).some((c) =>
      ['pump', 'valve', 'light', 'siren'].includes(typeof c === 'string' ? c.toLowerCase() : '')
    )
  );

  // Set default selected device if empty
  React.useEffect(() => {
    if (!selectedDeviceId && actuatorDevices.length > 0) {
      setSelectedDeviceId(actuatorDevices[0].id);
    }
  }, [actuatorDevices, selectedDeviceId]);

  const targetDevice = devices.find((d) => d.id === selectedDeviceId);

  // Determine available actions based on chosen device capabilities
  const getAvailableActions = (): ActuatorAction[] => {
    if (!targetDevice || !targetDevice.capabilities) return ['PUMP_ON', 'PUMP_OFF'];
    const caps = (targetDevice.capabilities || []).map((c) =>
      typeof c === 'string' ? c.toLowerCase() : ''
    );
    const list: ActuatorAction[] = [];
    if (caps.includes('pump')) list.push('PUMP_ON', 'PUMP_OFF');
    if (caps.includes('valve')) list.push('VALVE_ON', 'VALVE_OFF');
    if (caps.includes('light')) list.push('LIGHT_ON', 'LIGHT_OFF');
    if (caps.includes('siren')) list.push('SIREN_ON', 'SIREN_OFF');
    return list.length > 0 ? list : ['PUMP_ON', 'PUMP_OFF'];
  };

  const isDurationAction = typeof action === 'string' && action.endsWith('_ON');

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeviceId) {
      toast.error('Device required', 'Please select an actuator device.');
      return;
    }
    setConfirmOpen(true);
  };

  const handleExecuteCommand = async () => {
    if (!farmId || !selectedDeviceId) return;

    try {
      setConfirmOpen(false);
      const res = await issueCommand({
        farmId,
        deviceId: selectedDeviceId,
        action,
        durationSeconds: isDurationAction ? durationSeconds : undefined,
      });

      toast.info('Command Dispatched', `Command ${action} accepted with ID ${res.commandId}`);
      setActivePollCommandId(res.commandId);
      setPollModalOpen(true);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 400) {
        toast.error('Validation Error', err.message);
      } else {
        const msg = err instanceof Error ? err.message : 'Failed to dispatch command';
        toast.error('Command Failed', msg);
      }
    }
  };

  // Filter commands
  const filteredCommands = commands.filter((cmd) => {
    if (deviceFilter !== 'all' && cmd.deviceId !== deviceFilter) return false;
    if (statusFilter !== 'all' && cmd.status !== statusFilter) return false;
    return true;
  });

  const columns: Column<CommandRecord>[] = [
    {
      header: 'Time',
      accessor: (cmd) => {
        const d = cmd.createdAt ? new Date(cmd.createdAt) : null;
        const valid = d && !isNaN(d.getTime());
        return (
          <div>
            <span className="font-medium text-slate-800 text-xs block">
              {valid
                ? d.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : '-'}
            </span>
            <span className="text-[10px] text-slate-400">
              {valid ? d.toLocaleDateString() : '-'}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Device',
      accessor: (cmd) => {
        const dev = devices.find((d) => d.id === cmd.deviceId);
        return (
          <div>
            <span className="font-semibold text-slate-800 block text-xs">
              {dev ? dev.name : cmd.deviceId}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {cmd.deviceId}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Action',
      accessor: (cmd) => (
        <div className="flex items-center gap-1.5 font-mono font-bold text-xs">
          <span className="text-emerald-800">{cmd.action}</span>
          {cmd.durationSeconds && (
            <span className="text-[10px] text-slate-400 font-normal">
              ({cmd.durationSeconds}s)
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Requested By',
      accessor: (cmd) => (
        <div>
          <span className="text-xs text-slate-700 block truncate max-w-[150px]">
            {cmd.requestedBy}
          </span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">
            {cmd.source || 'console'}
          </span>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (cmd) => <StatusBadge status={cmd.status} size="sm" />,
    },
    {
      header: 'Details / Error',
      accessor: (cmd) =>
        cmd.error ? (
          <span className="text-xs text-rose-600 font-mono truncate max-w-xs block" title={cmd.error}>
            {cmd.error}
          </span>
        ) : cmd.acknowledgedAt ? (
          <span className="text-xs text-emerald-600 font-mono">
            Ack @ {new Date(cmd.acknowledgedAt).toLocaleTimeString()}
          </span>
        ) : (
          <span className="text-xs text-slate-400">--</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Actuator Commands</h1>
          <p className="text-xs text-slate-500 mt-1">
            Dispatch manual relay instructions to pumps, valves, and lights with live MQTT tracking.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-xs hover:bg-slate-50 transition-colors"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Send Command Panel (Owner/Admin Only) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-slate-900">Send Actuator Command</h2>
          </div>
          {isViewer && (
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> Viewer mode: sending disabled
            </span>
          )}
        </div>

        {isViewer ? (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
            You have viewer access on this farm. Actuator command dispatch is restricted to owners and administrators.
          </div>
        ) : actuatorDevices.length === 0 ? (
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
            No actuator devices (pump, valve, light, siren) registered on this farm yet. Register an actuator node on the Devices page first.
          </div>
        ) : (
          <form onSubmit={handleOpenConfirm} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Target Device
              </label>
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
              >
                {actuatorDevices.map((d) => (
                  <option key={d.id} value={d.id}>
                    Node #{d.nodeId} &bull; {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Action
              </label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as ActuatorAction)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono font-bold text-emerald-900"
              >
                {getAvailableActions().map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Duration (Sec)
              </label>
              <input
                type="number"
                min="5"
                max="86400"
                disabled={!isDurationAction}
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono disabled:opacity-40"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isIssuing}
                className="w-full py-2 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Dispatch Command</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleExecuteCommand}
        title="Confirm Actuator Command"
        message={`Are you sure you want to dispatch ${action} ${
          isDurationAction ? `for ${durationSeconds} seconds` : ''
        } to "${targetDevice?.name || selectedDeviceId}"? This triggers real physical actuators in the field.`}
        confirmText="Confirm & Dispatch"
        loading={isIssuing}
      />

      {/* Live Polling Status Modal */}
      <Modal
        isOpen={pollModalOpen}
        onClose={() => setPollModalOpen(false)}
        title="Command Dispatch Pipeline"
        description={`Command ID: ${activePollCommandId || ''}`}
        maxWidth="sm"
      >
        <div className="py-4 space-y-5 text-center">
          {/* Status Indicator */}
          <div className="flex justify-center">
            {liveCommand?.status === 'acknowledged' ? (
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center animate-in zoom-in-75">
                <CheckCircle2 className="w-10 h-10 stroke-[2.2]" />
              </div>
            ) : liveCommand?.status === 'failed' || isTimedOut ? (
              <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center animate-in zoom-in-75">
                <XCircle className="w-10 h-10 stroke-[2.2]" />
              </div>
            ) : (
              <div className="relative w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-600/20 border-t-emerald-600 animate-spin" />
                <Zap className="w-7 h-7 text-emerald-700" />
              </div>
            )}
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 capitalize">
              {liveCommand ? `Status: ${liveCommand.status}` : 'Initiating Command...'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              {liveCommand?.status === 'acknowledged'
                ? 'Device has received and acknowledged the actuation signal.'
                : liveCommand?.status === 'published'
                ? 'Message published to MQTT broker. Awaiting hardware acknowledgment...'
                : liveCommand?.status === 'failed'
                ? `Operation failed: ${liveCommand.error || 'Device error'}`
                : isTimedOut
                ? 'Timed out waiting for device acknowledgment (40s).'
                : 'Routing command through Firebase & MQTT broker...'}
            </p>
          </div>

          {/* Stepper info */}
          <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 space-y-1.5 text-left border border-slate-200">
            <div className="flex justify-between">
              <span className="text-slate-400">Action:</span>
              <span className="font-mono font-bold text-slate-800">{action}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Target Device:</span>
              <span className="font-semibold text-slate-800">
                {targetDevice?.name || selectedDeviceId}
              </span>
            </div>
            {isDurationAction && (
              <div className="flex justify-between">
                <span className="text-slate-400">Duration:</span>
                <span className="font-mono text-slate-800">{durationSeconds}s</span>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setPollModalOpen(false);
                refetch();
              }}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              {isFinal || isTimedOut ? 'Close' : 'Dismiss to Background'}
            </button>
          </div>
        </div>
      </Modal>

      {/* History Table with Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900">Command History</h3>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={deviceFilter}
                onChange={(e) => setDeviceFilter(e.target.value)}
                className="bg-transparent text-slate-700 font-medium focus:outline-none"
              >
                <option value="all">All Devices</option>
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-slate-700 font-medium focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="published">Published</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="failed">Failed</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredCommands}
          keyExtractor={(cmd) => cmd.id}
          loading={isLoading}
          emptyMessage="No command history matching filters."
        />
      </div>
    </div>
  );
};
