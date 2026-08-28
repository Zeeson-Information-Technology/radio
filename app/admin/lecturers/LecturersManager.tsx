"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/lib/contexts/ToastContext";
import { useConfirm } from "@/lib/hooks/useConfirm";

interface Lecturer {
  _id: string;
  name: string;
  arabicName: string | null;
  recordingCount: number;
  isVerified: boolean;
}

export default function LecturersManager() {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Add form
  const [name, setName] = useState("");
  const [arabicName, setArabicName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Search
  const [search, setSearch] = useState("");

  const { showSuccess, showError } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    fetchLecturers();
  }, []);

  const fetchLecturers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/lecturers");
      const data = await res.json();
      if (data.success) {
        setLecturers(data.lecturers);
      } else {
        setError("Failed to load speakers");
      }
    } catch {
      setError("Failed to load speakers");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsAdding(true);
    try {
      const res = await fetch("/api/lecturers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), arabicName: arabicName.trim() || undefined }),
      });
      const data = await res.json();

      if (data.success) {
        showSuccess("Speaker Added", `${data.lecturer.name} has been added`);
        setLecturers(prev => [data.lecturer, ...prev]);
        setName("");
        setArabicName("");
      } else {
        showError("Failed", data.message || "Could not add speaker");
      }
    } catch {
      showError("Error", "An unexpected error occurred");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (lecturer: Lecturer) => {
    if (lecturer.recordingCount > 0) {
      const ok = await confirm({
        title: "Remove Speaker",
        message: `"${lecturer.name}" has ${lecturer.recordingCount} recording(s). Removing them won't delete the recordings — they'll keep their lecturer name. Continue?`,
        confirmText: "Remove",
        cancelText: "Cancel",
        type: "danger",
      });
      if (!ok) return;
    } else {
      const ok = await confirm({
        title: "Remove Speaker",
        message: `Remove "${lecturer.name}" from the speakers list?`,
        confirmText: "Remove",
        cancelText: "Cancel",
        type: "danger",
      });
      if (!ok) return;
    }

    try {
      const res = await fetch(`/api/lecturers?id=${lecturer._id}`, { method: "DELETE" });
      const data = await res.json();

      if (data.success) {
        showSuccess("Removed", `${lecturer.name} removed`);
        setLecturers(prev => prev.filter(l => l._id !== lecturer._id));
      } else {
        showError("Failed", data.message || "Could not remove speaker");
      }
    } catch {
      showError("Error", "An unexpected error occurred");
    }
  };

  const filtered = lecturers.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    (l.arabicName && l.arabicName.includes(search))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">

          {/* Header */}
          <div className="px-6 py-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Speakers / Lecturers</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Manage the list of speakers shown when uploading audio files
                </p>
              </div>
              <Link
                href="/admin/live"
                className="text-sm px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-center"
              >
                ← Back
              </Link>
            </div>
          </div>

          {/* Add Speaker Form */}
          <div className="px-6 py-6 border-b border-gray-100 bg-emerald-50">
            <h2 className="text-sm font-semibold text-emerald-800 mb-3">Add New Speaker</h2>
            <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="English name *"
                required
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              />
              <input
                type="text"
                value={arabicName}
                onChange={e => setArabicName(e.target.value)}
                placeholder="Arabic name (optional)"
                dir="rtl"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              />
              <button
                type="submit"
                disabled={isAdding || !name.trim()}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isAdding ? "Adding..." : "+ Add Speaker"}
              </button>
            </form>
          </div>

          {/* Search */}
          <div className="px-6 pt-4">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search speakers..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* List */}
          <div className="px-6 py-4">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-12 text-gray-500 text-sm">Loading speakers...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                {search ? "No speakers match your search" : "No speakers yet — add one above"}
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(lecturer => (
                  <div
                    key={lecturer._id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 text-sm">{lecturer.name}</span>
                        {lecturer.arabicName && (
                          <span className="text-gray-500 text-sm" dir="rtl">{lecturer.arabicName}</span>
                        )}
                        {lecturer.isVerified && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">✓ Verified</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {lecturer.recordingCount} recording{lecturer.recordingCount !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(lecturer)}
                      className="ml-4 px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex-shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && lecturers.length > 0 && (
              <p className="text-xs text-gray-400 mt-4 text-right">
                {filtered.length} of {lecturers.length} speaker{lecturers.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
