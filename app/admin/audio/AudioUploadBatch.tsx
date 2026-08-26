"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { SerializedAdmin } from "@/lib/types/admin";
import { getSupportedMimeTypes, SUPPORTED_AUDIO_FORMATS, getFormatByExtension } from "@/lib/utils/audio-formats";
import LecturerComboBox from "./LecturerComboBox";
import CircularProgress from "./CircularProgress";

interface BatchFile {
  id: string;
  file: File;
  title: string;
  description: string;
  lecturerName: string;
  type: "quran" | "hadith" | "tafsir" | "lecture" | "adhkar" | "qa";
  tags: string;
  year: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

interface AudioUploadBatchProps {
  admin: SerializedAdmin;
  onUploadSuccess: () => void;
}

export default function AudioUploadBatch({ admin, onUploadSuccess }: AudioUploadBatchProps) {
  const canUpload = admin.role === "super_admin" || admin.role === "admin";

  if (!canUpload) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-xl font-semibold text-amber-800 mb-2">Batch Upload Restricted</h3>
          <p className="text-amber-700">Only administrators can upload audio files.</p>
        </div>
      </div>
    );
  }

  const [files, setFiles] = useState<BatchFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxFileSize = 30 * 1024 * 1024;
  const supportedExtensions = Object.keys(SUPPORTED_AUDIO_FORMATS).map(ext => `.${ext}`);

  const validateFile = (file: File): string | null => {
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    if (!fileExtension || !getFormatByExtension(fileExtension)) {
      return `Unsupported format: .${fileExtension}`;
    }
    if (file.size > maxFileSize) {
      return `File too large: ${(file.size / (1024 * 1024)).toFixed(1)}MB`;
    }
    return null;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const addFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => {
      const error = validateFile(file);
      if (error) {
        setGlobalError(`${file.name}: ${error}`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    const batchFiles: BatchFile[] = validFiles.map(file => ({
      id: Math.random().toString(36),
      file,
      title: file.name.replace(/\.[^/.]+$/, ""),
      description: "",
      lecturerName: "",
      type: "lecture" as const,
      tags: "",
      year: new Date().getFullYear().toString(),
      status: "pending" as const,
      progress: 0,
    }));

    setFiles(prev => [...prev, ...batchFiles]);
    setGlobalError("");
  };

  const updateFile = (id: string, updates: Partial<BatchFile>) => {
    setFiles(prev =>
      prev.map(f => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const uploadSingleFile = async (batchFile: BatchFile): Promise<boolean> => {
    try {
      updateFile(batchFile.id, { status: "uploading", progress: 0 });

      // Step 1: Get presigned URL
      const contentType = batchFile.file.type || "audio/mpeg";
      const urlRes = await fetch("/api/audio/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: batchFile.file.name,
          contentType,
          fileSize: batchFile.file.size,
        }),
      });

      if (!urlRes.ok) {
        const err = await urlRes.json();
        updateFile(batchFile.id, { status: "error", error: err.message || "Failed to get upload URL" });
        return false;
      }

      const { presignedUrl, storageKey, storageUrl, cdnUrl } = await urlRes.json();

      // Step 2: PUT directly to DigitalOcean Spaces
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 90);
            updateFile(batchFile.id, { progress: pct });
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Storage upload failed: ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Network error during upload")));

        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader("Content-Type", contentType);
        xhr.setRequestHeader("x-amz-acl", "public-read");
        xhr.send(batchFile.file);
      });

      updateFile(batchFile.id, { progress: 95 });

      // Step 3: Save metadata
      const metaRes = await fetch("/api/audio/complete-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storageKey, storageUrl, cdnUrl,
          fileSize: batchFile.file.size,
          fileName: batchFile.file.name,
          contentType,
          title: batchFile.title.trim(),
          description: batchFile.description.trim(),
          lecturerName: batchFile.lecturerName.trim(),
          type: batchFile.type,
          tags: batchFile.tags.trim(),
          year: batchFile.year.trim() || undefined,
          visibility: "public",
          broadcastReady: false,
          preferredStorage: "digitalocean",
        }),
      });

      const result = await metaRes.json();

      if (result.success) {
        updateFile(batchFile.id, { status: "success", progress: 100 });
        return true;
      } else {
        updateFile(batchFile.id, { status: "error", error: result.message || "Upload failed" });
        return false;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      updateFile(batchFile.id, { status: "error", error: msg });
      return false;
    }
  };

  const uploadAll = async () => {
    const pendingFiles = files.filter(f => f.status === "pending");
    if (pendingFiles.length === 0) return;

    setUploading(true);
    setGlobalError("");

    for (const file of pendingFiles) {
      await uploadSingleFile(file);
      // Small delay between uploads to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setUploading(false);
    onUploadSuccess();
  };

  const pendingCount = files.filter(f => f.status === "pending").length;
  const successCount = files.filter(f => f.status === "success").length;
  const errorCount = files.filter(f => f.status === "error").length;
  const uploadingCount = files.filter(f => f.status === "uploading").length;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="space-y-6">
        {/* Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            isDragOver
              ? "border-emerald-500 bg-emerald-50"
              : "border-slate-300 hover:border-emerald-400 bg-white"
          }`}
        >
          <div className="text-5xl mb-3">{isDragOver ? "📥" : "🎵"}</div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">
            Drop multiple audio files here
          </h3>
          <p className="text-slate-600 mb-3">
            or{" "}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-emerald-600 hover:text-emerald-700 font-medium"
            >
              click to browse
            </button>
          </p>
          <p className="text-xs text-slate-500">
            Supported: {supportedExtensions.join(", ")} • Max {maxFileSize / (1024 * 1024)}MB each
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={supportedExtensions.join(",")}
            multiple
            onChange={(e) => {
              if (e.target.files) {
                addFiles(Array.from(e.target.files));
              }
            }}
            className="hidden"
          />
        </div>

        {/* Global Error */}
        {globalError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm">{globalError}</p>
          </div>
        )}

        {/* Files List */}
        {files.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                📋 {files.length} file{files.length !== 1 ? "s" : ""} selected
              </h3>
              <div className="flex gap-4 text-sm">
                {pendingCount > 0 && (
                  <span className="text-slate-600">
                    ⏳ {pendingCount} pending
                  </span>
                )}
                {uploadingCount > 0 && (
                  <span className="text-blue-600">
                    ⬆️ {uploadingCount} uploading
                  </span>
                )}
                {successCount > 0 && (
                  <span className="text-emerald-600">
                    ✅ {successCount} success
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="text-red-600">
                    ❌ {errorCount} error
                  </span>
                )}
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {files.map((batchFile) => (
                <div
                  key={batchFile.id}
                  className="p-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors"
                >
                  <div className="space-y-3">
                    {/* File Name & Status */}
                    <div className="flex items-center gap-3 justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-lg flex-shrink-0">
                          {batchFile.status === "success"
                            ? "✅"
                            : batchFile.status === "error"
                            ? "❌"
                            : batchFile.status === "uploading"
                            ? "⬆️"
                            : "📁"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-800 truncate text-sm">
                            {batchFile.file.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {(batchFile.file.size / (1024 * 1024)).toFixed(1)}MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(batchFile.id)}
                        disabled={batchFile.status === "uploading"}
                        className="text-red-600 hover:text-red-700 disabled:opacity-50 text-sm flex-shrink-0"
                      >
                        Remove
                      </button>
                    </div>

                    {/* Progress Circle */}
                    {batchFile.status !== "pending" && (
                      <div className="flex justify-center py-2">
                        <CircularProgress 
                          percentage={batchFile.progress}
                          size={80}
                          strokeWidth={8}
                        />
                      </div>
                    )}

                    {/* Error Message */}
                    {batchFile.error && (
                      <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                        {batchFile.error}
                      </p>
                    )}

                    {/* Metadata Form */}
                    {batchFile.status === "pending" && (
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        {/* Title */}
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={batchFile.title}
                            onChange={(e) =>
                              updateFile(batchFile.id, { title: e.target.value })
                            }
                            placeholder="Title *"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            required
                          />
                        </div>

                        {/* Lecturer */}
                        <div className="col-span-2">
                          <div className="text-sm font-medium text-slate-700 mb-1">
                            Speaker/Lecturer *
                          </div>
                          <LecturerComboBox
                            value={batchFile.lecturerName}
                            onChange={(value) =>
                              updateFile(batchFile.id, {
                                lecturerName: value,
                              })
                            }
                            placeholder="Select or enter speaker name"
                            required
                          />
                        </div>

                        {/* Type */}
                        <select
                          value={batchFile.type}
                          onChange={(e) =>
                            updateFile(batchFile.id, {
                              type: e.target.value as any,
                            })
                          }
                          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="lecture">Lecture</option>
                          <option value="qa">Q&A</option>
                          <option value="quran">Quran</option>
                          <option value="hadith">Hadith</option>
                          <option value="tafsir">Tafsir</option>
                          <option value="adhkar">Adhkar</option>
                        </select>

                        {/* Year */}
                        <input
                          type="number"
                          value={batchFile.year}
                          onChange={(e) =>
                            updateFile(batchFile.id, { year: e.target.value })
                          }
                          placeholder="Year"
                          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                          min="1400"
                          max={new Date().getFullYear() + 1}
                        />

                        {/* Description */}
                        <textarea
                          value={batchFile.description}
                          onChange={(e) =>
                            updateFile(batchFile.id, {
                              description: e.target.value,
                            })
                          }
                          placeholder="Description (optional)"
                          className="col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 resize-none"
                          rows={2}
                        />

                        {/* Tags */}
                        <input
                          type="text"
                          value={batchFile.tags}
                          onChange={(e) =>
                            updateFile(batchFile.id, { tags: e.target.value })
                          }
                          placeholder="Tags (comma-separated)"
                          className="col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                type="button"
                onClick={() => setFiles([])}
                disabled={uploading}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium disabled:opacity-50"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={uploadAll}
                disabled={uploading || pendingCount === 0}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading
                  ? `Uploading... (${files.filter(f => f.status === "uploading").length}/${files.length})`
                  : `Upload ${pendingCount} file${pendingCount !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
