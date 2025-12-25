'use client';

import { useModal } from '@/lib/contexts/ModalContext';
import LiveAudioUploadModal from '@/components/modals/LiveAudioUploadModal';

export function useLiveAudioModals() {
  const { openModal } = useModal();

  const openUploadModal = (onUploadSuccess?: () => void) => {
    openModal(<LiveAudioUploadModal onUploadSuccess={onUploadSuccess} />);
  };

  return {
    openUploadModal
  };
}