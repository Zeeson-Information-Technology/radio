"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

interface EditScheduleFormProps {
  scheduleId: string;
}

export default function EditScheduleForm({ scheduleId }: EditScheduleFormProps) {
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [startTime, setStartTime] = useState("20:00");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [lecturer, setLecturer] = useState("");
  const [topic, setTopic] = useState("");
  const [active, setActive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchSchedule();
  }, [scheduleId]);

  const fetchSchedule = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/schedule/${scheduleId}`);
      const data = await response.json();

      if (response.ok) {
        setDayOfWeek(data.item.dayOfWeek);
        setStartTime(data.item.startTime);
        setDurationMinutes(data.item.durationMinutes);
        setLecturer(data.item.lecturer);
        setTopic(data.item.topic);
        setActive(data.item.active);
      } else {
        setError(data.error || "Failed to fetch schedule");
      }
    } catch (err) {
      console.error('Error fetching schedule:', err);
      setError("An error occurred while fetching schedule");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/schedule/${scheduleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dayOfWeek,
          startTime,
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
        setError(data.error || "Failed to update schedule");
      }
    } catch (err) {
      console.error('Error updating schedule:', err);
      setError("An error occurred while updating schedule");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <p className="text-center text-gray-600">Loading schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Edit Schedule Entry
          </h1>
          <p className="text-sm text-gray-600">
            Update scheduled lecture time
          </p>
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition disabled:bg-gray-100"
            >
              {DAYS.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
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
              {isSubmitting ? "Updating..." : "Update Schedule"}
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
