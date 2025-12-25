'use client';

import { useState, useRef } from 'react';
import { useModal } from '@/lib/contexts/ModalContext';
import Modal from '@/components/ui/Modal';

interface LiveAudioUploadModalProps {
  onUploadSuccess?: () => void;
}

export default function LiveAudioUploadModal({ onUploadSuccess }: LiveAudioUploadModalProps) {
  const { closeModal } = useModal();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    lecturerName: '',
    type: 'adhkar',
    description: '',
    tags: '',
    broadcastReady: true, // Always true for live audio uploads
    visibility: 'shared' as 'private' | 'shared' | 'public'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileSelect = (file: File) => {
    // Get file extension for validation
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    // List of supported audio extensions
    const supportedExtensions = ['mp3', 'wav', 'm4a', 'ogg', 'aac', 'flac', 'amr', '3gp', 'wma'];
    
    // Validate file type - check both MIME type and extension
    const hasValidMimeType = file.type.startsWith('audio/');
    const hasValidExtension = fileExtension && supportedExtensions.includes(fileExtension);
    
    if (!hasValidMimeType && !hasValidExtension) {
      setError(`Please select a valid audio file. Supported formats: ${supportedExtensions.join(', ').toUpperCase()}`);
      return;
    }

    // Validate file size (30MB limit)
    if (file.size > 30 * 1024 * 1024) {
      setError('File size must be less than 30MB');
      return;
    }

    setSelectedFile(file);
    setError(null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUploadAreaClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null); // Reset success state

    if (!selectedFile) {
      setError('Please select an audio file');
      return;
    }

    // Validate required fields
    if (!formData.title.trim() || !formData.lecturerName.trim()) {
      setError('Title and lecturer are required');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', selectedFile);
      uploadFormData.append('title', formData.title.trim());
      uploadFormData.append('lecturerName', formData.lecturerName.trim());
      uploadFormData.append('type', formData.type);
      uploadFormData.append('description', formData.description.trim());
      uploadFormData.append('tags', formData.tags.trim());
      uploadFormData.append('broadcastReady', 'true');
      uploadFormData.append('visibility', formData.visibility);

      const response = await fetch('/api/audio/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      
      // Success
      setUploadProgress(100);
      setSuccess(`Audio "${formData.title}" uploaded successfully and is ready for broadcast!`);
      
      // Call the callback to refresh the audio list
      onUploadSuccess?.();
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        closeModal();
      }, 2000);

    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading && !success) {
      closeModal();
    }
  };

  return (
    <Modal maxWidth="5xl" showCloseButton={false}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-emerald-50 rounded-t-2xl">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Upload Live Broadcast Audio</h2>
          <p className="text-sm text-gray-600 mt-1">
            Upload audio files for live broadcast injection
          </p>
        </div>
        <button
          onClick={handleClose}
          disabled={isUploading || !!success}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-emerald-700 text-sm font-medium">{success}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleFileUpload} className="space-y-4">
          {/* Show success state overlay */}
          {success && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-emerald-800 mb-2">Upload Successful!</h3>
              <p className="text-emerald-700 mb-4">{success}</p>
              <p className="text-sm text-emerald-600">Closing automatically...</p>
            </div>
          )}

          {/* Form content - hidden during success */}
          {!success && (
            <>
              {/* Unified File Upload Area */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Audio File *
                </label>
                <div
                  onClick={handleUploadAreaClick}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    isDragOver
                      ? 'border-emerald-400 bg-emerald-50'
                      : selectedFile
                      ? 'border-emerald-300 bg-emerald-50'
                      : 'border-gray-300 bg-gray-50 hover:border-emerald-300 hover:bg-emerald-50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,.amr,.3gp"
                    onChange={handleFileInputChange}
                    disabled={isUploading}
                    className="hidden"
                  />
                  
                  {selectedFile ? (
                    <div className="flex items-center gap-4 justify-center">
                      <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-emerald-800">{selectedFile.name}</p>
                        <p className="text-sm text-emerald-600">
                          {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                        className="text-sm text-emerald-600 hover:text-emerald-700 underline"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 justify-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-700">Drop your audio file here or click to browse</p>
                        <p className="text-sm text-gray-500">MP3, WAV, M4A, AMR, OGG, AAC, FLAC • Max 30MB</p>
                      </div>
                      <div className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm">
                        Choose File
                      </div>
                    </div>
                  )}
                </div>
              </div>

          {/* Form Fields in Compact Grid */}
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Basic Info */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                disabled={isUploading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50"
                placeholder="Enter audio title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Lecturer/Speaker *
              </label>
              <input
                type="text"
                name="lecturerName"
                value={formData.lecturerName}
                onChange={handleInputChange}
                disabled={isUploading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50"
                placeholder="Enter lecturer name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Content Type
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                disabled={isUploading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50"
              >
                <option value="adhkar">Adhkar</option>
                <option value="lecture">Lecture</option>
                <option value="quran">Quran Recitation</option>
                <option value="hadith">Hadith</option>
                <option value="tafsir">Tafsir</option>
                <option value="qa">Q&A Session</option>
              </select>
            </div>
          </div>

          {/* Second Row */}
          <div className="grid lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Sharing Level
              </label>
              <select
                name="visibility"
                value={formData.visibility}
                onChange={handleInputChange}
                disabled={isUploading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50"
              >
                <option value="shared">Shared with Presenters</option>
                <option value="private">Private (Only Me)</option>
                <option value="public">Public (Everyone)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tags
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                disabled={isUploading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50"
                placeholder="islamic, education, quran"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                disabled={isUploading}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 resize-none"
                placeholder="Optional description"
              />
            </div>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={isUploading}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !selectedFile}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg font-medium hover:from-emerald-700 hover:to-emerald-800 transition-all disabled:opacity-50 shadow-lg"
            >
              {isUploading ? (
                <>
                  <svg className="w-4 h-4 inline mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload for Broadcast
                </>
              )}
            </button>
          </div>
            </>
          )}
        </form>
      </div>
    </Modal>
  );
}