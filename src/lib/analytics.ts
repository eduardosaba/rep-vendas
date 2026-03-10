'use client';

export function trackEvent(name: string, props?: Record<string, any>) {
  try {
    if (typeof window !== 'undefined') {
      const w = window as any;
      // gtag (Google Analytics)
      if (typeof w.gtag === 'function') {
        w.gtag('event', name, props || {});
        return;
      }
      // amplitude
      if (w.amplitude && typeof w.amplitude.getInstance === 'function') {
        w.amplitude.getInstance().logEvent(name, props || {});
        return;
      }
      // fallback: console for local/dev
      console.info('[trackEvent]', name, props || {});
    }
  } catch (e) {
    // silencia erros de analytics
    // eslint-disable-next-line no-console
    console.info('[trackEvent:error]', name, e);
  }
}
