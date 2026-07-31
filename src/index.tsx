import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LanguageProvider } from './i18n';
import { AuthProvider } from './contexts/AuthContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}



interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);

    // Auto-reload once on stale chunk errors (safety net complementing lazyRetry)
    const isChunkError = /Failed to fetch dynamically imported module|Loading chunk|Loading CSS chunk/i.test(error.message);
    const reloadKey = 'errorBoundary-reloaded';
    if (isChunkError && !sessionStorage.getItem(reloadKey)) {
      sessionStorage.setItem(reloadKey, '1');
      window.location.reload();
    } else {
      sessionStorage.removeItem(reloadKey);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#fdf8f6] p-4 text-center text-[#59372f] font-sans">
          <div className="max-w-md bg-white p-6 rounded-2xl shadow-lg border border-[#eadbd6]">
            <h1 className="text-2xl font-bold text-[#9b4f40] mb-2">Não foi possível carregar esta tela</h1>
            <p className="text-[#76564e] mb-4 text-sm">
              Seus dados continuam seguros. Recarregue o app para tentar novamente.
            </p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-[#9b4f40] text-white rounded-xl hover:bg-[#873f32] transition-colors">
              Recarregar app
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
