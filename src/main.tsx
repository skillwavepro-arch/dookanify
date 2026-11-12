import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'অপ্রত্যাশিত ত্রুটি ঘটেছে',
    };
  }

  componentDidCatch(error: Error) {
    console.error('Dookanify ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
          <div className="max-w-md w-full bg-slate-800 border border-emerald-500/40 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <h2 className="text-xl font-extrabold text-amber-300">
              Dookanify পুনরায় লোড হচ্ছে
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              আপনার সকল হিসাব ও ডেটা ১০০% নিরাপদ আছে। নিচের বাটনে ক্লিক করে ড্যাশবোর্ডে ফিরে যান।
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, errorMessage: '' });
                window.location.reload();
              }}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm transition"
            >
              ড্যাশবোর্ডে ফিরে যান
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration optional in preview environments
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);

