import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  type Farm,
  type FarmRole,
  type Device,
  ApiError,
} from '../types';
import {
  useDevices,
  useRegisterDevice,
  useDeviceLatest,
  useDeviceHistory,
} from '../hooks';
import { DataTable, type Column } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { LineChart, type MetricType, type RangeType } from '../components/LineChart';
import { useToast } from '../components/Toast';
import {
  Plus,
  Droplet,
  Thermometer,
  Wind,
  MapPin,
  ShieldAlert,
} from 'lucide-react';

const registerDeviceSchema = z.object({
  nodeId: z.coerce.number().int().min(1, 'Node ID must be 1-4').max(4, 'Node ID must be 1-4'),
  name: z.string().min(2, 'Device name must be at least 2 characters'),
  type: z.enum(['sensor', 'sensor_actuator', 'gateway']),
  zone: z.string().optional(),
  capabilities: z.array(z.string()).min(1, 'Select at least one capability'),
});

type RegisterDeviceFormValues = z.infer<typeof registerDeviceSchema>;

const AVAILABLE_CAPABILITIES = [
  'soil_moisture',
  'temperature',
  'humidity',
  'pump',
  'valve',
  'light',
  'siren',
];

export const Devices: React.FC = () => {
  const { currentFarm, role } = useOutletContext<{ currentFarm: Farm; role: FarmRole }>();
  const farmId = currentFarm?.id;
  const isViewer = role === 'viewer';

  const toast = useToast();
  const { data: devices = [], isLoading, refetch } = useDevices(farmId);
  const { mutateAsync: registerDevice, isPending: isRegistering } = useRegisterDevice(farmId);

  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  // LineChart state for drawer
  const [metric, setMetric] = useState<MetricType>('soilMoisture');
  const [range, setRange] = useState<RangeType>('24h');

  // Device Detail drawer queries
  const hoursMap: Record<RangeType, number> = { '6h': 6, '24h': 24, '7d': 168 };
  const { data: latestReading, isLoading: latestLoading } = useDeviceLatest(
    selectedDevice?.id,
    farmId
  );
  const { data: historyData, isLoading: historyLoading } = useDeviceHistory(
    selectedDevice?.id,
    farmId,
    hoursMap[range]
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<RegisterDeviceFormValues>({
    resolver: zodResolver(registerDeviceSchema),
    defaultValues: {
      nodeId: 1,
      name: '',
      type: 'sensor_actuator',
      zone: 'Zone A',
      capabilities: ['soil_moisture', 'temperature', 'humidity', 'pump'],
    },
  });

  const selectedCapabilities = watch('capabilities') || [];

  const toggleCapability = (cap: string) => {
    if (selectedCapabilities.includes(cap)) {
      setValue(
        'capabilities',
        selectedCapabilities.filter((c) => c !== cap)
      );
    } else {
      setValue('capabilities', [...selectedCapabilities, cap]);
    }
  };

  const onRegisterSubmit = async (values: RegisterDeviceFormValues) => {
    try {
      await registerDevice({
        nodeId: values.nodeId,
        name: values.name,
        type: values.type,
        location: values.zone ? { zone: values.zone } : undefined,
        capabilities: values.capabilities,
      });

      toast.success('Device registered', `Successfully registered Node #${values.nodeId}!`);
      reset();
      setRegisterModalOpen(false);
      refetch();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 409) {
        toast.error(
          'Node ID Conflict',
          `Node ID ${values.nodeId} is already in use on this farm. Please select an unused Node ID (1-4).`
        );
      } else {
        const msg = err instanceof Error ? err.message : 'Failed to register device';
        toast.error('Registration Error', msg);
      }
    }
  };

  // Helper for relative time
  const formatRelativeTime = (dateStr?: string | null) => {
    if (!dateStr) return 'Never';
    const timestamp = new Date(dateStr).getTime();
    if (isNaN(timestamp)) return 'Never';
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 0) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const columns: Column<Device>[] = [
    {
      header: 'Node',
      accessor: (d) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs font-mono">
            #{d.nodeId}
          </div>
          <div>
            <span className="font-semibold text-slate-900 block">{d.name || `Device ${d.nodeId}`}</span>
            <span className="text-[11px] text-slate-400 font-mono">{d.id}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Type',
      accessor: (d) => (
        <span className="capitalize text-slate-600 font-medium text-xs">
          {(d.type || 'sensor').replace('_', ' ')}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (d) => <StatusBadge status={d.status} size="sm" />,
    },
    {
      header: 'Capabilities',
      accessor: (d) => (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {(d.capabilities || []).map((c) => (
            <span
              key={c}
              className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 font-mono"
            >
              {c}
            </span>
          ))}
        </div>
      ),
    },
    {
      header: 'Zone',
      accessor: (d) => (
        <span className="text-slate-600 text-xs flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          {d.location?.zone || 'Default'}
        </span>
      ),
    },
    {
      header: 'Last Seen',
      accessor: (d) => (
        <span className="text-slate-500 text-xs font-medium">
          {formatRelativeTime(d.lastSeenAt)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Devices & Sensors</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage LoRa / MQTT hardware nodes, view real-time telemetry and history charts.
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
              onClick={() => setRegisterModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Register Device</span>
            </button>
          )}
        </div>
      </div>

      {/* Devices DataTable */}
      <DataTable
        columns={columns}
        data={devices}
        keyExtractor={(d) => d.id}
        onRowClick={(d) => setSelectedDevice(d)}
        loading={isLoading}
        emptyMessage="No devices registered on this farm yet."
        emptyAction={
          !isViewer && (
            <button
              type="button"
              onClick={() => setRegisterModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 text-white text-xs font-semibold rounded-lg hover:bg-emerald-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register First Device</span>
            </button>
          )
        }
      />

      {/* Register Device Modal */}
      <Modal
        isOpen={registerModalOpen}
        onClose={() => {
          reset();
          setRegisterModalOpen(false);
        }}
        title="Register New Device"
        description="Add a hardware IoT sensor or actuator node to this farm."
        maxWidth="md"
      >
        <form onSubmit={handleSubmit(onRegisterSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Node ID (1 - 4)
              </label>
              <input
                type="number"
                min="1"
                max="4"
                {...register('nodeId')}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono font-bold"
              />
              {errors.nodeId && (
                <p className="mt-1 text-xs text-rose-500 font-medium">{errors.nodeId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Device Type
              </label>
              <select
                {...register('type')}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 capitalize"
              >
                <option value="sensor">Sensor Only</option>
                <option value="sensor_actuator">Sensor + Actuator</option>
                <option value="gateway">Gateway</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Device Name
            </label>
            <input
              {...register('name')}
              placeholder="e.g. Polyhouse Sensor Node 1"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-rose-500 font-medium">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Zone / Location
            </label>
            <input
              {...register('zone')}
              placeholder="e.g. North Plot / Zone A"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Capabilities
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_CAPABILITIES.map((cap) => {
                const isSelected = selectedCapabilities.includes(cap);
                return (
                  <button
                    key={cap}
                    type="button"
                    onClick={() => toggleCapability(cap)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer font-mono ${
                      isSelected
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cap}
                  </button>
                );
              })}
            </div>
            {errors.capabilities && (
              <p className="mt-1 text-xs text-rose-500 font-medium">
                {errors.capabilities.message}
              </p>
            )}
          </div>

          <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                reset();
                setRegisterModalOpen(false);
              }}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRegistering}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isRegistering && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span>Register Node</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Device Detail Drawer / Modal */}
      {selectedDevice && (
        <Modal
          isOpen={!!selectedDevice}
          onClose={() => setSelectedDevice(null)}
          title={selectedDevice.name || `Device ${selectedDevice.nodeId}`}
          description={`Node #${selectedDevice.nodeId} &bull; ${selectedDevice.id || ''}`}
          maxWidth="lg"
        >
          <div className="space-y-6">
            {/* Metadata Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedDevice.status} />
                <span className="text-slate-400">&bull;</span>
                <span className="text-slate-600 font-medium capitalize">
                  {(selectedDevice.type || 'sensor').replace('_', ' ')}
                </span>
                <span className="text-slate-400">&bull;</span>
                <span className="text-slate-600 font-medium">
                  {selectedDevice.location?.zone || 'Zone Default'}
                </span>
              </div>
              <div className="text-slate-500 font-mono text-[11px]">
                Last ping: {formatRelativeTime(selectedDevice.lastSeenAt)}
              </div>
            </div>

            {/* Latest Telemetry Cards */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Latest Telemetry
              </h4>
              {latestLoading ? (
                <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100 text-center">
                    <div className="flex justify-center text-blue-600 mb-1">
                      <Droplet className="w-4 h-4" />
                    </div>
                    <span className="text-xs text-blue-700 font-medium">Soil Moisture</span>
                    <div className="text-xl font-black text-blue-950 mt-0.5">
                      {latestReading?.soilMoisture !== null && latestReading?.soilMoisture !== undefined
                        ? `${latestReading.soilMoisture.toFixed(1)}%`
                        : '--'}
                    </div>
                  </div>

                  <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-100 text-center">
                    <div className="flex justify-center text-amber-600 mb-1">
                      <Thermometer className="w-4 h-4" />
                    </div>
                    <span className="text-xs text-amber-700 font-medium">Temperature</span>
                    <div className="text-xl font-black text-amber-950 mt-0.5">
                      {latestReading?.temperature !== null && latestReading?.temperature !== undefined
                        ? `${latestReading.temperature.toFixed(1)}°C`
                        : '--'}
                    </div>
                  </div>

                  <div className="bg-sky-50/60 p-3.5 rounded-xl border border-sky-100 text-center">
                    <div className="flex justify-center text-sky-600 mb-1">
                      <Wind className="w-4 h-4" />
                    </div>
                    <span className="text-xs text-sky-700 font-medium">Humidity</span>
                    <div className="text-xl font-black text-sky-950 mt-0.5">
                      {latestReading?.humidity !== null && latestReading?.humidity !== undefined
                        ? `${latestReading.humidity.toFixed(1)}%`
                        : '--'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Historical Trend LineChart with metric and range toggles */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Telemetry History
              </h4>
              <LineChart
                data={historyData?.readings || []}
                metric={metric}
                range={range}
                onMetricChange={setMetric}
                onRangeChange={setRange}
                loading={historyLoading}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
