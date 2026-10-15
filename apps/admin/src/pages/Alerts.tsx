import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  type Farm,
  type FarmRole,
  type AlertItem,
  type AlertType,
} from '../types';
import {
  useAlerts,
  useAcknowledgeAlert,
  useAcknowledgeAllAlerts,
} from '../hooks';
import { DataTable, type Column } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  Bell,
  CheckCircle2,
  CheckCheck,
  ShieldAlert,
  RotateCw,
} from 'lucide-react';

export const ALERT_TYPE_TITLES: Record<string, string> = {
  SOIL_MOISTURE_CRITICAL: 'Critical Low Soil Moisture',
  SOIL_MOISTURE_LOW: 'Low Soil Moisture Warning',
  TEMPERATURE_HIGH: 'High Ambient Temperature Alert',
  HUMIDITY_HIGH: 'High Relative Humidity Alert',
  DEVICE_OFFLINE: 'Hardware Node Offline Alert',
};

export function getAlertTitle(type?: AlertType | null): string {
  if (!type || typeof type !== 'string') return 'System Alert';
  if (ALERT_TYPE_TITLES[type]) return ALERT_TYPE_TITLES[type];
  return type
    .split('_')
    .filter(Boolean)
    .map((word) => word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : '')
    .join(' ') || 'System Alert';
}

export const Alerts: React.FC = () => {
  const { currentFarm, role } = useOutletContext<{ currentFarm: Farm; role: FarmRole }>();
  const farmId = currentFarm?.id;
  const isViewer = role === 'viewer';
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [confirmAllOpen, setConfirmAllOpen] = useState(false);

  // Queries for active vs historical
  const isHistorical = activeTab === 'history';
  const {
    data: alertsData,
    isLoading,
    refetch,
  } = useAlerts(
    farmId,
    { acknowledged: isHistorical ? true : false, limit: 50 },
    { refetchInterval: 15000 }
  );

  const { mutateAsync: ackAlert, isPending: isAcking } = useAcknowledgeAlert(farmId);
  const { mutateAsync: ackAll, isPending: isAckingAll } = useAcknowledgeAllAlerts(farmId);

  const alerts = alertsData?.alerts || [];
  const unacknowledgedCount = alertsData?.unacknowledgedCount ?? 0;

  const handleAcknowledge = async (alert: AlertItem) => {
    if (isViewer) return;
    try {
      await ackAlert(alert.id);
      toast.success('Alert Acknowledged', `Resolved alert: ${getAlertTitle(alert.type)}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to acknowledge alert';
      toast.error('Acknowledge Error', msg);
    }
  };

  const handleAcknowledgeAll = async () => {
    if (isViewer) return;
    try {
      setConfirmAllOpen(false);
      const res = await ackAll();
      toast.success(
        'All Alerts Acknowledged',
        `Successfully acknowledged ${res.acknowledgedCount} alerts.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to acknowledge alerts';
      toast.error('Acknowledge All Error', msg);
    }
  };

  const columns: Column<AlertItem>[] = [
    {
      header: 'Severity',
      accessor: (a) => <StatusBadge status={a.severity} size="sm" />,
      className: 'w-24',
    },
    {
      header: 'Type & Description',
      accessor: (a) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-slate-900">{getAlertTitle(a.type)}</span>
            <span className="text-[10px] font-mono text-slate-400 font-semibold">{a.type}</span>
          </div>
          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{a.message}</p>
        </div>
      ),
    },
    {
      header: 'Device',
      accessor: (a) => (
        <div>
          <span className="text-xs font-semibold text-slate-800 block">
            {a.deviceName || `Device ${a.deviceId}`}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">{a.deviceId}</span>
        </div>
      ),
    },
    {
      header: 'Metrics & Values',
      accessor: (a) => (
        <div>
          {typeof a.value === 'number' && (
            <span className="text-xs font-mono font-bold text-slate-800 block">
              Value: {a.value.toFixed(1)}
            </span>
          )}
          {typeof a.threshold === 'number' && (
            <span className="text-[10px] text-slate-400 font-mono">
              Threshold: {a.threshold.toFixed(1)}
            </span>
          )}
          {a.value === null || a.value === undefined ? (
            <span className="text-xs text-slate-400">--</span>
          ) : null}
        </div>
      ),
    },
    {
      header: 'Time',
      accessor: (a) => {
        const d = a.createdAt ? new Date(a.createdAt) : null;
        const valid = d && !isNaN(d.getTime());
        return (
          <div>
            <span className="text-xs text-slate-700 font-medium block">
              {valid ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
            </span>
            <span className="text-[10px] text-slate-400">
              {valid ? d.toLocaleDateString() : '-'}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Action',
      accessor: (a) => {
        if (a.acknowledged) {
          const d = a.acknowledgedAt ? new Date(a.acknowledgedAt) : null;
          const valid = d && !isNaN(d.getTime());
          return (
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Acknowledged</span>
              </span>
              {valid && (
                <span className="block text-[10px] text-slate-400">
                  {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          );
        }

        if (isViewer) {
          return <span className="text-xs text-slate-400">Read-only</span>;
        }

        return (
          <div className="text-right">
            <button
              type="button"
              disabled={isAcking}
              onClick={() => handleAcknowledge(a)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Acknowledge</span>
            </button>
          </div>
        );
      },
      className: 'w-36 text-right',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">System Alerts</h1>
            {unacknowledgedCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white animate-pulse">
                {unacknowledgedCount} unacknowledged
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time threshold violations, critical soil dryness, and device offline notifications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => refetch()}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Refresh alerts"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {!isViewer && unacknowledgedCount > 0 && activeTab === 'active' && (
            <button
              type="button"
              disabled={isAckingAll}
              onClick={() => setConfirmAllOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Acknowledge All ({unacknowledgedCount})</span>
            </button>
          )}

          {isViewer && (
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs">
              <ShieldAlert className="w-4 h-4 text-slate-500" />
              <span>Viewer Role (Read-only)</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'active'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Active Alerts</span>
          {unacknowledgedCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'active'
                  ? 'bg-emerald-800 text-white'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
              {unacknowledgedCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Alert History (Acknowledged)</span>
        </button>
      </div>

      {/* Alerts DataTable */}
      <DataTable
        columns={columns}
        data={alerts}
        keyExtractor={(a) => a.id}
        loading={isLoading}
        emptyMessage={
          activeTab === 'active'
            ? '✓ No active alerts! All sensors and environmental parameters are within safe ranges.'
            : 'No historical acknowledged alerts found.'
        }
      />

      {/* Acknowledge All Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmAllOpen}
        onCancel={() => setConfirmAllOpen(false)}
        onConfirm={handleAcknowledgeAll}
        title="Acknowledge All Alerts"
        message={`Are you sure you want to acknowledge and clear all ${unacknowledgedCount} unacknowledged alerts for this farm?`}
        confirmText="Acknowledge All"
        loading={isAckingAll}
      />
    </div>
  );
};
