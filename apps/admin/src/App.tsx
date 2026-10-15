import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { missingEnvVars } from './config/env';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import { Layout } from './components/Layout';
import {
  Login,
  Overview,
  Devices,
  Commands,
  Schedules,
  Alerts,
  Members,
  Farms,
} from './pages';
import { AlertTriangle, Terminal } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Protected route wrapper requiring authenticated Firebase session.
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-emerald-600/20 border-t-emerald-600 rounded-full animate-spin mb-3" />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Authenticating Session...
        </span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

/**
 * Full page missing environment configuration screen.
 */
const MissingConfigScreen: React.FC<{ missing: string[] }> = ({ missing }) => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-slate-800 rounded-3xl border border-slate-700 p-8 shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4 border border-rose-500/20">
          <AlertTriangle className="w-6 h-6 stroke-[2]" />
        </div>
        <h1 className="text-xl font-black text-white">Missing Environment Configuration</h1>
        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
          The Krishiva Admin Console cannot start because the following required environment
          variables are missing from <code className="text-emerald-400 font-mono">apps/admin/.env.local</code>:
        </p>

        <div className="my-5 p-4 rounded-xl bg-slate-950/80 border border-slate-700/80 font-mono text-xs text-rose-300 space-y-1">
          {missing.map((key) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-rose-500">&bull;</span>
              <span>{key}</span>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300 flex items-start gap-3">
          <Terminal className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
          <p>
            Copy <code className="text-white font-mono">apps/admin/.env.example</code> to{' '}
            <code className="text-white font-mono">apps/admin/.env.local</code> and populate the
            values, then restart or reload Vite.
          </p>
        </div>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  if (missingEnvVars.length > 0) {
    return <MissingConfigScreen missing={missingEnvVars} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/farms" replace />} />
                <Route path="farms" element={<Farms />} />
                <Route path="farms/:farmId" element={<Navigate to="overview" replace />} />
                <Route path="farms/:farmId/overview" element={<Overview />} />
                <Route path="farms/:farmId/devices" element={<Devices />} />
                <Route path="farms/:farmId/commands" element={<Commands />} />
                <Route path="farms/:farmId/schedules" element={<Schedules />} />
                <Route path="farms/:farmId/alerts" element={<Alerts />} />
                <Route path="farms/:farmId/members" element={<Members />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
