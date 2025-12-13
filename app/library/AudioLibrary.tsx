"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AudioPlayer from "./AudioPlayer";
import AudioCard from "./AudioCard";

interface AudioRecording {
  _id: string;
  title: string;
  description?: string;
  lecturerName: string;
  type: "quran" | "hadith" | "tafsir" | "lecture" | "dua";
  tags: string[];
  year?: number;
  duration: number;
  format: string;
  uploadDate: string;
  playCount: number;
  category: {
    name: string;
    arabicName?: string;
    icon: string;
    color: string;
  };
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalRecordings: number;
  recordingsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function AudioLibrary() {
  const [recordings, setRecordings] = useState<AudioRecording[]>([]);
  const [lecturers, setLecturers] = useState<string[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterLecturer, setFilterLecturer] = useState("all");
  const [sortBy, setSortBy] = useState("uploadDate");
  const [currentPage, setCurrentPage] = useState(1);
  
  // Audio player state
  const [currentlyPlaying, setCurrentlyPlaying] = useState<AudioRecording | null>(null);
  const [isPlayerVisible, setIsPlayerVisible] = useState(false);

  useEffect(() => {
    fetchRecordings();
  }, [searchQuery, filterType, filterLecturer, sortBy, currentPage]);

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "12",
        sortBy: sortBy,
        sortOrder: "desc"
      });

      // Only add filters if they're not "all"
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }
      if (filterType && filterType !== "all") {
        params.append("type", filterType);
      }
      if (filterLecturer && filterLecturer !== "all") {
        params.append("lecturer", filterLecturer);
      }

      console.log("🔍 Fetching with params:", params.toString());

      const response = await fetch(`/api/audio/public?${params}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch recordings");
      }
      
      const data = await response.json();
      console.log("📚 Library API Response:", data);
      
      if (data.success && data.data) {
        console.log("✅ Setting recordings:", data.data.recordings.length, "items");
        setRecordings(data.data.recordings || []);
        setPagination(data.data.pagination);
        
        // Extract unique lecturers from recordings
        const uniqueLecturers = [...new Set(data.data.recordings.map((r: AudioRecording) => r.lecturerName))].filter((name): name is string => typeof name === 'string');
        setLecturers(uniqueLecturers);
      } else {
        console.log("❌ No data or unsuccessful response");
        setRecordings([]);
        setPagination(null);
        setLecturers([]);
      }
    } catch (error) {
      console.error("Error fetching recordings:", error);
      setError("Failed to load audio recordings");
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAudio = (recording: AudioRecording) => {
    setCurrentlyPlaying(recording);
    setIsPlayerVisible(true);
  };

  const handleClosePlayer = () => {
    setIsPlayerVisible(false);
    setCurrentlyPlaying(null);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchRecordings();
  };

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case "quran": return "📖";
      case "hadith": return "📜";
      case "tafsir": return "📝";
      case "lecture": return "📚";
      case "dua": return "🤲";
      default: return "🎵";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="inline-flex items-center gap-2 text-emerald-700 hover:text-emerald-800 font-semibold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Radio
              </Link>
              <div className="h-6 w-px bg-emerald-200"></div>
              <h1 className="text-xl font-bold text-emerald-900">📚 Audio Library</h1>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/radio"
                className="px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-all"
              >
                📻 Live Radio
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-emerald-100 p-6 mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by title, lecturer, or topic..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              
              {/* Type Filter */}
              <div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="all">All Types</option>
                  <option value="quran">📖 Quran</option>
                  <option value="hadith">📜 Hadith</option>
                  <option value="tafsir">📝 Tafsir</option>
                  <option value="lecture">📚 Lecture</option>
                  <option value="dua">🤲 Dua</option>
                </select>
              </div>
              
              {/* Lecturer Filter */}
              <div>
                <select
                  value={filterLecturer}
                  onChange={(e) => setFilterLecturer(e.target.value)}
                  className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="all">All Lecturers</option>
                  {lecturers.map((lecturer) => (
                    <option key={lecturer} value={lecturer}>
                      {lecturer}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Sort */}
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="uploadDate">Latest First</option>
                  <option value="title">Title A-Z</option>
                  <option value="lecturerName">Lecturer A-Z</option>
                  <option value="playCount">Most Popular</option>
                </select>
              </div>
              
              {/* Search Button */}
              <button
                type="submit"
                className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold"
              >
                🔍 Search
              </button>
            </div>
          </form>
        </div>

        {/* Results Summary */}
        {pagination && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-slate-600">
              {pagination.totalRecordings} recordings found
              {searchQuery && ` for "${searchQuery}"`}
            </p>
            <button
              onClick={fetchRecordings}
              className="px-4 py-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              🔄 Refresh
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            <p className="mt-4 text-slate-600">Loading audio recordings...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">❌</div>
            <p className="text-lg text-red-600 mb-2">Error Loading Recordings</p>
            <p className="text-slate-600 mb-4">{error}</p>
            <button
              onClick={fetchRecordings}
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Recordings Grid */}
        {!loading && !error && (
          <>
            {recordings.length === 0 ? (
              <div className="text-center py-12 bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-emerald-100">
                <div className="text-6xl mb-4">🎵</div>
                <p className="text-lg text-slate-600 mb-2">No recordings found</p>
                <p className="text-slate-500">
                  Try adjusting your search or filters
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {recordings.map((recording) => (
                  <AudioCard
                    key={recording._id}
                    recording={recording}
                    onPlay={() => handlePlayAudio(recording)}
                    isPlaying={currentlyPlaying?._id === recording._id}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <span className="px-4 py-2 text-sm text-slate-600">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Audio Player */}
      {isPlayerVisible && currentlyPlaying && (
        <AudioPlayer
          recording={currentlyPlaying}
          onClose={handleClosePlayer}
        />
      )}
    </div>
  );
}