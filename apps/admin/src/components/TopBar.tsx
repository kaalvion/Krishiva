import React from 'react';
import { Menu, LogOut, ShieldCheck, User as UserIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { type Farm } from '../types';
import { StatusBadge } from './StatusBadge';

interface TopBarProps {
  currentFarm?: Farm;
  onOpenSidebar: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ currentFarm, onOpenSidebar }) => {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between">
      {/* Left mobile menu toggle & farm title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="p-2 text-slate-600 hover:text-slate-900 rounded-lg lg:hidden hover:bg-slate-100 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {currentFarm && (
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">
              {currentFarm.name}
            </span>
            <span className="text-slate-300">&bull;</span>
            <span className="text-xs text-slate-500 font-medium">
              {currentFarm.cropType} ({currentFarm.areaAcres} acres)
            </span>
          </div>
        )}
      </div>

      {/* Right User profile & role badge & sign-out */}
      <div className="flex items-center gap-4">
        {currentFarm?.role && (
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-xs text-slate-500 font-medium hidden md:inline">
              Farm Role:
            </span>
            <StatusBadge status={currentFarm.role} size="sm" />
          </div>
        )}

        <div className="h-5 w-px bg-slate-200 hidden sm:block" />

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs uppercase shadow-xs">
            {user?.email && typeof user.email === 'string' && user.email.trim() ? (
              user.email.trim().charAt(0).toUpperCase()
            ) : (
              <UserIcon className="w-4 h-4" />
            )}
          </div>
          <span className="text-xs font-semibold text-slate-700 hidden md:block max-w-[160px] truncate">
            {user?.email || 'User'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => signOut()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          title="Sign out of Krishiva Console"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
};
