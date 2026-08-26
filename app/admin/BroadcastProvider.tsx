'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { SerializedAdmin } from '@/lib/types/admin';

interface BroadcastContextValue {
  admin: SerializedAdmin | null;
  setAdmin: (admin: SerializedAdmin | null) => void;
  isStreaming: boolean;
  setIsStreaming: (v: boolean) => void;
  title: string;
  setTitle: (v: string) => void;
  lecturer: string;
  setLecturer: (v: string) => void;
}

const BroadcastContext = createContext<BroadcastContextValue | null>(null);

export function BroadcastProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<SerializedAdmin | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [title, setTitle] = useState('Live Lecture');
  const [lecturer, setLecturer] = useState('');

  return (
    <BroadcastContext.Provider value={{ admin, setAdmin, isStreaming, setIsStreaming, title, setTitle, lecturer, setLecturer }}>
      {children}
    </BroadcastContext.Provider>
  );
}

export function useBroadcast() {
  const ctx = useContext(BroadcastContext);
  if (!ctx) throw new Error('useBroadcast must be used inside BroadcastProvider');
  return ctx;
}
