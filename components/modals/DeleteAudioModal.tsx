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
    <Modal maxWidth="md" showCloseButton={false}>
      {/* Icon */}
      <div className="flex justify-center pt-8 pb-4">
        <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center shadow-lg">
          <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 pb-8 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {isLiveAudio ? 'Delete Broadcast Audio' : 'Delete Audio Recording'}
        </h2>
        
        <p className="text-gray-600 mb-6">
          {isLiveAudio 
            ? 'Are you sure you want to delete this broadcast audio file?' 
            : 'Are you sure you want to delete this recording?'
          }
        </p>

        {/* Recording Title */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 mb-6 border border-gray-200">
          <p className="font-semibold text-gray-900 text-lg">
            "{audioFile.title}"
          </p>
          <p className="text-sm text-gray-600 mt-1">
            by {audioFile.lecturerName}
          </p>
        </div>

        {/* Broadcast Usage Warning - Only for live audio */}
        {isLiveAudio && audioFile.broadcastUsageCount > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg p-3 mb-6 border border-amber-200">
            <div className="flex items-center justify-center gap-2 text-amber-800">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <span className="text-sm font-medium">
                Used {audioFile.broadcastUsageCount} time{audioFile.broadcastUsageCount !== 1 ? 's' : ''} in broadcasts
              </span>
            </div>
          </div>
        )}

        {/* Sharing Warning - Only for shared files */}
        {audioFile.visibility === 'shared' && audioFile.sharedWith.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3 mb-6 border border-blue-200">
            <div className="flex items-center justify-center gap-2 text-blue-800">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zM4 18v-4h2v4h2v2H4c-1.1 0-2-.9-2-2zm0-6V6c0-1.1.9-2 2-2h6v2H6v6H4zm16 0V6h-6V4h6c1.1 0 2 .9 2 2v6h-2zm0 6v-4h2v4c0 1.1-.9 2-2 2h-6v-2h6z"/>
              </svg>
              <span className="text-sm font-medium">
                Shared with {audioFile.sharedWith.length} presenter{audioFile.sharedWith.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}

        {/* Warning */}
        <div className="flex items-center justify-center gap-2 text-red-600 mb-8">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
          </svg>
          <span className="text-sm font-medium">This action cannot be undone</span>
        </div>

        {/* Buttons */}
        <div className="flex gap-4 pt-4 border-t border-gray-100">
          <button
            onClick={closeModal}
            disabled={isDeleting}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {isDeleting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Deleting...
              </span>
            ) : (
              `Delete ${isLiveAudio ? 'Audio' : 'Recording'}`
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}