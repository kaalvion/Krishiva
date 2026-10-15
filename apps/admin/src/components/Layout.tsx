import React, { useState, useEffect } from 'react';
import { Outlet, useParams, useLocation } from 'react-router-dom';
import { useFarms } from '../hooks/useFarms';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { CreateFarmModal } from './CreateFarmModal';
import { ErrorBoundary } from './ErrorBoundary';
import { EmptyState } from './EmptyState';
import { Sprout, Plus } from 'lucide-react';

export const Layout: React.FC = () => {
  const { farmId } = useParams<{ farmId: string }>();
  const location = useLocation();
  const { data: farms = [], isLoading, isError, refetch } = useFarms();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createFarmOpen, setCreateFarmOpen] = useState(false);

  // Find active farm
  const currentFarm = farmId
    ? farms.find((f) => f.id === farmId)
    : farms.find((f) => f.id === localStorage.getItem('krishiva_selected_farmId')) || farms[0];

  useEffect(() => {
    if (farms.length > 0 && currentFarm) {
      localStorage.setItem('krishiva_selected_farmId', currentFarm.id);
      // If we are on root or /farms without subpage, redirect to /farms/:id/overview
      if (location.pathname === '/' || location.pathname === '/farms' && !location.pathname.startsWith('/farms/')) {
        // stay on /farms if directly navigated, else redirect
      }
    }
  }, [farms, currentFarm, location.pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-emerald-600/20 border-t-emerald-600 rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-600">Loading Krishiva workspace...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-md w-full text-center">
          <h2 className="text-lg font-bold text-slate-900 mb-2">Connection Error</h2>
          <p className="text-sm text-slate-500 mb-6">
            Unable to connect to the Krishiva backend API. Make sure the backend server is running on port 3000.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-800 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // If the user has no farms at all
  if (farms.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <EmptyState
            icon={Sprout}
            title="Create your first farm"
            description="You don't have access to any smart-farms yet. Create your first farm to start connecting IoT sensors and actuators."
            action={
              <button
                type="button"
                onClick={() => setCreateFarmOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 text-white rounded-xl text-sm font-semibold hover:bg-emerald-800 shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Farm</span>
              </button>
            }
          />
        </div>
        <CreateFarmModal isOpen={createFarmOpen} onClose={() => setCreateFarmOpen(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans">
      <Sidebar
        farms={farms}
        currentFarm={currentFarm}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenCreateFarm={() => setCreateFarmOpen(true)}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <TopBar
          currentFarm={currentFarm}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <ErrorBoundary fallbackFarmId={currentFarm?.id}>
            <Outlet context={{ currentFarm, role: currentFarm?.role }} />
          </ErrorBoundary>
        </main>
      </div>

      <CreateFarmModal isOpen={createFarmOpen} onClose={() => setCreateFarmOpen(false)} />
    </div>
  );
};
