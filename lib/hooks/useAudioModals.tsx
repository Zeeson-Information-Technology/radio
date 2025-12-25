"use client";

import { useModal } from '@/lib/contexts/ModalContext';
import EditAudioModal from '@/components/modals/EditAudioModal';
import DeleteAudioModal from '@/components/modals/DeleteAudioModal';

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
  type?: string;
  year?: number;
  tags?: string[];
}

interface UseAudioModalsOptions {
  isLiveAudio?: boolean;
  apiEndpoint?: string;
}

export function useAudioModals(options: UseAudioModalsOptions = {}) {
  const { openModal } = useModal();
  const { isLiveAudio = false, apiEndpoint } = options;

  const openEditModal = (
    audioFile: AudioFile, 
    onSave: (updatedFile: Partial<AudioFile>) => void
  ) => {
    openModal(
      <EditAudioModal
        audioFile={audioFile}
        onSave={onSave}
        apiEndpoint={apiEndpoint}
        isLiveAudio={isLiveAudio}
      />
    );
  };

  const openDeleteModal = (
    audioFile: AudioFile,
    onConfirm: () => Promise<void>
  ) => {
    openModal(
      <DeleteAudioModal
        audioFile={audioFile}
        onConfirm={onConfirm}
        apiEndpoint={apiEndpoint}
        isLiveAudio={isLiveAudio}
      />
    );
  };

  return {
    openEditModal,
    openDeleteModal
  };
}