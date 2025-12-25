'use client';

import { useModal } from '@/lib/contexts/ModalContext';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export function useConfirm() {
  const { openModal } = useModal();

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      openModal(
        <ConfirmModal
          {...options}
          onConfirm={() => resolve(true)}
          onCancel={() => resolve(false)}
        />
      );
    });
  };

  return { confirm };
}