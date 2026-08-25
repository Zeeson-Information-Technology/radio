import RadioPlayer from "./RadioPlayer";
import type { Metadata } from "next";
import { connectDB } from "@/lib/db";
import LiveState from "@/lib/models/LiveState";

// Force dynamic rendering — this page reads live DB state on every request
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Listen Live",
  description: "Listen to live Islamic lectures and Quran recitations following the way of the Salaf.",
};

/**
 * Public Radio Page
 * Reads live state directly from DB (no HTTP self-fetch needed)
 */
export default async function RadioPage() {
  const streamUrl = process.env.STREAM_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'http://178.128.46.95:8000/stream'
      : 'http://localhost:8080/test-stream');

  let liveData = {
    ok: true,
    isLive: false,
    isMuted: false,
    mutedAt: null as string | null,
    title: null as string | null,
    lecturer: null as string | null,
    startedAt: null as string | null,
    streamUrl,
    currentAudioFile: null as null | { title: string; duration: number; startedAt: string },
  };

  try {
    await connectDB();
    const state = await LiveState.findOne().lean();

    if (state) {
      liveData = {
        ok: true,
        isLive: state.isLive || false,
        isMuted: state.isMuted || false,
        mutedAt: state.mutedAt ? state.mutedAt.toISOString() : null,
        title: state.title || null,
        lecturer: state.lecturer || null,
        startedAt: state.startedAt ? state.startedAt.toISOString() : null,
        streamUrl,
        currentAudioFile: state.currentAudioFile
          ? {
              title: state.currentAudioFile.title,
              duration: state.currentAudioFile.duration,
              startedAt: state.currentAudioFile.startedAt.toISOString(),
            }
          : null,
      };
    }
  } catch (error) {
    console.error('Error loading live state for radio page:', error);
    // liveData stays as the safe fallback above
  }

  return <RadioPlayer initialData={liveData} />;
}
