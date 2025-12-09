"use client";

import { useEffect, useState } from "react";
import { convertTimezoneToLocal } from "@/lib/timezone";

export default function TestTimezonePage() {
  const [result, setResult] = useState<string>("");
  const [userTimezone, setUserTimezone] = useState<string>("");
  const [currentDay, setCurrentDay] = useState<number>(0);

  useEffect(() => {
    // Get user's timezone
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setUserTimezone(tz);

    // Get current day
    const day = new Date().getDay();
    setCurrentDay(day);

    // Test conversion
    const testTime = "10:00";
    const testTimezone = "Africa/Lagos";
    const converted = convertTimezoneToLocal(testTime, testTimezone);
    setResult(converted);
  }, []);

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">Timezone Test</h1>

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded">
            <p className="font-semibold">Your Timezone:</p>
            <p className="text-lg">{userTimezone}</p>
          </div>

          <div className="p-4 bg-green-50 rounded">
            <p className="font-semibold">Current Day:</p>
            <p className="text-lg">{days[currentDay]} (Day {currentDay})</p>
          </div>

          <div className="p-4 bg-purple-50 rounded">
            <p className="font-semibold">Test Conversion:</p>
            <p className="text-sm text-gray-600 mb-2">
              Converting 10:00 from Africa/Lagos (Nigeria) to your timezone
            </p>
            <p className="text-lg font-mono">{result}</p>
          </div>

          <div className="p-4 bg-yellow-50 rounded">
            <p className="font-semibold">Schedule Info:</p>
            <p className="text-sm">
              The schedule in database is for <strong>Sunday (Day 0)</strong> at <strong>10:00 Nigeria time</strong>
            </p>
            <p className="text-sm mt-2">
              Today is <strong>{days[currentDay]}</strong>, so it {currentDay === 0 ? "WILL" : "WON'T"} show in "Today's Schedule"
            </p>
          </div>

          <div className="p-4 bg-red-50 rounded">
            <p className="font-semibold">Why schedule isn't showing:</p>
            <ul className="list-disc list-inside text-sm space-y-1 mt-2">
              <li>Schedule is for Sunday (dayOfWeek: 0)</li>
              <li>Today is {days[currentDay]} (dayOfWeek: {currentDay})</li>
              <li>Schedule will only show on Sundays in "Today's Schedule"</li>
              <li>It should show in "Upcoming" section if it's within next 3 days</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <a
            href="/admin/schedule"
            className="block px-4 py-2 bg-blue-600 text-white rounded text-center hover:bg-blue-700"
          >
            Go to Admin Schedule
          </a>
          <a
            href="/radio"
            className="block px-4 py-2 bg-green-600 text-white rounded text-center hover:bg-green-700"
          >
            Go to Radio Page
          </a>
          <a
            href="/debug-schedule"
            className="block px-4 py-2 bg-purple-600 text-white rounded text-center hover:bg-purple-700"
          >
            Debug Schedule API
          </a>
        </div>
      </div>
    </div>
  );
}
