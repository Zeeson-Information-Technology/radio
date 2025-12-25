export interface LiveData {
  ok: boolean;
  isLive: boolean;
  isMuted: boolean;
  mutedAt: string | null;
  title: string | null;
  lecturer: string | null;
  startedAt: string | null;
  streamUrl: string;
  currentAudioFile: {
    title: string;
    duration: number;
    startedAt: string;
  } | null;
}

export interface ScheduleItem {
  _id: string;
  dayOfWeek: number;
  startTime: string;
  timezone?: string;
  durationMinutes: number;
  lecturer: string;
  topic: string;
}

export interface ScheduleData {
  ok: boolean;
  items: ScheduleItem[];
}