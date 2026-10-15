import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFarms } from '../hooks/useFarms';
import { type Farm } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { CreateFarmModal } from '../components/CreateFarmModal';
import {
  Plus,
  MapPin,
  Clock,
  ArrowRight,
  Sprout,
} from 'lucide-react';

export const Farms: React.FC = () => {
  const { data: farms = [], isLoading } = useFarms();
  const navigate = useNavigate();
  const [createFarmOpen, setCreateFarmOpen] = useState(false);

  const handleSelectFarm = (farm: Farm) => {
    localStorage.setItem('krishiva_selected_farmId', farm.id);
    navigate(`/farms/${farm.id}/overview`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">All Farms</h1>
          <p className="text-xs text-slate-500 mt-1">
            Overview of all smart-farms and agricultural installations you manage or collaborate on.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateFarmOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Farm</span>
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : farms.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
          <Sprout className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No farms registered</h3>
          <p className="text-xs text-slate-500 mt-1 mb-5">
            Create your first smart-farm to begin connecting IoT devices.
          </p>
          <button
            type="button"
            onClick={() => setCreateFarmOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs hover:bg-emerald-800 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Farm</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {farms.map((farm) => (
            <div
              key={farm.id}
              onClick={() => handleSelectFarm(farm)}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer group hover:border-emerald-600/40"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    <Sprout className="w-5 h-5 stroke-[2]" />
                  </div>
                  <StatusBadge status={farm.role} size="sm" />
                </div>

                <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  {farm.name}
                </h3>
                <span className="inline-block mt-0.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {farm.cropType} &bull; {farm.areaAcres} Acres
                </span>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {typeof farm.location?.lat === 'number' && typeof farm.location?.lng === 'number'
                        ? `${farm.location.lat.toFixed(4)}, ${farm.location.lng.toFixed(4)}`
                        : 'Coordinates not set'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono text-[11px]">{farm.timezone}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700 group-hover:text-emerald-800">
                <span>Open Dashboard</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateFarmModal isOpen={createFarmOpen} onClose={() => setCreateFarmOpen(false)} />
    </div>
  );
};
