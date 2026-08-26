'use client';

import { useEffect } from 'react';

/**
 * Admin layout — wraps all /admin/* pages.
 * Silently refreshes the access token every 10 minutes so admins
 * never get logged out mid-session. The access token lasts 15 minutes;
 * refreshing at 10 minutes gives a 5-minute safety margin.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Refresh immediately on mount (handles page reload after token expiry)
    const refresh = async () => {
      try {
        const res = await fetch('/api/auth/refresh', { method: 'POST' });
        if (res.ok) {
          console.debug('[auth] Access token refreshed silently');
        }
        // 401 means refresh token also expired → user will get redirected
        // to login naturally on their next API call. No forced redirect here
        // so the admin doesn't lose work mid-form.
      } catch {
        // Network error — ignore, will retry in 10 minutes
      }
    };

    refresh();

    // Refresh every 10 minutes (token lasts 15 min, so this keeps it alive)
    const interval = setInterval(refresh, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return <>{children}</>;
}
