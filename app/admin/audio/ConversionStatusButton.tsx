/**
 * ConversionStatusButton Component
 * Provides manual refresh functionality for conversion status
 * Requirements: 1.1, 1.2, 1.5, 3.3, 3.4
 */

"use client";

import { useState } from 'react';
import { AudioFile } from '@/lib/utils/audioAccessUtils';

interface ConversionStatusButtonProps {
  convertingFiles: AudioFile[];
  onStatusCheck: () => Promise<void>;
  isLoading: boolean;
}

export default function ConversionStatusButton({
  convertingFiles,
  onStatusCheck,
  isLoading
}: ConversionStatusButtonProps) {
  // Only render when there are converting files (Requirements 1.1, 1.2, 3.4)
  if (convertingFiles.length === 0) {
    return null;
  }

  const handleClick = async () => {
    try {
      await onStatusCheck();
    } catch (error) {
      console.error('Failed to check conversion status:', error);
    }
  };

  return (
    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white flex-shrink-0">
            🔄
          </div>
          <div>
            <h3 className="font-medium text-blue-900">
              Files Converting
            </h3>
            <p className="text-sm text-blue-700">
              {convertingFiles.length} file{convertingFiles.length !== 1 ? 's' : ''} currently converting to MP3
            </p>
          </div>
        </div>

        <button
          onClick={handleClick}
          disabled={isLoading}
          className={`
            px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
            ${isLoading 
              ? 'bg-blue-300 text-blue-600 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
            }
            flex items-center gap-2 min-w-[140px] justify-center
          `}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              Checking...
            </>
          ) : (
            <>
              <span>🔍</span>
              Check Status
            </>
          )}
        </button>
      </div>

      {/* Show list of converting files */}
      {convertingFiles.length > 0 && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          <div className="text-xs text-blue-600 mb-2 font-medium">Converting Files:</div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {convertingFiles.slice(0, 5).map((file) => (
              <div key={file.id} className="flex items-center gap-2 text-xs text-blue-700">
                <div className={`
                  w-2 h-2 rounded-full flex-shrink-0
                  ${file.conversionStatus === 'processing' 
                    ? 'bg-blue-500 animate-pulse' 
                    : 'bg-blue-400'
                  }
                `}></div>
                <span className="truncate" title={file.title}>
                  {file.title}
                </span>
                <span className="text-blue-500 capitalize flex-shrink-0">
                  {file.conversionStatus}
                </span>
              </div>
            ))}
            {convertingFiles.length > 5 && (
              <div className="text-xs text-blue-500 italic">
                +{convertingFiles.length - 5} more files...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}