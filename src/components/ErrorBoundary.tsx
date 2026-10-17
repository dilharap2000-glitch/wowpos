import React, { ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends (React.Component as any) {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#121212] border border-red-500/30 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase text-white tracking-wider">
                Application Error Encountered
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                {this.state.error?.message || 'An unexpected rendering error occurred.'}
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#FACC15] text-black text-xs font-black uppercase tracking-wider hover:bg-yellow-300 transition-all cursor-pointer shadow-lg shadow-[#FACC15]/20"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
