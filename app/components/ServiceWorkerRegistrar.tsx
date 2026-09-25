'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker on every page so push notifications,
 * offline support, and the PWA install prompt work regardless of
 * which page the user lands on first.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('Service worker registration failed:', err);
    });
  }, []);

  return null; // renders nothing
}
