import ReactGA from 'react-ga4';

export function initializeAnalytics() {
  const trackingId = import.meta.env.VITE_GA_TRACKING_ID?.trim();
  if (!trackingId || ReactGA.isInitialized) return;

  // Enhanced Measurement tracks BrowserRouter history changes in GA4.
  // Keep its initial page_view enabled; do not also send manual pageviews.
  ReactGA.initialize(trackingId);
}
