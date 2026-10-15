import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackFarmId?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Krishiva Admin ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    const farmId = this.props.fallbackFarmId || localStorage.getItem('krishiva_selected_farmId');
    if (farmId) {
      window.location.href = `/farms/${farmId}/overview`;
    } else {
      window.location.href = '/farms';
    }
  };

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-rose-200 p-8 shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200">
              <AlertTriangle className="w-7 h-7 stroke-[2]" />
            </div>

            <h2 className="text-xl font-black text-slate-900">Something went wrong</h2>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              An unexpected runtime error occurred while rendering this view.
            </p>

            {this.state.error?.message && (
              <div className="p-3.5 mb-6 bg-slate-900 text-rose-300 font-mono text-xs rounded-xl text-left overflow-x-auto max-h-36 border border-slate-800">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Go to Overview</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
