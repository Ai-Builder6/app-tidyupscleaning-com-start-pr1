import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { APIProvider } from '@vis.gl/react-google-maps';
import App from './App.tsx';
import { CustomerPortalView } from './components/CustomerPortalView';
import {
  saveClientToFirestore,
  saveQuoteToFirestore,
  saveScheduledVisitToFirestore,
} from './services/firestoreSyncService';
import './index.css';

function isDedicatedCustomerBookingRoute(): boolean {
  if (typeof window === 'undefined') return false;
  const host = (window.location.hostname || '').toLowerCase();
  const path = (window.location.pathname || '').toLowerCase();
  const search = (window.location.search || '').toLowerCase();
  if (
    (window as any).__FORCE_CUSTOMER_BOOKING_ONLY__ ||
    path === '/book' ||
    path.startsWith('/book/') ||
    path === '/customer-booking' ||
    path.startsWith('/customer-booking/') ||
    search.includes('mode=customer') ||
    search.includes('booking=1') ||
    host.startsWith('book.') ||
    host.includes('book.tidyupscleaning')
  ) {
    return true;
  }
  return false;
}

const StandaloneCustomerBookingPage: React.FC = () => {
  const apiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyC4kxdVgVTNm5ppd8IuK7rqq-Rz_EV31Ns';
  return (
    <APIProvider
      apiKey={apiKey}
      region="CA"
      language="en"
      solutionChannel="gmp_mcp_codeassist_v1_aistudio"
    >
      <div className="w-screen h-screen overflow-y-auto overflow-x-hidden bg-slate-50 text-slate-900 font-sans">
        <CustomerPortalView
          projectId="tidyups"
          isStandaloneCustomerSite={true}
          onBookingSubmitted={(_ticket, fullPayload) => {
            if (fullPayload?.client) {
              saveClientToFirestore(fullPayload.client).catch(() => {});
            }
            if (fullPayload?.quote) {
              saveQuoteToFirestore(fullPayload.quote).catch(() => {});
            }
            if (fullPayload?.visit) {
              saveScheduledVisitToFirestore(fullPayload.visit).catch(() => {});
            }
          }}
        />
      </div>
    </APIProvider>
  );
};

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMsg: string; retried: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMsg: '', retried: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMsg: error?.message || String(error) };
  }

  componentDidCatch(error: Error) {
    console.warn('RootErrorBoundary caught error, clearing stale local cache:', error);
    try {
      localStorage.removeItem('tidyups_dispatch_data');
      localStorage.removeItem('dispatchgeeni_dispatch_data');
      localStorage.removeItem('easycleans_dispatch_data');
    } catch {
      // ignore storage errors
    }
    if (!this.state.retried) {
      this.setState({ hasError: false, retried: true });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-extrabold text-white mb-2">Refreshing Application Cache</h2>
            <p className="text-xs text-slate-300 mb-4">
              A new update was published. Click below to reload with the latest live version.
            </p>
            <button
              onClick={() => {
                try {
                  localStorage.clear();
                } catch {}
                window.location.reload();
              }}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs cursor-pointer shadow-lg"
            >
              Reload Live Website Now
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Early interceptor for Google Maps JavaScript API authentication & target blocked errors, plus quota and referrer limits
if (typeof window !== 'undefined') {
  (window as any).gm_authFailure = () => {
    console.warn('Google Maps API Auth Notice (gm_authFailure). Enabling interactive fallback territory map.');
    window.dispatchEvent(new CustomEvent('google-maps-auth-failure'));
  };

  const origError = console.error;
  console.error = (...args: unknown[]) => {
    const msg = args
      .map((a) => {
        if (typeof a === 'object' && a !== null) {
          try {
            return JSON.stringify(a);
          } catch {
            return String(a);
          }
        }
        return String(a);
      })
      .join(' ');

    if (
      msg.includes('RefererNotAllowedMapError') ||
      msg.includes('ApiTargetBlockedMapError') ||
      msg.includes('ApiProjectMapError') ||
      msg.includes('InvalidKeyMapError')
    ) {
      window.dispatchEvent(new CustomEvent('google-maps-auth-failure'));
      return;
    }

    if (
      msg.includes('OverQuotaMapError') ||
      msg.includes('QuotaExceededError') ||
      msg.includes('API_KEY_HTTP_REFERRER_BLOCKED') ||
      msg.includes('requests-from-referer') ||
      msg.includes('auth/unauthorized-domain') ||
      msg.includes('type.googleapis.com/google.rpc.ErrorInfo') ||
      msg.includes('ErrorInfo')
    ) {
      return;
    }

    origError.apply(console, args);
  };

  window.addEventListener('error', (event: ErrorEvent) => {
    const message = event.message || '';
    const filename = event.filename || '';
    if (
      message.includes('Cannot redefine property: ethereum') ||
      message.includes('Cannot redefine property') ||
      filename.startsWith('chrome-extension://') ||
      filename.startsWith('moz-extension://')
    ) {
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
      return;
    }
    if (
      message.includes('ApiTargetBlockedMapError') ||
      message.includes('ApiProjectMapError') ||
      message.includes('RefererNotAllowedMapError') ||
      message.includes('InvalidKeyMapError')
    ) {
      window.dispatchEvent(new CustomEvent('google-maps-auth-failure'));
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
    }
  }, true);

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason?.message || String(event.reason || '');
    if (
      reason.includes('Cannot redefine property: ethereum') ||
      reason.includes('Cannot redefine property') ||
      reason.includes('chrome-extension://') ||
      reason.includes('ApiTargetBlockedMapError') ||
      reason.includes('RefererNotAllowedMapError') ||
      reason.includes('ErrorInfo') ||
      reason.includes('API_KEY_HTTP_REFERRER_BLOCKED')
    ) {
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
    }
  });
  // Automatically check for and apply new PWA updates whenever the downloaded app is opened or focused
  if ('serviceWorker' in navigator) {
    const checkForPwaUpdate = () => {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => {
          for (const reg of regs) {
            reg.update().catch(() => {});
          }
        })
        .catch(() => {});
    };
    window.addEventListener('focus', checkForPwaUpdate);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkForPwaUpdate();
      }
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      {isDedicatedCustomerBookingRoute() ? <StandaloneCustomerBookingPage /> : <App />}
    </RootErrorBoundary>
  </StrictMode>
);


