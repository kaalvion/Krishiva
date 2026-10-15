import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  type Farm,
  type FarmRole,
} from '../types';
import {
  useDevices,
  useAlerts,
  useCommands,
  useHeatmap,
} from '../hooks';
import { StatCard } from '../components/StatCard';
import { FieldHeatmap } from '../components/FieldHeatmap';
import { StatusBadge } from '../components/StatusBadge';
import {
  Cpu,
  Wifi,
  WifiOff,
  Bell,
  Zap,
  Droplet,
  Thermometer,
  Wind,
  RefreshCw,
  ArrowRight,
  Clock,
} from 'lucide-react';

export const Overview: React.FC = () => {
  const { currentFarm } = useOutletContext<{ currentFarm: Farm; role: FarmRole }>();
  const farmId = currentFarm?.id;

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const {
    data: devices = [],
    isLoading: devicesLoading,
    refetch: refetchDevices,
  } = useDevices(farmId);

  const {
    data: alertsData,
    isLoading: alertsLoading,
    refetch: refetchAlerts,
  } = useAlerts(farmId, { limit: 10 }, { refetchInterval: 15000 });

  const {
    data: commands = [],
    isLoading: commandsLoading,
    refetch: refetchCommands,
  } = useCommands(farmId, 50, 15000);

  const {
    data: heatmapData,
    isLoading: heatmapLoading,
    refetch: refetchHeatmap,
  } = useHeatmap(farmId, 15000);

  // Manual & automated refresh tracker
  const handleRefreshAll = () => {
    refetchDevices();
    refetchAlerts();
    refetchCommands();
    refetchHeatmap();
    setLastUpdated(new Date());
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdated(new Date());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Compute stat metrics
  const totalDevices = devices.length;
  const onlineDevices = devices.filter((d) => d.status === 'online').length;
  const offlineDevices = devices.filter((d) => d.status === 'offline').length;
  const activeAlertsCount = alertsData?.unacknowledgedCount ?? 0;

  // Commands in last 24h
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const commandsLast24h = (commands || []).filter((c) => {
    if (!c?.createdAt) return false;
    const t = new Date(c.createdAt).getTime();
    return !isNaN(t) && t >= dayAgo;
  }).length;

  // Averages from heatmap cells with telemetry
  const cells = heatmapData?.cells || [];
  const cellsWithMoisture = cells.filter((c) => typeof c.soilMoisture === 'number');
  const cellsWithTemp = cells.filter((c) => typeof c.temperature === 'number');
  const cellsWithHumidity = cells.filter((c) => typeof c.humidity === 'number');

  const avgSoilMoisture =
    cellsWithMoisture.length > 0
      ? cellsWithMoisture.reduce((sum, c) => sum + (c.soilMoisture || 0), 0) /
        cellsWithMoisture.length
      : null;

  const avgTemp =
    cellsWithTemp.length > 0
      ? cellsWithTemp.reduce((sum, c) => sum + (c.temperature || 0), 0) / cellsWithTemp.length
      : null;

  const avgHumidity =
    cellsWithHumidity.length > 0
      ? cellsWithHumidity.reduce((sum, c) => sum + (c.humidity || 0), 0) /
        cellsWithHumidity.length
      : null;

  // Status color for soil moisture card (<=15 red, <=25 orange, <=60 green, >60 blue)
  let soilMoistureBorder = 'border-l-slate-400';
  let soilMoistureBadgeText = 'No data';
  let soilMoistureBadgeClass = 'bg-slate-100 text-slate-600';

  if (avgSoilMoisture !== null) {
    if (avgSoilMoisture <= 15) {
      soilMoistureBorder = 'border-l-red-500';
      soilMoistureBadgeText = 'Critical Dry';
      soilMoistureBadgeClass = 'bg-red-50 text-red-700 border-red-200';
    } else if (avgSoilMoisture <= 25) {
      soilMoistureBorder = 'border-l-orange-500';
      soilMoistureBadgeText = 'Low Moisture';
      soilMoistureBadgeClass = 'bg-orange-50 text-orange-700 border-orange-200';
    } else if (avgSoilMoisture <= 60) {
      soilMoistureBorder = 'border-l-emerald-600';
      soilMoistureBadgeText = 'Optimal';
      soilMoistureBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else {
      soilMoistureBorder = 'border-l-blue-600';
      soilMoistureBadgeText = 'High/Saturated';
      soilMoistureBadgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
    }
  }

  const recentAlerts = (alertsData?.alerts || []).slice(0, 5);
  const recentCommands = commands.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Banner with Farm Name, Crop & Refresh status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              {currentFarm?.name} Overview
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              {currentFarm?.cropType}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {currentFarm?.areaAcres} Acres &bull; Timezone: {currentFarm?.timezone}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-xs">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Updated {lastUpdated.toLocaleTimeString()}</span>
          </div>

          <button
            type="button"
            onClick={handleRefreshAll}
            className="p-2 text-slate-600 hover:text-emerald-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200/80 shadow-xs transition-colors cursor-pointer"
            title="Refresh now"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Row 1: High Level Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          title="Total Devices"
          value={totalDevices}
          subtitle="Registered nodes"
          icon={<Cpu className="w-4 h-4" />}
          loading={devicesLoading}
        />
        <StatCard
          title="Online Nodes"
          value={onlineDevices}
          subtitle="Heartbeat active"
          icon={<Wifi className="w-4 h-4 text-emerald-600" />}
          statusBorderColor="border-l-emerald-500"
          loading={devicesLoading}
        />
        <StatCard
          title="Offline Nodes"
          value={offlineDevices}
          subtitle="No recent ping"
          icon={<WifiOff className="w-4 h-4 text-rose-500" />}
          statusBorderColor={offlineDevices > 0 ? 'border-l-rose-500' : undefined}
          loading={devicesLoading}
        />
        <StatCard
          title="Active Alerts"
          value={activeAlertsCount}
          subtitle="Unacknowledged"
          icon={<Bell className="w-4 h-4 text-amber-500" />}
          statusBorderColor={activeAlertsCount > 0 ? 'border-l-amber-500' : undefined}
          loading={alertsLoading}
        />
        <StatCard
          title="Commands (24h)"
          value={commandsLast24h}
          subtitle="Actuator operations"
          icon={<Zap className="w-4 h-4 text-blue-500" />}
          loading={commandsLoading}
        />
      </div>

      {/* Row 2: Average Environmental Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className={`bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs border-l-4 ${soilMoistureBorder}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Avg Soil Moisture
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Droplet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">
              {avgSoilMoisture !== null ? `${avgSoilMoisture.toFixed(1)}%` : '--'}
            </span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${soilMoistureBadgeClass}`}>
              {soilMoistureBadgeText}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Across all field sensor nodes</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Avg Temperature
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Thermometer className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">
              {avgTemp !== null ? `${avgTemp.toFixed(1)}°C` : '--'}
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Ambient
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Crop canopy ambient temperature</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs border-l-4 border-l-sky-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Avg Humidity
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Wind className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">
              {avgHumidity !== null ? `${avgHumidity.toFixed(1)}%` : '--'}
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Relative
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Atmospheric relative humidity</p>
        </div>
      </div>

      {/* Row 3: Hand-drawn SVG Field Heatmap */}
      <FieldHeatmap cells={cells} loading={heatmapLoading} />

      {/* Row 4: Recent Commands + Recent Alerts Mini Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Commands */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900">Recent Actuator Commands</h3>
              </div>
              <Link
                to={`/farms/${farmId}/commands`}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentCommands.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No recent actuator commands.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentCommands.map((cmd) => (
                  <div key={cmd.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 font-mono">
                          {cmd.action}
                        </span>
                        {cmd.durationSeconds && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({cmd.durationSeconds}s)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        Device: {cmd.deviceId} &bull; By: {cmd.requestedBy}
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-1">
                      <StatusBadge status={cmd.status} size="sm" />
                      <span className="text-[10px] text-slate-400">
                        {cmd.createdAt && !isNaN(new Date(cmd.createdAt).getTime())
                          ? new Date(cmd.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">Active Alerts</h3>
              </div>
              <Link
                to={`/farms/${farmId}/alerts`}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentAlerts.length === 0 ? (
              <p className="text-xs text-emerald-700 py-6 text-center font-medium">
                ✓ No active alerts. All systems healthy.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentAlerts.map((alert) => (
                  <div key={alert.id} className="py-2.5 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={alert.severity} size="sm" />
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {alert.type ? alert.type.replace(/_/g, ' ') : 'System Alert'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 line-clamp-1">{alert.message || 'Alert triggered'}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">
                      {alert.createdAt && !isNaN(new Date(alert.createdAt).getTime())
                        ? new Date(alert.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
