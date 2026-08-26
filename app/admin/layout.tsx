'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { BroadcastProvider, useBroadcast } from './BroadcastProvider';
import BrowserEncoder from './live/BrowserEncoder';

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { admin, isStreaming, setIsStreaming, title, lecturer } = useBroadcast();
  const isOnLivePage = pathname === '/admin/live';

  // Silent token refresh every 10 minutes
  useEffect(() => {
    const refresh = async () => {
      try {
        await fetch('/api/auth/refresh', { method: 'POST' });
      } catch { /* ignore */ }
    };
    refresh();
    const interval = setInterval(refresh, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {children}

      {/* BrowserEncoder — only mounted in the layout when NOT on the live page.
          When on the live page, LiveControlPanel renders its own visible BrowserEncoder.
          When the admin navigates away mid-broadcast, this hidden instance keeps the
          WebSocket + microphone alive so the stream continues. */}
      {admin && !isOnLivePage && (
        <div className="hidden" aria-hidden="true">
          <BrowserEncoder
            admin={admin}
            title={title}
            lecturer={lecturer}
            autoReconnect={true}
            onStreamStart={() => setIsStreaming(true)}
            onStreamStop={() => setIsStreaming(false)}
            onError={() => {}}
          />
        </div>
      )}

      {/* Floating live badge — shown on non-live admin pages when broadcasting */}
      {isStreaming && !isOnLivePage && (
        <Link
          href="/admin/live"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-2xl transition-all animate-pulse"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
          <span className="font-bold text-sm">LIVE — Return to control</span>
        </Link>
      )}
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <BroadcastProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </BroadcastProvider>
  );
}
