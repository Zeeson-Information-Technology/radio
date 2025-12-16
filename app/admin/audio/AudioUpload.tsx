"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { SerializedAdmin } from "@/lib/types/admin";
import { getSupportedMimeTypes, SUPPORTED_AUDIO_FORMATS, getFormatByExtension } from "@/lib/utils/audio-formats";
import SupportedFormats from "./SupportedFormats";
import CircularProgress from "./CircularProgress";

interface AudioUploadProps {
  admin: SerializedAdmin;
  onUploadSuccess: () => void;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

type UploadStatus = "idle" | "uploading" | "processing" | "success" | "error";

interface UploadStage {
  name: string;
  progress: number;
  description: string;
}

export default function AudioUpload({ admin, onUploadSuccess }: AudioUploadProps) {
  // Check if user has permission to upload audio
  const canUpload = admin.role === "super_admin" || admin.role === "admin";

  if (!canUpload) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-xl font-semibold text-amber-800 mb-2">
            Audio Upload Restricted
          </h3>
          <p className="text-amber-700 mb-4">
            Only administrators can upload audio files to the library.
          </p>
          <p className="text-sm text-amber-600">
            Your current role: <span className="font-medium capitalize">{admin.role.replace('_', ' ')}</span>
          </p>
          <p className="text-xs text-amber-500 mt-2">
            Contact a super administrator if you need upload permissions.
          </p>
        </div>
      </div>
    );
  }
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({ loaded: 0, total: 0, percentage: 0 });
  const [currentStage, setCurrentStage] = useState<UploadStage>({ name: "preparing", progress: 0, description: "Preparing upload..." });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  
  // Form data
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lecturerName, setLecturerName] = useState("");
  const [type, setType] = useState<"quran" | "hadith" | "tafsir" | "lecture" | "dua" | "qa">("lecture");


  const [tags, setTags] = useState("");
  const [year, setYear] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);



  // Audio format validation
  const supportedMimeTypes = getSupportedMimeTypes();
  const supportedExtensions = Object.keys(SUPPORTED_AUDIO_FORMATS).map(ext => `.${ext}`);
  const maxFileSize = 20 * 1024 * 1024; // 20MB - balanced for usability and cost

  const validateFile = (file: File): string | null => {
    // Get file extension first
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    
    // Check if extension is supported
    if (!fileExtension || !getFormatByExtension(fileExtension)) {
      return `Unsupported file extension: .${fileExtension || 'unknown'}. Please use: ${supportedExtensions.join(", ")}`;
    }

    // For certain formats (like AMR), MIME type might be empty or unrecognized
    // So we prioritize file extension validation over MIME type
    const formatInfo = getFormatByExtension(fileExtension);
    const hasValidMimeType = file.type && supportedMimeTypes.includes(file.type);
    const hasValidExtension = formatInfo !== null;
    
    // Accept if either MIME type is valid OR extension is valid (for formats like AMR)
    if (!hasValidMimeType && !hasValidExtension) {
      return `Unsupported file format: ${file.type || 'unknown'}. Please use: ${supportedExtensions.join(", ")}`;
    }

    // Check file size with helpful guidance
    if (file.size > maxFileSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const maxSizeMB = maxFileSize / (1024 * 1024);
      return `File too large (${sizeMB}MB). Maximum size is ${maxSizeMB}MB. Please compress your audio file or use a more efficient format like MP3 or M4A.`;
    }

    return null;
  };

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSelectedFile(file);
    setError("");
    
    // Auto-fill title from filename if empty
    if (!title) {
      const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
      setTitle(nameWithoutExtension);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const resetForm = () => {
    setSelectedFile(null);
    setTitle("");
    setDescription("");
    setLecturerName("");
    setType("lecture");

    setTags("");
    setYear("");
    setUploadStatus("idle");
    setUploadProgress({ loaded: 0, total: 0, percentage: 0 });
    setCurrentStage({ name: "preparing", progress: 0, description: "Preparing upload..." });
    setError("");
    setMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError("Please select an audio file");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }

    if (!lecturerName.trim()) {
      setError("Please enter the lecturer/speaker name");
      return;
    }



    setUploadStatus("uploading");
    setError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("lecturerName", lecturerName.trim());
      formData.append("type", type);

      formData.append("tags", tags.trim());
      if (year.trim()) {
        formData.append("year", year.trim());
      }

      const xhr = new XMLHttpRequest();

      // Track upload progress with realistic stages
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const uploadPercentage = Math.round((e.loaded / e.total) * 100);
          // Upload is only 60% of the total process
          const totalProgress = Math.round(uploadPercentage * 0.6);
          
          setUploadProgress({
            loaded: e.loaded,
            total: e.total,
            percentage: uploadPercentage
          });
          
          setCurrentStage({
            name: "uploading",
            progress: totalProgress,
            description: "Uploading to server..."
          });
        }
      });

      // Handle response
      xhr.addEventListener("load", () => {
        // Simulate processing stages
        setCurrentStage({
          name: "processing",
          progress: 70,
          description: "Processing audio file..."
        });
        
        setTimeout(() => {
          setCurrentStage({
            name: "saving",
            progress: 85,
            description: "Saving to database..."
          });
          
          setTimeout(() => {
            if (xhr.status === 200) {
              const response = JSON.parse(xhr.responseText);
              if (response.success) {
                setCurrentStage({
                  name: "complete",
                  progress: 100,
                  description: "Upload complete!"
                });
                
                setTimeout(() => {
                  setUploadStatus("success");
                  setMessage("Audio uploaded successfully!");
                  setTimeout(() => {
                    resetForm();
                    onUploadSuccess();
                  }, 2000);
                }, 500);
              } else {
                setUploadStatus("error");
                setError(response.message || "Upload failed");
              }
            } else {
              setUploadStatus("error");
              let errorMessage = `Upload failed: ${xhr.statusText}`;
              
              // Check for schema validation error
              if (xhr.responseText && xhr.responseText.includes('not a valid enum value')) {
                errorMessage = "Database schema needs updating. Please restart the development server and try again.";
              }
              
              setError(errorMessage);
            }
          }, 800);
        }, 600);
      });

      xhr.addEventListener("error", () => {
        setUploadStatus("error");
        setError("Network error during upload");
      });

      // Start upload
      xhr.open("POST", "/api/audio/upload");
      xhr.send(formData);

    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("error");
      setError("An unexpected error occurred");
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">📁 Select Audio File</h3>
          
          {!selectedFile ? (
            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-emerald-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-6xl mb-4">🎵</div>
              <p className="text-lg font-medium text-slate-700 mb-2">
                Drop your audio file here or click to browse
              </p>
              <p className="text-sm text-slate-500 mb-4">
                Supported formats: {supportedExtensions.join(", ")}
              </p>
              <p className="text-xs text-slate-400">
                Maximum file size: {maxFileSize / (1024 * 1024)}MB (cost-optimized)
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept={supportedExtensions.join(",")}
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                    🎵
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800 break-words" title={selectedFile.name}>
                      {selectedFile.name}
                    </p>
                    <p className="text-sm text-slate-600">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-red-600 hover:text-red-700 p-2 flex-shrink-0"
                  title="Remove file"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Metadata Section */}
        {selectedFile && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">📝 Audio Information</h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Enter the audio title"
                  required
                />
              </div>

              {/* Lecturer Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Speaker/Lecturer *
                </label>
                <input
                  type="text"
                  value={lecturerName}
                  onChange={(e) => setLecturerName(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Enter speaker name"
                  required
                />
              </div>

              {/* Content Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Content Type *
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                >
                  <option value="lecture">📚 Lecture</option>
                  <option value="qa">❓ Question & Answer</option>
                  <option value="quran">📖 Quran Recitation</option>
                  <option value="hadith">📜 Hadith</option>
                  <option value="tafsir">📝 Tafsir</option>
                  <option value="dua">🤲 Dua</option>
                </select>
              </div>

              {/* Year */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Year (Optional)
                </label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="e.g., 2024"
                  min="1400"
                  max={new Date().getFullYear() + 1}
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Brief description of the audio content"
                />
              </div>

              {/* Tags */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tags (Optional)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Enter tags separated by commas (e.g., ramadan, prayer, youth)"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Separate multiple tags with commas
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Upload Progress Overlay */}
        {uploadStatus === "uploading" && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-200 max-w-sm sm:max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex flex-col items-center text-center space-y-4 sm:space-y-6">
                <h3 className="text-xl font-semibold text-slate-800">⬆️ Uploading Audio</h3>
                
                {/* Circular Progress */}
                <CircularProgress 
                  percentage={currentStage.progress}
                  size={160}
                  strokeWidth={12}
                />
                
                {/* Upload Details */}
                <div className="space-y-3 text-slate-600 w-full">
                  <div className="font-medium text-lg break-words text-center px-2" title={selectedFile?.name}>
                    {selectedFile?.name && selectedFile.name.length > 40 
                      ? `${selectedFile.name.substring(0, 37)}...` 
                      : selectedFile?.name
                    }
                  </div>
                  <div className="text-sm text-center">{currentStage.description}</div>
                  {uploadProgress.total > 0 && (
                    <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
                      <span>{formatFileSize(uploadProgress.loaded)}</span>
                      <span>•</span>
                      <span>{formatFileSize(uploadProgress.total)}</span>
                    </div>
                  )}
                </div>
                
                {/* Stage Indicator */}
                <div className="w-full">
                  <div className="flex justify-between text-xs text-slate-400 mb-2">
                    <span className={currentStage.name === "uploading" ? "text-emerald-600 font-medium" : ""}>Upload</span>
                    <span className={currentStage.name === "processing" ? "text-emerald-600 font-medium" : ""}>Process</span>
                    <span className={currentStage.name === "saving" ? "text-emerald-600 font-medium" : ""}>Save</span>
                    <span className={currentStage.name === "complete" ? "text-emerald-600 font-medium" : ""}>Complete</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${currentStage.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <span>❌</span>
              <span className="font-medium">Error</span>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        )}

        {message && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-emerald-800">
              <span>✅</span>
              <span className="font-medium">Success</span>
            </div>
            <p className="text-emerald-700 mt-1">{message}</p>
          </div>
        )}

        {/* Submit Button */}
        {selectedFile && uploadStatus !== "success" && (
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 sm:px-6 py-2.5 sm:py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm sm:text-base"
              disabled={uploadStatus === "uploading"}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploadStatus === "uploading" || !selectedFile || !title.trim() || !lecturerName.trim()}
              className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {uploadStatus === "uploading" ? (
                <span className="hidden sm:inline">Uploading...</span>
              ) : (
                <span className="hidden sm:inline">Upload Audio</span>
              )}
              <span className="sm:hidden">{uploadStatus === "uploading" ? "Uploading..." : "Upload"}</span>
            </button>
          </div>
        )}
      </form>

      {/* Supported Formats Information */}
      <div className="mt-8">
        <SupportedFormats />
      </div>
    </div>
  );
}