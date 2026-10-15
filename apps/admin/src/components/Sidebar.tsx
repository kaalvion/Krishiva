import React from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Cpu,
  Zap,
  CalendarClock,
  Bell,
  Users,
  Building2,
  ChevronDown,
  Plus,
  Sprout,
  X,
} from 'lucide-react';
import { type Farm } from '../types';
import { useUnacknowledgedAlertsCount } from '../hooks/useAlerts';
import { StatusBadge } from './StatusBadge';

interface SidebarProps {
  farms: Farm[];
  currentFarm?: Farm;
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateFarm: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  farms,
  currentFarm,
  isOpen,
  onClose,
  onOpenCreateFarm,
}) => {
  const { farmId } = useParams<{ farmId: string }>();
  const navigate = useNavigate();
  const [farmDropdownOpen, setFarmDropdownOpen] = React.useState(false);

  const activeFarmId = farmId || currentFarm?.id;
  const { data: unreadAlertsCount = 0 } = useUnacknowledgedAlertsCount(activeFarmId);

  const handleSelectFarm = (selected: Farm) => {
    localStorage.setItem('krishiva_selected_farmId', selected.id);
    setFarmDropdownOpen(false);
    onClose();

    // Preserve current subpage or default to overview
    const currentPath = window.location.pathname;
    const parts = currentPath.split('/');
    const subpage = parts.length > 3 ? parts.slice(3).join('/') : 'overview';
    navigate(`/farms/${selected.id}/${subpage}`);
  };

  const navItems = [
    {
      label: 'Overview',
      path: activeFarmId ? `/farms/${activeFarmId}/overview` : '/farms',
      icon: LayoutDashboard,
    },
    {
      label: 'Devices',
      path: activeFarmId ? `/farms/${activeFarmId}/devices` : '/farms',
      icon: Cpu,
    },
    {
      label: 'Commands',
      path: activeFarmId ? `/farms/${activeFarmId}/commands` : '/farms',
      icon: Zap,
    },
    {
      label: 'Schedules',
      path: activeFarmId ? `/farms/${activeFarmId}/schedules` : '/farms',
      icon: CalendarClock,
    },
    {
      label: 'Alerts',
      path: activeFarmId ? `/farms/${activeFarmId}/alerts` : '/farms',
      icon: Bell,
      badge: unreadAlertsCount > 0 ? unreadAlertsCount : undefined,
    },
    {
      label: 'Members',
      path: activeFarmId ? `/farms/${activeFarmId}/members` : '/farms',
      icon: Users,
    },
    {
      label: 'All Farms',
      path: '/farms',
      icon: Building2,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-100 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } border-r border-slate-800`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-700 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-900/40">
              <Sprout className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white block leading-tight">
                Krishiva
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">
                Admin Console
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white lg:hidden rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Farm Switcher Dropdown */}
        <div className="p-4 border-b border-slate-800/80">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1 mb-1.5 block">
            Active Farm
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setFarmDropdownOpen(!farmDropdownOpen)}
              className="w-full flex items-center justify-between p-2.5 bg-slate-800/80 hover:bg-slate-800 text-left rounded-xl border border-slate-700/60 transition-colors cursor-pointer group"
            >
              <div className="min-w-0 pr-2">
                <span className="text-sm font-semibold text-white truncate block">
                  {currentFarm?.name || 'Select Farm'}
                </span>
                <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <span>{currentFarm?.cropType || 'Krishiva IoT'}</span>
                  {currentFarm?.role && (
                    <span className="capitalize text-emerald-400 font-medium">
                      ({currentFarm.role})
                    </span>
                  )}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                  farmDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {farmDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 py-1.5 overflow-hidden animate-in fade-in zoom-in-95">
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-700/50">
                  {farms.map((farm) => (
                    <button
                      key={farm.id}
                      type="button"
                      onClick={() => handleSelectFarm(farm)}
                      className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between hover:bg-slate-700/60 transition-colors cursor-pointer ${
                        farm.id === activeFarmId ? 'bg-slate-700/40 text-emerald-400' : 'text-slate-200'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="font-semibold truncate">{farm.name}</div>
                        <div className="text-[10px] text-slate-400">{farm.cropType}</div>
                      </div>
                      <StatusBadge status={farm.role} size="sm" />
                    </button>
                  ))}
                </div>

                <div className="p-1.5 border-t border-slate-700/70">
                  <button
                    type="button"
                    onClick={() => {
                      setFarmDropdownOpen(false);
                      onOpenCreateFarm();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Farm</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.label}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-xs font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 stroke-[2]" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white animate-pulse">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500 text-center">
          Krishiva IoT Platform &bull; v1.0
        </div>
      </aside>
    </>
  );
};
