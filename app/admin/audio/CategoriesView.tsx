"use client";

import { useEffect, useState, useCallback } from "react";
import { SerializedAdmin } from "@/lib/types/admin";

interface Category {
  id: string;
  name: string;
  arabicName?: string;
  description?: string;
  icon?: string;
  color?: string;
  recordingCount: number;
}

interface AudioFile {
  id: string;
  title: string;
  lecturerName: string;
  duration: number;
  fileSize: number;
  url?: string;
  visibility: string;
  broadcastReady: boolean;
  createdAt: string;
  conversionStatus?: string;
  isPlayable?: boolean;
}

interface CategoriesViewProps {
  admin: SerializedAdmin;
}

function formatDuration(seconds: number): string {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatSize(bytes: number): string {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

export default function CategoriesView({ admin }: CategoriesViewProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [audios, setAudios] = useState<AudioFile[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingAudios, setIsLoadingAudios] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/categories");
        const data = await res.json();
        if (data.success) {
          setCategories(data.categories);
        }
      } catch {
        setError("Failed to load categories");
      } finally {
        setIsLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  // Fetch audios for a selected category
  const fetchAudios = useCallback(async (categoryId: string, searchTerm = "") => {
    setIsLoadingAudios(true);
    setAudios([]);
    try {
      const params = new URLSearchParams({
        section: "all",
        category: categoryId,
        limit: "200",
      });
      if (searchTerm) params.set("search", searchTerm);

      const res = await fetch(`/api/admin/audio?${params}`);
      const data = await res.json();
      if (data.success) {
        setAudios(data.files || []);
        setTotalCount(data.totalCount || data.files?.length || 0);
      } else {
        setError("Failed to load audios");
      }
    } catch {
      setError("Failed to load audios");
    } finally {
      setIsLoadingAudios(false);
    }
  }, []);

  const handleSelectCategory = (cat: Category) => {
    setSelectedCategory(cat);
    setSearch("");
    fetchAudios(cat.id, "");
    setError("");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCategory) fetchAudios(selectedCategory.id, search);
  };

  // ── Category grid ──────────────────────────────────────────────────────────
  if (!selectedCategory) {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800">Browse by Category</h2>
          <p className="text-sm text-slate-500 mt-1">Select a category to view its recordings</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        {isLoadingCategories ? (
          <div className="text-center py-16 text-slate-500 text-sm">Loading categories...</div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-500 text-sm mb-4">No categories found.</p>
            <button
              onClick={async () => {
                await fetch("/api/categories", { method: "POST" });
                window.location.reload();
              }}
              className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700"
            >
              Create Default Categories
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => handleSelectCategory(cat)}
                className="flex flex-col items-center text-center p-4 sm:p-6 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all group"
              >
                <div
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-2xl sm:text-3xl mb-3 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${cat.color}20`, border: `2px solid ${cat.color}40` }}
                >
                  {cat.icon || "📁"}
                </div>
                <div className="font-semibold text-slate-800 text-sm sm:text-base leading-tight mb-1">
                  {cat.name}
                </div>
                {cat.arabicName && (
                  <div className="text-xs text-slate-500 mb-2" dir="rtl">{cat.arabicName}</div>
                )}
                <div
                  className="text-xs font-medium px-2 py-0.5 rounded-full mt-auto"
                  style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                >
                  {cat.recordingCount} recording{cat.recordingCount !== 1 ? "s" : ""}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Audio list for selected category ───────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => { setSelectedCategory(null); setAudios([]); setError(""); }}
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600"
          title="Back to categories"
        >
          ←
        </button>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-xl flex-shrink-0"
          style={{ backgroundColor: `${selectedCategory.color}20` }}
        >
          {selectedCategory.icon || "📁"}
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800 leading-tight">{selectedCategory.name}</h2>
          {selectedCategory.arabicName && (
            <p className="text-xs text-slate-500" dir="rtl">{selectedCategory.arabicName}</p>
          )}
        </div>
        <span
          className="ml-auto text-xs font-medium px-2 py-1 rounded-full"
          style={{ backgroundColor: `${selectedCategory.color}20`, color: selectedCategory.color }}
        >
          {totalCount} recording{totalCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-5">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Search in ${selectedCategory.name}...`}
          className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(""); fetchAudios(selectedCategory.id, ""); }}
            className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700"
          >
            ✕
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Search
        </button>
      </form>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {/* Audio list */}
      {isLoadingAudios ? (
        <div className="text-center py-16 text-slate-500 text-sm">Loading recordings...</div>
      ) : audios.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-sm">
          {search ? `No recordings match "${search}"` : "No recordings in this category yet"}
        </div>
      ) : (
        <div className="space-y-2">
          {audios.map(audio => (
            <div
              key={audio.id}
              className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors"
            >
              {/* Play button */}
              {(audio.url && audio.isPlayable !== false) ? (
                <button
                  onClick={() => {
                    const url = audio.url!;
                    const a = new Audio(url);
                    a.play().catch(() => window.open(url, "_blank"));
                  }}
                  className="w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105"
                  style={{ backgroundColor: selectedCategory.color || "#059669" }}
                  title="Play"
                >
                  ▶
                </button>
              ) : (
                <div className="w-9 h-9 flex-shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                  {audio.conversionStatus === "pending" ? "⏳" : "—"}
                </div>
              )}

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-800 text-sm truncate">{audio.title}</div>
                <div className="text-xs text-slate-500 truncate">{audio.lecturerName}</div>
              </div>

              {/* Meta */}
              <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400 flex-shrink-0">
                <span>{formatDuration(audio.duration)}</span>
                <span>{formatSize(audio.fileSize)}</span>
                {audio.broadcastReady && (
                  <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs">📡 Live</span>
                )}
                <span className={`px-1.5 py-0.5 rounded text-xs ${
                  audio.visibility === "public" ? "bg-blue-50 text-blue-700" :
                  audio.visibility === "shared" ? "bg-amber-50 text-amber-700" :
                  "bg-slate-100 text-slate-600"
                }`}>
                  {audio.visibility}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
