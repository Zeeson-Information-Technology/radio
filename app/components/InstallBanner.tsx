'use client';

import { useState, useEffect } from 'react';

const DISMISSED_KEY = 'pwa_install_dismissed';
const DISMISS_DAYS = 7;

export default function InstallBanner() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if dismissed recently
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed && Date.now() - Number(dismissed) < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;

    // Only show on mobile
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    if (!isMobile) return;

    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      // Show banner after 3 seconds — not immediately on load
      setTimeout(() => setVisible(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = () => {
    installPrompt?.prompt();
    installPrompt?.userChoice.then(() => {
      setVisible(false);
      setInstallPrompt(null);
    });
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  };

  if (!visible || !installPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 safe-area-pb">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 flex items-center gap-3 max-w-lg mx-auto">
        {/* Icon */}
        <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15.536 8.464a5 5 0 010 7.072M12 6v12M8.464 8.464a5 5 0 000 7.072" />
          </svg>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm">Al-Manhaj Radio</p>
          <p className="text-xs text-slate-500">Install for a better experience</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
          >
            Not now
          </button>
          <button
            onClick={handleInstall}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
