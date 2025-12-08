"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SerializedAdmin } from "@/lib/types/admin";

interface LiveControlPanelProps {
  admin: SerializedAdmin;
}

interface LiveState {
  isLive: boolean;
  title: string | null;
  lecturer: string | null;
  startedAt: string | null;
}

export default function LiveControlPanel({ admin }: LiveControlPanelProps) {
  const [liveState, setLiveState] = useState<LiveState>({
    isLive: false,
    title: null,
    lecturer: null,
    startedAt: null,
  });
  const [title, setTitle] = useState("");
  const [lecturer, setLecturer] = useState(admin.email);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  // Fetch current live state on mount
  useEffect(() => {
    fetchLiveState();
  }, []);

  const fetchLiveState = async () => {
    try {
      const response = await fetch('/api/live');
      const data = await response.json();
      
      if (data.ok) {
        setLiveState({
          isLive: data.isLive,
          title: data.title,
          lecturer: data.lecturer,
          startedAt: data.startedAt,
        });
        
        // Pre-fill form with current data
        if (data.title) setTitle(data.title);
        if (data.lecturer) setLecturer(data.lecturer);
      }
    } catch (err) {
      console.error('Error fetching live state:', err);
    }
  };

  const handleStartLive = async () => {
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch('/api/admin/live/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title || "Live Session",
          lecturer: lecturer || admin.email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Live stream started successfully!");
        await fetchLiveState(); // Refresh state
      } else {
        setError(data.error || "Failed to start live stream");
      }
    } catch (err) {
      console.error('Error starting live stream:', err);
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
        await fetchLiveState(); // Refresh state
      } else {
        setError(data.error || "Failed to stop live stream");
      }
    } catch (err) {
      console.error('Error stopping live stream:', err);
      setError("An error occurred while stopping the live stream");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch("/api/admin/logout", {
        method: "POST",
      });

      if (response.ok) {
        router.push("/admin/login");
        router.refresh();
      } else {
        alert("Logout failed. Please try again.");
        setIsLoggingOut(false);
      }
    } catch (error) {
      console.error("Logout error:", error);
      alert("An error occurred during logout.");
      setIsLoggingOut(false);
    }
  };

  const formatStartTime = (startedAt: string | null) => {
    if (!startedAt) return "Not started";
    
    const date = new Date(startedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) {
      return "Just started";
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else {
      const diffHours = Math.floor(diffMins / 60);
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Header with user info and logout */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Live Stream Control
            </h1>
            <p className="text-sm text-gray-600">
              Logged in as: <span className="font-medium">{admin.email}</span>
              {" • "}
              <span className="capitalize">{admin.role}</span>
            </p>
          </div>
          <div className="flex gap-2">
            {admin.role === "admin" && (
              <>
                <button
                  onClick={() => router.push("/admin/schedule")}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Manage Schedule
                </button>
                <button
                  onClick={() => router.push("/admin/presenters")}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Manage Users
                </button>
              </>
            )}
            <button
              onClick={() => router.push("/admin/change-password")}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Change Password
            </button>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">{message}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Current Status */}
        <div className="mb-8 p-4 bg-gray-50 rounded-lg border">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Current Status
          </h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                  liveState.isLive
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {liveState.isLive ? (
                  <>
                    <span className="w-2 h-2 bg-red-600 rounded-full mr-2 animate-pulse"></span>
                    LIVE
                  </>
                ) : (
                  "OFFLINE"
                )}
              </span>
            </div>
            
            {liveState.title && (
              <p className="text-sm text-gray-600">
                <strong>Title:</strong> {liveState.title}
              </p>
            )}
            
            {liveState.lecturer && (
              <p className="text-sm text-gray-600">
                <strong>Lecturer:</strong> {liveState.lecturer}
              </p>
            )}
            
            <p className="text-sm text-gray-600">
              <strong>Started:</strong> {formatStartTime(liveState.startedAt)}
            </p>
          </div>
        </div>

        {/* Live Stream Form */}
        <div className="space-y-6 mb-8">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Lecture Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition disabled:bg-gray-100"
              placeholder="e.g., Tafsir of Surah Al-Baqarah"
            />
          </div>

          <div>
            <label
              htmlFor="lecturer"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Lecturer Name
            </label>
            <input
              id="lecturer"
              type="text"
              value={lecturer}
              onChange={(e) => setLecturer(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition disabled:bg-gray-100"
              placeholder="e.g., Sheikh Ahmad"
            />
          </div>

          <div className="flex gap-4">
            {!liveState.isLive ? (
              <button
                onClick={handleStartLive}
                disabled={isLoading}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? "Starting..." : "Go Live"}
              </button>
            ) : (
              <button
                onClick={handleStopLive}
                disabled={isLoading}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? "Stopping..." : "Stop Live"}
              </button>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex gap-4">
            <button
              onClick={() => window.open('/radio', '_blank')}
              className="px-4 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              View Public Radio Page
            </button>
            <button
              onClick={fetchLiveState}
              className="px-4 py-2 text-sm text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Refresh Status
            </button>
          </div>
        </div>

        {/* Streaming Connection Details */}
        <StreamingConnectionDetails />
      </div>
    </div>
  );
}

/**
 * Streaming Connection Details Component
 * Shows connection info for OBS/BUTT
 */
function StreamingConnectionDetails() {
  const [connectionDetails, setConnectionDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchConnectionDetails();
  }, []);

  const fetchConnectionDetails = async () => {
    try {
      const response = await fetch('/api/stream-config');
      if (response.ok) {
        const data = await response.json();
        setConnectionDetails(data);
      }
    } catch (error) {
      console.error('Error fetching connection details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return null;
  }

  if (!connectionDetails) {
    return null;
  }

  return (
    <div className="mt-8 pt-6 border-t border-gray-200">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Streaming Connection Details
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Use these settings in your streaming software (OBS, BUTT, etc.) to broadcast live:
      </p>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="space-y-3">
          <div className="flex">
            <span className="text-sm font-medium text-gray-700 w-32">Server/Host:</span>
            <span className="text-sm text-gray-900 font-mono">{connectionDetails.host}</span>
          </div>
          <div className="flex">
            <span className="text-sm font-medium text-gray-700 w-32">Port:</span>
            <span className="text-sm text-gray-900 font-mono">{connectionDetails.port}</span>
          </div>
          <div className="flex">
            <span className="text-sm font-medium text-gray-700 w-32">Mount Point:</span>
            <span className="text-sm text-gray-900 font-mono">{connectionDetails.mount}</span>
          </div>
          <div className="flex">
            <span className="text-sm font-medium text-gray-700 w-32">Format:</span>
            <span className="text-sm text-gray-900">{connectionDetails.format}</span>
          </div>
          <div className="flex">
            <span className="text-sm font-medium text-gray-700 w-32">Password:</span>
            <span className="text-sm text-gray-600 italic">
              Ask the system admin for the source password configured in Icecast
            </span>
          </div>
        </div>

        {!connectionDetails.isConfigured && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              ⚠️ Streaming server not fully configured. Contact your system administrator.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4">
        <details className="text-sm">
          <summary className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium">
            Show OBS Studio Setup Instructions
          </summary>
          <div className="mt-3 p-4 bg-gray-50 rounded-lg space-y-2 text-gray-700">
            <p className="font-medium">OBS Studio Configuration:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Open OBS Studio</li>
              <li>Go to Settings → Stream</li>
              <li>Service: Custom</li>
              <li>Server: <code className="bg-gray-200 px-1 rounded">http://{connectionDetails.host}:{connectionDetails.port}{connectionDetails.mount}</code></li>
              <li>Stream Key: (leave empty or use source password)</li>
              <li>Click Apply and OK</li>
              <li>Click "Start Streaming" when ready to go live</li>
            </ol>
          </div>
        </details>
      </div>
    </div>
  );
}
