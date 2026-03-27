type AnalyticsEvent =
  | 'page_view'
  | 'fetch_video_info'
  | 'fetch_video_info_failed'
  | 'quality_selected'
  | 'download_started';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(event: AnalyticsEvent, params: Record<string, unknown> = {}): void {
  try {
    if (typeof window === 'undefined') return;

    const key = 'vibedown_analytics_counters';
    const current = JSON.parse(localStorage.getItem(key) || '{}') as Record<string, number>;
    current[event] = (current[event] || 0) + 1;
    localStorage.setItem(key, JSON.stringify(current));

    if (typeof window.gtag === 'function') {
      window.gtag('event', event, params);
    }
  } catch {
    // analytics should never break user flow
  }
}

