'use client';

import React, { useState } from 'react';
import {
  initFFmpeg,
  convertAudioToMP3,
  needsBrowserConversion,
  getFileExtension,
} from '@/lib/utils/audio-converter-browser';

interface AudioUploadWithConversionProps {
  onFileReady: (file: File, isConverted: boolean) => void;
  isLoading?: boolean;
}

/**
 * Audio upload component with browser-side AMR→MP3 conversion
 * Allows admins to convert unsupported formats before upload
 */
export default function AudioUploadWithConversion({
  onFileReady,
  isLoading = false,
}: AudioUploadWithConversionProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [ffmpegReady, setFFmpegReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize FFmpeg on first interaction
   */
  const handleInitFFmpeg = async () => {
    if (ffmpegReady) return;

    try {
      setConverting(true);
      setError(null);
      console.log('⏳ Loading audio conversion library (this may take 20-30 seconds)...');
      await initFFmpeg();
      setFFmpegReady(true);
      setConverting(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setConverting(false);
    }
  };

  /**
   * Handle file selection
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    setError(null);
    setSelectedFile(file);

    // Check if conversion is needed
    const extension = getFileExtension(file.name);
    const needsConversion = needsBrowserConversion(extension);

    if (needsConversion) {
      console.log(`🎵 File format detected: ${extension} - Conversion available`);
    } else {
      console.log(`✅ File format detected: ${extension} - No conversion needed`);
      // File is already in browser-compatible format
      onFileReady(file, false);
      setSelectedFile(null);
    }
  };

  /**
   * Handle conversion
   */
  const handleConvert = async () => {
    if (!selectedFile) return;

    try {
      setError(null);
      setConverting(true);
      setConversionProgress(0);

      // Initialize FFmpeg if needed
      if (!ffmpegReady) {
        await handleInitFFmpeg();
      }

      console.log(`🎵 Converting ${selectedFile.name} to MP3...`);
      
      const convertedFile = await convertAudioToMP3(selectedFile, (progress) => {
        setConversionProgress(progress);
      });

      console.log(`✅ Conversion complete: ${convertedFile.name}`);
      onFileReady(convertedFile, true);
      setSelectedFile(null);
      setConversionProgress(0);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      console.error('❌ Conversion failed:', message);
    } finally {
      setConverting(false);
    }
  };

  /**
   * Handle skip (use original file)
   */
  const handleSkip = () => {
    if (selectedFile) {
      onFileReady(selectedFile, false);
      setSelectedFile(null);
    }
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    setSelectedFile(null);
    setError(null);
    setConversionProgress(0);
  };

  const fileExtension = selectedFile ? getFileExtension(selectedFile.name) : null;
  const needsConversion =
    selectedFile && fileExtension ? needsBrowserConversion(fileExtension) : false;
  const fileSizeMB = selectedFile ? (selectedFile.size / (1024 * 1024)).toFixed(2) : null;

  return (
    <div className="space-y-4">
      {/* File Input */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-500 transition">
        <input
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          disabled={isLoading || converting}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
        />
        <p className="text-sm text-gray-600 mt-2">
          Supported: MP3, WAV, M4A, OGG, AMR, 3GP, WMA
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          ❌ {error}
        </div>
      )}

      {/* File Selected - Show Options */}
      {selectedFile && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="mb-3">
            <p className="font-semibold text-blue-900">📁 {selectedFile.name}</p>
            <p className="text-sm text-blue-700">
              Format: {fileExtension?.toUpperCase()} | Size: {fileSizeMB} MB
            </p>
          </div>

          {needsConversion && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
              <p className="text-sm text-yellow-800">
                ⚠️ <strong>AMR files need conversion</strong> for browser playback
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Click "Convert to MP3" to convert before uploading
              </p>
            </div>
          )}

          {/* Conversion Progress */}
          {converting && (
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">
                  {!ffmpegReady ? '⏳ Loading conversion library...' : `Converting... ${conversionProgress}%`}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${conversionProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-2">
                💡 First conversion takes 20-30 seconds (downloading conversion library)
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {needsConversion ? (
              <>
                <button
                  onClick={handleConvert}
                  disabled={converting || isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded transition"
                >
                  {!ffmpegReady && !converting
                    ? '🎵 Convert to MP3'
                    : converting
                      ? 'Converting...'
                      : '✅ Conversion Ready'}
                </button>
                <button
                  onClick={handleSkip}
                  disabled={converting || isLoading}
                  className="bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded transition"
                >
                  Skip
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSkip}
                  disabled={isLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded transition"
                >
                  ✅ Use This File
                </button>
              </>
            )}
            <button
              onClick={handleCancel}
              disabled={converting || isLoading}
              className="bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-700">
        <p className="font-semibold mb-1">📋 Format Support:</p>
        <p className="mb-2">
          ✅ <strong>Direct playback:</strong> MP3, WAV, M4A, OGG
        </p>
        <p>
          🔄 <strong>Convert before upload:</strong> AMR, 3GP, WMA
        </p>
      </div>
    </div>
  );
}
