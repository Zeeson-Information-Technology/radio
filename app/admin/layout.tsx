'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Admin layout — wraps all /admin/* pages.
 * Silently refreshes the access token every 90 minutes.
 * Forces redirect to login if refresh token has expired.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const refresh = async () => {
      try {
        const res = await fetch('/api/auth/refresh', { method: 'POST' });
        if (res.ok) {
          console.debug('[auth] Access token refreshed silently');
        } else if (res.status === 401) {
          // Refresh token expired or revoked — redirect to login cleanly
          console.warn('[auth] Session expired — redirecting to login');
          router.push('/admin/login');
        }
      } catch {
        // Network error — ignore, will retry at next interval
      }
    };

    refresh();

    // Refresh every 90 minutes (access token lasts 2h — 30min safety margin)
    const interval = setInterval(refresh, 90 * 60 * 1000);
    return () => clearInterval(interval);
  }, [router]);

  return <>{children}</>;
}
