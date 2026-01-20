"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { useModal } from "@/lib/contexts/ModalContext";

interface AudioFile {
  id: string;
  title: string;
  description?: string;
  lecturerName: string;
  category: {
    name: string;
    icon?: string;
    color?: string;
  };
  duration: number;
  fileSize: number;
  url: string;
  visibility: 'private' | 'shared' | 'public';
  sharedWith: string[];
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  broadcastReady: boolean;
  broadcastUsageCount: number;
  createdAt: string;
  isFavorite: boolean;
  isOwner: boolean;
}

interface DeleteAudioModalProps {
  audioFile: AudioFile;
  onConfirm: () => Promise<void>;
  apiEndpoint?: string;
  isLiveAudio?: boolean;
}

export default function DeleteAudioModal({ 
  audioFile, 
  onConfirm, 
  apiEndpoint = '/api/audio/recordings',
  isLiveAudio = false 
}: DeleteAudioModalProps) {
  const { closeModal } = useModal();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      closeModal();
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal maxWidth="responsive" showCloseButton={false}>
      <div className="p-6 sm:p-8 lg:p-10">
        {/* Header Section */}
        <div className="text-center mb-6 sm:mb-8">
          {/* Premium Icon with Gradient */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mx-auto mb-4 sm:mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-red-400 to-red-600 rounded-full opacity-20 animate-pulse"></div>
            <div className="relative w-full h-full bg-gradient-to-br from-red-50 to-red-100 rounded-full flex items-center justify-center border-2 border-red-200">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
          </div>

          {/* Premium Title */}
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-2 sm:mb-3">
            Delete Audio Recording
          </h2>
          
          {/* Subtitle */}
          <p className="text-sm sm:text-base lg:text-lg text-slate-600 max-w-md mx-auto leading-relaxed">
            This action will permanently remove the audio file and cannot be undone
          </p>
        </div>

        {/* Audio Info Card - Premium Design */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 border border-slate-200 shadow-sm">
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Audio Icon */}
            <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
            </div>
            
            {/* Audio Details */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 text-sm sm:text-base lg:text-lg mb-1 sm:mb-2 line-clamp-2">
                "{audioFile.title}"
              </h3>
              <p className="text-xs sm:text-sm lg:text-base text-slate-600 mb-2">
                by <span className="font-medium">{audioFile.lecturerName}</span>
              </p>
              
              {/* Additional Info */}
              <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  {audioFile.category.name}
                </span>
                {audioFile.broadcastUsageCount > 0 && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                    </svg>
                    Used {audioFile.broadcastUsageCount} times
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Warning Message */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 mb-6 sm:mb-8">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 flex-shrink-0 mt-0.5">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm sm:text-base font-medium text-amber-800 mb-1">
                Permanent Action
              </p>
              <p className="text-xs sm:text-sm text-amber-700">
                This will permanently delete the audio file from storage. This action cannot be reversed.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons - Premium Design */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            onClick={closeModal}
            disabled={isDeleting}
            className="flex-1 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 text-sm sm:text-base font-semibold text-slate-700 bg-white border-2 border-slate-300 rounded-lg sm:rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 text-sm sm:text-base font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 rounded-lg sm:rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {isDeleting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Deleting...
              </span>
            ) : (
              "Delete Recording"
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}