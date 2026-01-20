"use client";

import React, { ReactNode } from 'react';
import { useModal } from '@/lib/contexts/ModalContext';

interface ModalProps {
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'responsive';
  showCloseButton?: boolean;
}

export default function Modal({ 
  children, 
  maxWidth = 'lg',
  showCloseButton = true 
}: ModalProps) {
  const { closeModal } = useModal();

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md', 
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    responsive: 'max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl'
  };

  return (
    <div className={`bg-white rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] border border-gray-100 w-full ${maxWidthClasses[maxWidth]} transform transition-all duration-300 ease-out animate-in fade-in-0 zoom-in-95`}>
      {showCloseButton && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={closeModal}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      {children}
    </div>
  );
}