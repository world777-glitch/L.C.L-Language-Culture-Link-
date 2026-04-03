import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isQuotaError = this.state.error?.message.includes('quota-exceeded') || 
                          this.state.error?.message.includes('Quota exceeded');

      return (
        <div className="min-h-screen bg-paper flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-2xl border border-ink/5 text-center space-y-8">
            <div className="w-20 h-20 bg-gold/10 text-gold rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={40} />
            </div>
            
            <div className="space-y-4">
              <h2 className="font-serif text-2xl font-bold text-ink">
                {isQuotaError ? 'Daily Limit Reached' : 'Something went wrong'}
              </h2>
              <p className="text-sm opacity-60 leading-relaxed">
                {isQuotaError 
                  ? 'The application has reached its daily free tier limit for Firebase. It will automatically reset at 00:00 UTC (09:00 KST).'
                  : 'An unexpected error occurred. Please try refreshing the page or contact support if the issue persists.'}
              </p>
              {this.state.error && !isQuotaError && (
                <div className="p-4 bg-ink/5 rounded-xl text-left overflow-auto max-h-32">
                  <code className="text-[10px] font-mono opacity-50 break-all">
                    {this.state.error.message}
                  </code>
                </div>
              )}
            </div>

            <button
              onClick={this.handleReset}
              className="w-full py-4 bg-ink text-paper rounded-full text-xs uppercase tracking-widest font-bold hover:scale-105 transition-transform flex items-center justify-center gap-2"
            >
              <RefreshCw size={14} />
              Refresh Application
            </button>
            
            <p className="text-[10px] uppercase tracking-widest opacity-40">
              Language & Culture Link
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
