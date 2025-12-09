"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MigratePage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleMigrate = async () => {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch('/api/admin/migrate-timezones', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setTimeout(() => {
          router.push('/admin/schedule');
        }, 2000);
      } else {
        setError(data.error || "Migration failed");
      }
    } catch (err) {
      setError("An error occurred during migration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Migrate Schedules
        </h1>
        
        <p className="text-gray-600 mb-6">
          This will add the timezone field to any schedules that don't have it.
          All schedules will be set to Nigeria timezone (Africa/Lagos) by default.
        </p>

        {message && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded">
            <p className="text-green-800">✅ {message}</p>
            <p className="text-sm text-green-600 mt-2">Redirecting to schedule page...</p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800">❌ {error}</p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleMigrate}
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? "Migrating..." : "Run Migration"}
          </button>

          <button
            onClick={() => router.push('/admin/schedule')}
            disabled={loading}
            className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> You only need to run this once. After migration,
            you can edit schedules in the admin panel to change their timezone if needed.
          </p>
        </div>
      </div>
    </div>
  );
}
