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



export default function LiveControlPanel({ admin }: LiveControlPanelProps) {
  const [liveState, setLiveState] = useState<LiveState>({
    isLive: false,
    isPaused: false,
    title: null,
    lecturer: null,
    startedAt: null,
    pausedAt: null,
  });
  const [listenerCount, setListenerCount] = useState<number>(0);
  const [isLoadingListeners, setIsLoadingListeners] = useState(false);
  const [title, setTitle] = useState("");
  const [lecturer, setLecturer] = useState(admin.name || admin.email);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchLiveState();
    // Only fetch listener count once on load, no more polling!
    fetchListenerCount();
  }, []);

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

  const fetchListenerCount = async (showLoading = false) => {
    try {
      if (showLoading) setIsLoadingListeners(true);
      const response = await fetch('/api/listeners');
      const data = await response.json();
      if (data.ok) {
        setListenerCount(data.listeners || 0);
      }
    } catch (err) {
      console.error('Error fetching listener count:', err);
    } finally {
      if (showLoading) setIsLoadingListeners(false);
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
                
                {/* All users can access audio library */}
                <Link
                  href="/admin/audio"
                  className="px-4 py-2 text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-all"
                >
                  📚 Audio Library
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

        <div className="max-w-4xl mx-auto">
          {/* Browser Broadcasting - Single Modern Interface */}
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

          {/* Program Details Form */}
          <div className="mt-6 bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-emerald-800/20 shadow-xl p-6">
            <h3 className="text-xl font-bold text-emerald-900 mb-6 flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Broadcast Details
            </h3>
            <p className="text-stone-600 mb-6">Fill in the details below and click "Start Broadcasting" above</p>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="title" className="block text-sm font-bold text-stone-700 mb-2">
                  Lecture Title *
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition font-medium"
                  placeholder="Enter the topic or title of the lecture"
                />
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
                  className="w-full px-4 py-3 border-2 border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition font-medium"
                  placeholder="Name of the speaker or scholar"
                />
              </div>
            </div>
          </div>

          {/* Current Live Status */}
          {liveState.isLive && (
            <div className="mt-6 bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl shadow-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                    </span>
                    <span className="text-sm font-bold">LIVE NOW</span>
                  </div>
                  <h3 className="text-2xl font-bold">{liveState.title || "Live Lecture"}</h3>
                  <p className="text-red-100">with {liveState.lecturer || "Unknown"}</p>
                  {liveState.startedAt && (
                    <p className="text-red-200 text-sm mt-1">
                      Started: {formatStartTime(liveState.startedAt)}
                    </p>
                  )}
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div className="text-3xl font-bold">{listenerCount}</div>
                    <button
                      onClick={() => fetchListenerCount(true)}
                      disabled={isLoadingListeners}
                      className="p-1 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
                      title="Refresh listener count"
                    >
                      <svg className={`w-4 h-4 text-white ${isLoadingListeners ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-red-100 text-sm">
                    {listenerCount === 1 ? 'listener' : 'listeners'}
                  </p>
                  <p className="text-red-200 text-xs mt-1">
                    Click refresh icon to update
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mt-6 grid md:grid-cols-2 gap-4">
            <Link
              href="/radio"
              target="_blank"
              className="flex items-center gap-3 p-4 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-all group"
            >
              <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-emerald-900">Listen Live</p>
                <p className="text-sm text-emerald-700">Test your broadcast</p>
              </div>
              <svg className="w-5 h-5 text-emerald-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href="/admin/schedule"
              className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-all group"
            >
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-blue-900">Schedule</p>
                <p className="text-sm text-blue-700">Manage programs</p>
              </div>
              <svg className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
