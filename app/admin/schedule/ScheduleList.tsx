"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SerializedAdmin } from "@/lib/types/admin";
import { getTimezoneDisplay } from "@/lib/timezones";

interface ScheduleItem {
  _id: string;
  dayOfWeek: number;
  startTime: string;
  timezone: string;
  durationMinutes: number;
  lecturer: string;
  topic: string;
  active: boolean;
  createdBy: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  recurringType: "once" | "weekly" | "monthly" | "quarterly";
  startDate: string;
  endDate: string | null;
}

interface ScheduleListProps {
  admin: SerializedAdmin;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function ScheduleList({ admin }: ScheduleListProps) {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "mine">("all");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    fetchSchedules();
  }, [filter]);

  const fetchSchedules = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/schedule?filter=${filter}`);
      const data = await response.json();

      if (response.ok) {
        setSchedules(data.items);
        setCurrentUserId(data.currentUserId);
      } else {
        setError(data.error || "Failed to fetch schedules");
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError("An error occurred while fetching schedules");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this schedule entry?")) {
      return;
    }

    setDeleteId(id);
    try {
      const response = await fetch(`/api/admin/schedule/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchSchedules(); // Refresh list
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete schedule");
      }
    } catch (err) {
      console.error('Error deleting schedule:', err);
      alert("An error occurred while deleting schedule");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Schedule Management
            </h1>
            <p className="text-sm text-gray-600">
              Manage lecture schedule for the radio
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/admin/live")}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => router.push("/admin/schedule/new")}
              className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              Add Schedule Entry
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              filter === "all"
                ? "text-green-600 border-green-600"
                : "text-gray-600 border-transparent hover:text-gray-900"
            }`}
          >
            All Schedules
          </button>
          <button
            onClick={() => setFilter("mine")}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              filter === "mine"
                ? "text-green-600 border-green-600"
                : "text-gray-600 border-transparent hover:text-gray-900"
            }`}
          >
            My Schedules
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading schedules...</p>
          </div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No schedule entries yet.</p>
            <button
              onClick={() => router.push("/admin/schedule/new")}
              className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              Create First Entry
            </button>
          </div>
        ) : (
          /* Schedule Table */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Day</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Time & Timezone</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Duration</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Lecturer</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Topic</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Recurring</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Created By</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Active</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((schedule) => {
                  const isMySchedule = schedule.createdBy?._id === currentUserId;
                  return (
                    <tr key={schedule._id} className={`border-b border-gray-100 hover:bg-gray-50 ${isMySchedule ? 'bg-blue-50/30' : ''}`}>
                      <td className="py-3 px-4 text-gray-900">
                        {DAYS[schedule.dayOfWeek]}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-gray-900 font-medium">{schedule.startTime}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {schedule.timezone === "Africa/Lagos" ? "🇳🇬 " : ""}
                          {getTimezoneDisplay(schedule.timezone || "Africa/Lagos")}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-900">
                        {schedule.durationMinutes} min
                      </td>
                      <td className="py-3 px-4 text-gray-900">
                        {schedule.lecturer}
                      </td>
                      <td className="py-3 px-4 text-gray-900">
                        {schedule.topic}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-gray-900 capitalize">{schedule.recurringType || "weekly"}</div>
                        {schedule.endDate && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            Until {new Date(schedule.endDate).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-gray-900 text-sm font-medium">
                          {schedule.createdBy?.name || "Unknown"}
                          {isMySchedule && (
                            <span className="ml-2 text-xs text-blue-600 font-semibold">(You)</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {schedule.createdBy?.email || ""}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {schedule.createdBy?.role || ""}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                            schedule.active
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {schedule.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => router.push(`/admin/schedule/${schedule._id}/edit`)}
                            className="px-3 py-1 text-sm text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(schedule._id)}
                            disabled={deleteId === schedule._id}
                            className="px-3 py-1 text-sm text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deleteId === schedule._id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
