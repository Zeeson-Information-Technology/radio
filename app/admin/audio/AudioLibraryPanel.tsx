"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SerializedAdmin } from "@/lib/types/admin";
import Link from "next/link";
import AudioUpload from "./AudioUpload";
import AudioList from "./AudioList";
import AudioLibraryManager from "./AudioLibraryManager";

interface AudioLibraryPanelProps {
  admin: SerializedAdmin;
}

type TabType = "upload" | "library" | "lecturers" | "categories";

export default function AudioLibraryPanel({ admin }: AudioLibraryPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("library");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  // Check for tab parameter in URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab') as TabType;
    if (tabParam && ['upload', 'library', 'lecturers', 'categories'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch('/api/admin/logout', {
        method: 'POST',
      });

      if (response.ok) {
        router.push('/admin/login');
      } else {
        console.error('Logout failed');
        setIsLoggingOut(false);
      }
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Link href="/" className="inline-flex items-center gap-1 sm:gap-2 text-emerald-700 hover:text-emerald-800 font-semibold text-sm sm:text-base">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="hidden sm:inline">Back to Radio</span>
                <span className="sm:hidden">Back</span>
              </Link>
              <div className="h-4 sm:h-6 w-px bg-emerald-200"></div>
              <h1 className="text-base sm:text-xl font-bold text-emerald-900 truncate">
                <span className="hidden sm:inline">📚 Audio Library</span>
                <span className="sm:hidden">📚 Library</span>
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <span className="hidden md:block text-xs sm:text-sm text-emerald-700">
                Welcome, <span className="font-semibold">{admin.name}</span>
              </span>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-all disabled:opacity-50"
              >
                {isLoggingOut ? (
                  <span className="hidden sm:inline">Logging out...</span>
                ) : (
                  <span className="hidden sm:inline">Logout</span>
                )}
                <span className="sm:hidden">Exit</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6">
          {/* Admin Navigation Links */}
          <Link
            href="/admin/live"
            className="px-3 sm:px-4 py-2 sm:py-2 text-xs sm:text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-all"
          >
            🎙️ Live Control
          </Link>
          
          <Link
            href="/admin/schedule"
            className="px-3 sm:px-4 py-2 sm:py-2 text-xs sm:text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-all"
          >
            📅 Schedule
          </Link>
          
          {(admin.role === "super_admin" || admin.role === "admin") && (
            <Link
              href="/admin/presenters"
              className="px-3 sm:px-4 py-2 sm:py-2 text-xs sm:text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-all"
            >
              👥 Presenters
            </Link>
          )}

          {/* Current page indicator */}
          <div className="px-3 sm:px-4 py-2 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 rounded-lg border border-emerald-600">
            📚 Audio Library
          </div>
          
          <Link
            href="/admin/change-password"
            className="px-3 sm:px-4 py-2 sm:py-2 text-xs sm:text-sm font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg border border-stone-300 transition-all"
          >
            🔒 Change Password
          </Link>
        </div>

        {/* Audio Library Tabs */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-emerald-100 overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-emerald-100 bg-white/50">
            <div className="flex overflow-x-auto">
              <button
                onClick={() => setActiveTab("library")}
                className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === "library"
                    ? "text-emerald-700 bg-emerald-50 border-b-2 border-emerald-500"
                    : "text-slate-600 hover:text-emerald-600 hover:bg-emerald-25"
                }`}
              >
                📋 Audio Library
              </button>
              
              <button
                onClick={() => setActiveTab("upload")}
                className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === "upload"
                    ? "text-emerald-700 bg-emerald-50 border-b-2 border-emerald-500"
                    : "text-slate-600 hover:text-emerald-600 hover:bg-emerald-25"
                }`}
              >
                ⬆️ Upload Audio
              </button>
              
              <button
                onClick={() => setActiveTab("lecturers")}
                className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === "lecturers"
                    ? "text-emerald-700 bg-emerald-50 border-b-2 border-emerald-500"
                    : "text-slate-600 hover:text-emerald-600 hover:bg-emerald-25"
                }`}
              >
                👨‍🏫 Lecturers
              </button>
              
              <button
                onClick={() => setActiveTab("categories")}
                className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === "categories"
                    ? "text-emerald-700 bg-emerald-50 border-b-2 border-emerald-500"
                    : "text-slate-600 hover:text-emerald-600 hover:bg-emerald-25"
                }`}
              >
                📂 Categories
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-3 sm:p-6">
            {activeTab === "library" && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                  <h2 className="text-lg sm:text-2xl font-bold text-slate-800">Enhanced Audio Library</h2>
                  <button
                    onClick={() => setActiveTab("upload")}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold shadow-lg text-sm sm:text-base self-start sm:self-auto"
                  >
                    ➕ Upload New Audio
                  </button>
                </div>
                <AudioLibraryManager admin={admin} />
              </div>
            )}

            {activeTab === "upload" && (
              <div>
                <div className="mb-4 sm:mb-6">
                  <h2 className="text-lg sm:text-2xl font-bold text-slate-800 mb-2">Upload Audio Recording</h2>
                  <p className="text-sm sm:text-base text-slate-600">
                    Upload Islamic audio content including Quran recitations, lectures, and educational material.
                  </p>
                </div>
                <AudioUpload admin={admin} onUploadSuccess={() => setActiveTab("library")} />
              </div>
            )}

            {activeTab === "lecturers" && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Manage Lecturers</h2>
                  <p className="text-slate-600">
                    Manage Islamic scholars and speakers who appear in your audio library.
                  </p>
                </div>
                <div className="text-center py-12 text-slate-500">
                  <p className="text-lg">Coming soon...</p>
                </div>
              </div>
            )}

            {activeTab === "categories" && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Manage Categories</h2>
                  <p className="text-slate-600">
                    Organize your audio content with categories like Quran, Hadith, Tafsir, and Lectures.
                  </p>
                </div>
                <div className="text-center py-12 text-slate-500">
                  <p className="text-lg">Coming soon...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <Link
            href="/radio"
            target="_blank"
            className="flex items-center gap-3 p-4 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-all group"
          >
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform">
              📻
            </div>
            <div>
              <h3 className="font-semibold text-emerald-800">Listen to Radio</h3>
              <p className="text-sm text-emerald-600">Open the public radio page</p>
            </div>
            <svg className="w-5 h-5 text-emerald-600 ml-auto group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          <Link
            href="/admin/live"
            className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-all group"
          >
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform">
              🎙️
            </div>
            <div>
              <h3 className="font-semibold text-blue-800">Go Live</h3>
              <p className="text-sm text-blue-600">Start broadcasting live</p>
            </div>
            <svg className="w-5 h-5 text-blue-600 ml-auto group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}