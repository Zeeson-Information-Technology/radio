"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SerializedAdmin } from "@/lib/types/admin";
import Link from "next/link";
import BrowserEncoder from "./BrowserEncoder";

interface LiveControlPanelProps {
  admin: SerializedAdmin;
}

interface LiveState {
  isLive: boolean;
  isPaused: boolean;
  title: string | null;
  lecturer: string | null;
  startedAt: string | null;
  pausedAt: string | null;
}

interface StreamConfig {
  url: string;
  host: string;
  port: string;
  mount: string;
  format: string;
  isConfigured: boolean;
}

export default function LiveControlPanel({ admin }: LiveControlPanelProps) {
  const [liveState, setLiveState] = useState<LiveState>({
    isLive: false,
    isPaused: false,
    title: null,
    lecturer: null,
    startedAt: null,
    pausedAt: null,
  });
  const [streamConfig, setStreamConfig] = useState<StreamConfig | null>(null);
  const [listenerCount, setListenerCount] = useState<number>(0);
  const [title, setTitle] = useState("");
  const [lecturer, setLecturer] = useState(admin.email);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showStreamDetails, setShowStreamDetails] = useState(false);
  const [selectedSoftware, setSelectedSoftware] = useState<string>("rocket");
  const router = useRouter();

  useEffect(() => {
    fetchLiveState();
    fetchStreamConfig();
    fetchListenerCount();
    
    // Poll listener count every 10 seconds when live
    const interval = setInterval(() => {
      if (liveState.isLive) {
        fetchListenerCount();
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [liveState.isLive]);

  const fetchLiveState = async () => {
    try {
      const response = await fetch('/api/live');
      const data = await response.json();
      
      if (data.ok) {
        setLiveState({
          isLive: data.isLive,
          isPaused: data.isPaused || false,
          title: data.title,
          lecturer: data.lecturer,
          startedAt: data.startedAt,
          pausedAt: data.pausedAt || null,
        });
        
        if (data.title) setTitle(data.title);
        if (data.lecturer) setLecturer(data.lecturer);
      }
    } catch (err) {
      console.error('Error fetching live state:', err);
    }
  };

  const fetchStreamConfig = async () => {
    try {
      const response = await fetch('/api/stream-config');
      const data = await response.json();
      setStreamConfig(data);
    } catch (err) {
      console.error('Error fetching stream config:', err);
    }
  };

  const fetchListenerCount = async () => {
    try {
      const response = await fetch('/api/listeners');
      const data = await response.json();
      if (data.ok) {
        setListenerCount(data.listeners || 0);
      }
    } catch (err) {
      console.error('Error fetching listener count:', err);
    }
  };

  const handleStartLive = async () => {
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch('/api/admin/live/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || "Live Session",
          lecturer: lecturer || admin.email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("جزاك الله خيرا - Live stream started successfully!");
        await fetchLiveState();
      } else {
        setError(data.error || "Failed to start live stream");
      }
    } catch (err) {
      setError("An error occurred while starting the live stream");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopLive = async () => {
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch('/api/admin/live/stop', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Live stream stopped successfully!");
        await fetchLiveState();
      } else {
        setError(data.error || "Failed to stop live stream");
      }
    } catch (err) {
      setError("An error occurred while stopping the live stream");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePauseLive = async () => {
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch('/api/admin/live/pause', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Broadcast paused - Take your time!");
        await fetchLiveState();
      } else {
        setError(data.error || "Failed to pause broadcast");
      }
    } catch (err) {
      setError("An error occurred while pausing the broadcast");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeLive = async () => {
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch('/api/admin/live/resume', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Broadcast resumed - Welcome back!");
        await fetchLiveState();
      } else {
        setError(data.error || "Failed to resume broadcast");
      }
    } catch (err) {
      setError("An error occurred while resuming the broadcast");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch("/api/admin/logout", { method: "POST" });
      if (response.ok) {
        router.push("/admin/login");
        router.refresh();
      }
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
    }
  };

  const formatStartTime = (startedAt: string | null) => {
    if (!startedAt) return "Not started";
    const date = new Date(startedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just started";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-emerald-50/30 to-stone-50">
      {/* Traditional Islamic Pattern Background */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23047857' fill-opacity='1'%3E%3Cpath d='M40 0l10 10-10 10-10-10L40 0zm0 20l10 10-10 10-10-10 10-10zm0 20l10 10-10 10-10-10 10-10zm0 20l10 10-10 10-10-10 10-10zM0 40l10 10-10 10-10-10L0 40zm20 0l10 10-10 10-10-10 10-10zm20 0l10 10-10 10-10-10 10-10zm20 0l10 10-10 10-10-10 10-10zm20 0l10 10-10 10-10-10 10-10z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }}></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-emerald-900 mb-2">
                Live Broadcast Control
              </h1>
              <p 
                className="text-lg font-semibold" 
                style={{ 
                  fontFamily: 'Traditional Arabic, Amiri, Arial, sans-serif', 
                  direction: 'rtl',
                  color: '#D4AF37'
                }}
              >
                لوحة التحكم بالبث المباشر
              </p>
            </div>
            
            <Link href="/" className="inline-flex items-center gap-2 text-emerald-700 hover:text-emerald-800 font-semibold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
          </div>

          {/* User Info Bar */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border-2 border-emerald-800/20 p-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-700 to-emerald-600 rounded-lg flex items-center justify-center border-2 border-yellow-600/30">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-stone-600">Logged in as</p>
                  <p className="font-bold text-emerald-900">{admin.email}</p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 capitalize">
                    {admin.role}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {/* All users can access schedule */}
                <Link
                  href="/admin/schedule"
                  className="px-4 py-2 text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-all"
                >
                  📅 Schedule
                </Link>
                
                {/* Only super_admin and admin can manage users */}
                {(admin.role === "super_admin" || admin.role === "admin") && (
                  <Link
                    href="/admin/presenters"
                    className="px-4 py-2 text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-all"
                  >
                    👥 Users
                  </Link>
                )}
                <Link
                  href="/admin/change-password"
                  className="px-4 py-2 text-sm font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg border border-stone-300 transition-all"
                >
                  🔒 Password
                </Link>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="px-4 py-2 text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-all disabled:opacity-50"
                >
                  {isLoggingOut ? "..." : "Logout"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-6 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl flex items-start gap-3 shadow-lg">
            <svg className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-emerald-800 font-medium">{message}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3 shadow-lg">
            <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Control Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Browser Broadcasting - Primary Option */}
            <BrowserEncoder 
              title={title || 'Live Lecture'}
              lecturer={lecturer || admin.name || admin.email}
              onStreamStart={() => {
                setMessage("🎙️ Browser streaming started! You are now live.");
                fetchLiveState();
              }}
              onStreamStop={() => {
                setMessage("✅ Browser streaming stopped successfully.");
                fetchLiveState();
              }}
              onError={(error) => {
                setError(`Browser streaming error: ${error}`);
              }}
            />
            {/* Live Status Card */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-emerald-800/20 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 p-6 border-b-2 border-yellow-600/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Broadcast Status</h2>
                    <p className="text-emerald-100 text-sm">Current streaming state</p>
                  </div>
                  <div className={`px-6 py-3 rounded-xl font-bold text-lg border-2 ${
                    liveState.isLive && !liveState.isPaused
                      ? "bg-red-500 text-white border-red-300 animate-pulse"
                      : liveState.isPaused
                      ? "bg-yellow-500 text-white border-yellow-300"
                      : "bg-stone-200 text-stone-700 border-stone-300"
                  }`}>
                    {liveState.isLive && !liveState.isPaused ? (
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                        </span>
                        LIVE
                      </div>
                    ) : liveState.isPaused ? (
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" />
                        </svg>
                        PAUSED
                      </div>
                    ) : (
                      "OFFLINE"
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {liveState.isLive ? (
                  <>
                    <div className="bg-emerald-50 rounded-xl p-4 border-2 border-emerald-200">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-emerald-700 font-semibold mb-1">Current Lecture</p>
                          <p className="text-lg font-bold text-emerald-900">{liveState.title || "Untitled"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-200">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-yellow-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-yellow-700 font-semibold mb-1">Lecturer</p>
                          <p className="text-lg font-bold text-yellow-900">{liveState.lecturer || "Unknown"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-sm text-stone-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Started: <strong>{formatStartTime(liveState.startedAt)}</strong></span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-stone-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>Listeners: <strong className="text-emerald-700">{listenerCount}</strong></span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
                      </svg>
                    </div>
                    <p className="text-stone-600 font-medium">No active broadcast</p>
                    <p className="text-sm text-stone-500 mt-1">Fill in the details below and click "Go Live"</p>
                  </div>
                )}
              </div>
            </div>

            {/* Control Form */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-emerald-800/20 shadow-xl p-6">
              <h3 className="text-xl font-bold text-emerald-900 mb-6 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Broadcast Details
              </h3>

              <div className="space-y-5">
                <div>
                  <label htmlFor="title" className="block text-sm font-bold text-stone-700 mb-2">
                    Lecture Title *
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isLoading}
                    className="w-full px-4 py-3 border-2 border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition disabled:bg-stone-100 disabled:cursor-not-allowed font-medium"
                    placeholder="e.g., Tafsir of Surah Al-Baqarah"
                  />
                  <p className="mt-1 text-xs text-stone-500">Enter the topic or title of the lecture</p>
                </div>

                <div>
                  <label htmlFor="lecturer" className="block text-sm font-bold text-stone-700 mb-2">
                    Lecturer Name *
                  </label>
                  <input
                    id="lecturer"
                    type="text"
                    value={lecturer}
                    onChange={(e) => setLecturer(e.target.value)}
                    disabled={isLoading}
                    className="w-full px-4 py-3 border-2 border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition disabled:bg-stone-100 disabled:cursor-not-allowed font-medium"
                    placeholder="e.g., Sheikh Ahmad"
                  />
                  <p className="mt-1 text-xs text-stone-500">Name of the speaker or scholar</p>
                </div>

                <div className="flex gap-3 pt-4">
                  {!liveState.isLive ? (
                    <button
                      onClick={handleStartLive}
                      disabled={isLoading || !title.trim()}
                      className="flex-1 bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-xl border-2 border-yellow-600/30 hover:border-yellow-600/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Starting...
                        </>
                      ) : (
                        <>
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                          </svg>
                          Go Live
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleStopLive}
                      disabled={isLoading}
                      className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold py-4 px-6 rounded-xl border-2 border-red-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Stopping...
                        </>
                      ) : (
                        <>
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                          </svg>
                          Stop Live
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Streaming Connection Details */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-yellow-600/30 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 p-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Connection Details
                </h3>
              </div>

              <div className="p-4 space-y-3">
                {streamConfig ? (
                  <>
                    <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
                      <p className="text-xs text-stone-600 mb-1">Server URL</p>
                      <p className="font-mono text-sm font-bold text-emerald-900 break-all">{streamConfig.url}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
                        <p className="text-xs text-stone-600 mb-1">Host</p>
                        <p className="font-mono text-sm font-bold text-stone-900">{streamConfig.host}</p>
                      </div>
                      <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
                        <p className="text-xs text-stone-600 mb-1">Port</p>
                        <p className="font-mono text-sm font-bold text-stone-900">{streamConfig.port}</p>
                      </div>
                    </div>

                    <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
                      <p className="text-xs text-stone-600 mb-1">Mount Point</p>
                      <p className="font-mono text-sm font-bold text-stone-900">{streamConfig.mount}</p>
                    </div>

                    <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
                      <p className="text-xs text-stone-600 mb-1">Format</p>
                      <p className="font-mono text-sm font-bold text-stone-900">{streamConfig.format}</p>
                    </div>

                    <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                      <p className="text-xs text-yellow-700 mb-1">Password</p>
                      <p className="text-sm text-yellow-900 font-medium">Ask system admin</p>
                    </div>

                    {!streamConfig.isConfigured && (
                      <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                        <p className="text-xs text-red-700 font-semibold">⚠️ Not Configured</p>
                        <p className="text-xs text-red-600 mt-1">Contact admin to set up streaming server</p>
                      </div>
                    )}

                    <button
                      onClick={() => setShowStreamDetails(!showStreamDetails)}
                      className="w-full text-sm text-emerald-700 hover:text-emerald-800 font-semibold py-2 flex items-center justify-center gap-1"
                    >
                      {showStreamDetails ? "Hide" : "Show"} Setup Instructions
                      <svg className={`w-4 h-4 transition-transform ${showStreamDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showStreamDetails && (
                      <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200 space-y-3 text-sm">
                        <div>
                          <p className="font-bold text-emerald-900 mb-2">📡 Broadcasting Software Setup</p>
                          <p className="text-xs text-emerald-700 mb-3">
                            Select your broadcasting software to see setup instructions:
                          </p>
                        </div>

                        {/* Software Selector */}
                        <div>
                          <label htmlFor="software-select" className="block text-xs font-semibold text-emerald-900 mb-2">
                            Your Broadcasting Software:
                          </label>
                          <select
                            id="software-select"
                            value={selectedSoftware}
                            onChange={(e) => setSelectedSoftware(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white text-sm"
                          >
                            <option value="rocket">🚀 Rocket Broadcaster</option>
                            <option value="obs">🎥 OBS Studio (Free)</option>
                            <option value="butt">📻 BUTT (Free)</option>
                            <option value="sam">🎙️ SAM Broadcaster</option>
                            <option value="mixxx">🎵 Mixxx (Free)</option>
                          </select>
                        </div>

                        {/* Instructions based on selected software */}
                        <div className="bg-white rounded-lg p-4 border border-emerald-200">
                          {selectedSoftware === "rocket" && (
                            <>
                              <p className="font-semibold text-emerald-900 mb-2">🚀 Rocket Broadcaster Setup</p>
                              <ol className="list-decimal list-inside space-y-1 text-xs text-emerald-800">
                                <li>Open Rocket Broadcaster</li>
                                <li>Go to <strong>Settings → Encoder</strong></li>
                                <li>Server: <code className="bg-emerald-50 px-1 rounded">{streamConfig.url}</code></li>
                                <li>Enter the password (ask admin if you don't have it)</li>
                                <li>Click <strong>"Start Broadcasting"</strong></li>
                              </ol>
                            </>
                          )}

                          {selectedSoftware === "obs" && (
                            <>
                              <p className="font-semibold text-emerald-900 mb-2">🎥 OBS Studio Setup</p>
                              <ol className="list-decimal list-inside space-y-1 text-xs text-emerald-800">
                                <li>Open OBS Studio</li>
                                <li>Go to <strong>Settings → Stream</strong></li>
                                <li>Service: <strong>Custom</strong></li>
                                <li>Server: <code className="bg-emerald-50 px-1 rounded">{streamConfig.url}</code></li>
                                <li>Stream Key: <code className="bg-emerald-50 px-1 rounded">{streamConfig.mount}</code></li>
                                <li>Enter the password</li>
                                <li>Click <strong>"Start Streaming"</strong></li>
                              </ol>
                            </>
                          )}

                          {selectedSoftware === "butt" && (
                            <>
                              <p className="font-semibold text-emerald-900 mb-2">📻 BUTT Setup</p>
                              <ol className="list-decimal list-inside space-y-1 text-xs text-emerald-800">
                                <li>Open BUTT (Broadcast Using This Tool)</li>
                                <li>Go to <strong>Settings → Main</strong></li>
                                <li>Server: <code className="bg-emerald-50 px-1 rounded">{streamConfig.host}</code></li>
                                <li>Port: <code className="bg-emerald-50 px-1 rounded">{streamConfig.port}</code></li>
                                <li>Mount: <code className="bg-emerald-50 px-1 rounded">{streamConfig.mount}</code></li>
                                <li>Enter the password</li>
                                <li>Click <strong>"Play"</strong> to start broadcasting</li>
                              </ol>
                            </>
                          )}

                          {selectedSoftware === "sam" && (
                            <>
                              <p className="font-semibold text-emerald-900 mb-2">🎙️ SAM Broadcaster Setup</p>
                              <ol className="list-decimal list-inside space-y-1 text-xs text-emerald-800">
                                <li>Open SAM Broadcaster</li>
                                <li>Go to <strong>Encoders → Add Encoder</strong></li>
                                <li>Type: <strong>Icecast</strong></li>
                                <li>Server: <code className="bg-emerald-50 px-1 rounded">{streamConfig.host}:{streamConfig.port}</code></li>
                                <li>Mount: <code className="bg-emerald-50 px-1 rounded">{streamConfig.mount}</code></li>
                                <li>Enter the password</li>
                                <li><strong>Enable</strong> the encoder to start broadcasting</li>
                              </ol>
                            </>
                          )}

                          {selectedSoftware === "mixxx" && (
                            <>
                              <p className="font-semibold text-emerald-900 mb-2">🎵 Mixxx Setup</p>
                              <ol className="list-decimal list-inside space-y-1 text-xs text-emerald-800">
                                <li>Open Mixxx</li>
                                <li>Go to <strong>Preferences → Live Broadcasting</strong></li>
                                <li>Type: <strong>Icecast 2</strong></li>
                                <li>Host: <code className="bg-emerald-50 px-1 rounded">{streamConfig.host}</code></li>
                                <li>Port: <code className="bg-emerald-50 px-1 rounded">{streamConfig.port}</code></li>
                                <li>Mount: <code className="bg-emerald-50 px-1 rounded">{streamConfig.mount}</code></li>
                                <li>Enter the password</li>
                                <li>Click <strong>"Enable Live Broadcasting"</strong></li>
                              </ol>
                            </>
                          )}
                        </div>

                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                          <p className="text-xs text-blue-800">
                            💡 <strong>Tip:</strong> After connecting, click "Go Live" above to let listeners know you're broadcasting!
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4">
                    <svg className="animate-spin h-8 w-8 text-stone-400 mx-auto" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-sm text-stone-500 mt-2">Loading...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Listener Statistics */}
            {liveState.isLive && (
              <div className="bg-gradient-to-br from-purple-600 to-purple-500 rounded-2xl border-2 border-purple-400 shadow-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Live Listeners
                  </h3>
                  <button
                    onClick={fetchListenerCount}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    title="Refresh"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
                <div className="text-center">
                  <div className="text-6xl font-bold mb-2">{listenerCount}</div>
                  <p className="text-purple-100 text-sm">
                    {listenerCount === 1 ? 'person listening' : 'people listening'}
                  </p>
                  <p className="text-xs text-purple-200 mt-2">Updates every 10 seconds</p>
                </div>
              </div>
            )}

            {/* Quick Links */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-emerald-800/20 shadow-xl p-5">
              <h3 className="text-lg font-bold text-emerald-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Quick Actions
              </h3>
              <div className="space-y-2">
                <Link
                  href="/radio"
                  target="_blank"
                  className="flex items-center gap-3 p-3 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-all group"
                >
                  <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-emerald-900">Listen Live</p>
                    <p className="text-xs text-emerald-700">Test your broadcast</p>
                  </div>
                  <svg className="w-5 h-5 text-emerald-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <Link
                  href="/api/stream-health"
                  target="_blank"
                  className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-all group"
                >
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-blue-900">Stream Health</p>
                    <p className="text-xs text-blue-700">Check connection</p>
                  </div>
                  <svg className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Islamic Reminder */}
            <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 rounded-2xl border-2 border-yellow-600/30 shadow-xl p-5 text-white">
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-600/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <p 
                  className="text-lg font-bold mb-2" 
                  style={{ 
                    fontFamily: 'Traditional Arabic, Amiri, Arial, sans-serif', 
                    direction: 'rtl',
                    color: '#D4AF37'
                  }}
                >
                  جزاكم الله خيرا
                </p>
                <p className="text-sm text-emerald-100">
                  May Allah reward you for spreading beneficial knowledge
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
