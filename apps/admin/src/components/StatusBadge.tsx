import React from 'react';

export type StatusBadgeVariant =
  | 'online'
  | 'offline'
  | 'maintenance'
  | 'pending'
  | 'published'
  | 'acknowledged'
  | 'failed'
  | 'expired'
  | 'critical'
  | 'warning'
  | 'info'
  | 'owner'
  | 'admin'
  | 'viewer'
  | 'success'
  | 'neutral';

interface StatusBadgeProps {
  status?: string | null;
  variant?: StatusBadgeVariant;
  label?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant,
  label,
  size = 'md',
}) => {
  const rawStatus = typeof status === 'string' ? status : '';
  const rawVariant = typeof variant === 'string' ? variant : '';
  const normStatus = (rawVariant || rawStatus || 'neutral').toLowerCase();

  let styles = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';

  if (normStatus === 'online' || normStatus === 'acknowledged' || normStatus === 'success') {
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    dotColor = 'bg-emerald-500';
  } else if (normStatus === 'published') {
    styles = 'bg-blue-50 text-blue-700 border-blue-200';
    dotColor = 'bg-blue-500';
  } else if (normStatus === 'pending') {
    styles = 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse';
    dotColor = 'bg-amber-500';
  } else if (normStatus === 'offline' || normStatus === 'failed' || normStatus === 'critical') {
    styles = 'bg-rose-50 text-rose-700 border-rose-200';
    dotColor = 'bg-rose-500';
  } else if (normStatus === 'warning' || normStatus === 'maintenance') {
    styles = 'bg-amber-50 text-amber-700 border-amber-200';
    dotColor = 'bg-amber-500';
  } else if (normStatus === 'info') {
    styles = 'bg-sky-50 text-sky-700 border-sky-200';
    dotColor = 'bg-sky-500';
  } else if (normStatus === 'expired') {
    styles = 'bg-slate-100 text-slate-600 border-slate-200';
    dotColor = 'bg-slate-400';
  } else if (normStatus === 'owner') {
    styles = 'bg-purple-50 text-purple-700 border-purple-200';
    dotColor = 'bg-purple-500';
  } else if (normStatus === 'admin') {
    styles = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold';
    dotColor = 'bg-emerald-600';
  } else if (normStatus === 'viewer') {
    styles = 'bg-slate-100 text-slate-600 border-slate-200';
    dotColor = 'bg-slate-400';
  }

  const displayLabel =
    label ||
    (rawStatus
      ? rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1)
      : rawVariant
      ? rawVariant.charAt(0).toUpperCase() + rawVariant.slice(1)
      : 'Neutral');
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${sizeClass} ${styles}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{displayLabel}</span>
    </span>
  );
};
