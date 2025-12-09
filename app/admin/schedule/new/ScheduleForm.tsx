"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COMMON_TIMEZONES } from "@/lib/timezones";

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export default function ScheduleForm() {
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [startTime, setStartTime] = useState("20:00");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [lecturer, setLecturer] = useState("");
  const [topic, setTopic] = useState("");
  const [active, setActive] = useState(true);
  const [isNigeriaTime, setIsNigeriaTime] = useState(true);
  const [timezone, setTimezone] = useState("Africa/Lagos");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch('/api/admin/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dayOfWeek,
          startTime,
          timezone: isNigeriaTime ? "Africa/Lagos" : timezone,
          durationMinutes,
          lecturer,
          topic,
          active,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/admin/schedule');
      } else {
        setError(data.error || "Failed to create schedule");
      }
    } catch (err) {
      console.error('Error creating schedule:', err);
      setError("An error occurred while creating schedule");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Add Schedule Entry
          </h1>
          <p className="text-sm text-gray-600">
            Create a new scheduled lecture time
          </p>
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-sm text-emerald-800">
              🌍 <strong>Timezone Support:</strong> Enter the time in your local timezone.
              Listeners worldwide will see times automatically converted to their timezone.
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Day of Week */}
          <div>
            <label
              htmlFor="dayOfWeek"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Day of Week
            </label>
            <select
              id="dayOfWeek"
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              disabled={isSubmitting}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition disabled:bg-gray-100"
            >
              {DAYS.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </div>

          {/* Timezone Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Timezone
            </label>
            
            {/* Nigeria Quick Select */}
            <div className="flex items-center p-4 bg-emerald-50 border-2 border-emerald-200 rounded-lg">
              <input
                id="nigeriaTime"
                type="checkbox"
                checked={isNigeriaTime}
                onChange={(e) => {
                  setIsNigeriaTime(e.target.checked);
                  if (e.target.checked) {
                    setTimezone("Africa/Lagos");
                  }
                }}
                disabled={isSubmitting}
                className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <label
                htmlFor="nigeriaTime"
                className="ml-3 flex-1"
              >
                <span className="block text-sm font-semibold text-emerald-900">
                  🇳🇬 Nigeria Time (WAT, UTC+1)
                </span>
                <span className="block text-xs text-emerald-700 mt-0.5">
                  Check this if you're scheduling in Nigeria timezone
                </span>
              </label>
            </div>

            {/* Custom Timezone Selector */}
            {!isNigeriaTime && (
              <div>
                <label
                  htmlFor="timezone"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Select Your Timezone
                </label>
                <select
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition disabled:bg-gray-100"
                >
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label} ({tz.offset})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Select the timezone where the lecture will be scheduled
                </p>
              </div>
            )}
          </div>

          {/* Start Time */}
          <div>
            <label
              htmlFor="startTime"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Start Time (24-hour format)
            </label>
            <input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              disabled={isSubmitting}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition disabled:bg-gray-100"
            />
            <p className="mt-1 text-xs text-gray-500">
              Example: 20:00 for 8:00 PM
            </p>
          </div>

          {/* Duration */}
          <div>
            <label
              htmlFor="durationMinutes"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Duration (minutes)
            </label>
            <input
              id="durationMinutes"
              type="number"
              min="1"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              disabled={isSubmitting}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition disabled:bg-gray-100"
            />
          </div>

          {/* Lecturer */}
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
              disabled={isSubmitting}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition disabled:bg-gray-100"
              placeholder="e.g., Sheikh Ahmad"
            />
          </div>

          {/* Topic */}
          <div>
            <label
              htmlFor="topic"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Topic
            </label>
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isSubmitting}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition disabled:bg-gray-100"
              placeholder="e.g., Tafsir of Surah Al-Baqarah"
            />
          </div>

          {/* Active Checkbox */}
          <div className="flex items-center">
            <input
              id="active"
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              disabled={isSubmitting}
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <label
              htmlFor="active"
              className="ml-2 text-sm text-gray-700"
            >
              Active (show in public schedule)
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating..." : "Create Schedule"}
            </button>
            <button
              type="button"
              onClick={() => router.push('/admin/schedule')}
              disabled={isSubmitting}
              className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
