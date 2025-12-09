"use client";

import { useEffect, useState } from "react";

export default function DebugSchedulePage() {
  const [schedules, setSchedules] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/schedule');
      const data = await response.json();
      
      console.log('Schedule API Response:', data);
      setSchedules(data);
      
      if (!response.ok) {
        setError(`API Error: ${response.status}`);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Schedule Debug Page</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">API Response</h2>
          
          {loading && <p>Loading...</p>}
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
              <p className="text-red-800">Error: {error}</p>
            </div>
          )}
          
          {schedules && (
            <div>
              <p className="mb-2">
                <strong>Status:</strong> {schedules.ok ? '✅ OK' : '❌ Failed'}
              </p>
              <p className="mb-4">
                <strong>Items Count:</strong> {schedules.items?.length || 0}
              </p>
              
              {schedules.items && schedules.items.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-semibold">Schedules:</h3>
                  {schedules.items.map((item: any, index: number) => (
                    <div key={index} className="border border-gray-200 rounded p-4">
                      <p><strong>Day:</strong> {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][item.dayOfWeek]}</p>
                      <p><strong>Time:</strong> {item.startTime}</p>
                      <p><strong>Timezone:</strong> {item.timezone || 'Not set'}</p>
                      <p><strong>Duration:</strong> {item.durationMinutes} min</p>
                      <p><strong>Lecturer:</strong> {item.lecturer}</p>
                      <p><strong>Topic:</strong> {item.topic}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                  <p className="text-yellow-800">
                    ⚠️ No schedules found. Create one in the admin panel.
                  </p>
                </div>
              )}
            </div>
          )}
          
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Raw JSON:</h3>
            <pre className="bg-gray-50 p-4 rounded overflow-auto text-xs">
              {JSON.stringify(schedules, null, 2)}
            </pre>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <a 
              href="/admin/login" 
              className="block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go to Admin Login
            </a>
            <a 
              href="/admin/schedule" 
              className="block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Go to Schedule Management
            </a>
            <a 
              href="/radio" 
              className="block px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Go to Radio Page
            </a>
            <button
              onClick={fetchSchedules}
              className="block w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Refresh Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
