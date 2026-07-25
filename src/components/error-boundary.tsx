'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#080a12] flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Something went wrong</h2>
            <p className="text-sm text-slate-400">
              An unexpected error occurred. This has been logged.
              Click the button below to reload the dashboard.
            </p>
            {this.state.error && (
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-left">
                <p className="text-[11px] text-red-400 font-mono break-all">{this.state.error.message}</p>
              </div>
            )}
            <Button onClick={this.handleReload} className="bg-emerald-600 hover:bg-emerald-500 text-white">
              <RefreshCw className="w-4 h-4 mr-2" /> Reload Dashboard
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
