/**
 * Audio Injection System
 * Injects pre-recorded audio into the live broadcast stream.
 *
 * Design: operates entirely inside the caller's (BrowserEncoder) AudioContext.
 * No second AudioContext is created — this eliminates the browser auto-suspension
 * bug and the cross-context MediaStream instability that caused ~3-min cutoffs.
 *
 * Graph (all nodes share one AudioContext):
 *
 *   micSource ──► micGain ──┐
 *                           ├──► broadcaster destination (ScriptProcessor → gateway)
 *   audioElement ──► injectionGain ──┘
 *
 * Switching between mic-only and audio+mic is done purely by gain values:
 *   - Audio playing:  micGain=0, injectionGain=1  (mic muted, audio heard)
 *   - Audio paused:   micGain=1, injectionGain=0  (presenter speaks, audio silent)
 *   - Audio stopped:  micGain=1, injectionGain=0  (back to normal mic)
 *
 * This is instantaneous — no polling, no node reconnection, no cross-context streams.
 */

import { envConsole } from '../../../lib/utils/console';

export interface InjectionAudioFile {
  id: string;
  title: string;
  url: string;
  duration: number;
}

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentFile: InjectionAudioFile | null;
  progress: number;
  pausedAt: number;
}

class AudioInjectionSystem {
  // Provided by BrowserEncoder — shared single AudioContext
  private audioContext: AudioContext | null = null;
  // The node that feeds the gateway ScriptProcessor
  private broadcastDestination: AudioNode | null = null;

  // Gain nodes — always connected, switched by value not by connect/disconnect
  private micGainNode: GainNode | null = null;
  private injectionGainNode: GainNode | null = null;

  // Current audio element and its Web Audio source
  private audioElement: HTMLAudioElement | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;

  private playbackState: PlaybackState = {
    isPlaying: false,
    isPaused: false,
    currentFile: null,
    progress: 0,
    pausedAt: 0,
  };

  private progressInterval: ReturnType<typeof setInterval> | null = null;
  private onProgressUpdate?: (progress: number, duration: number) => void;
  private onPlaybackComplete?: () => void;
  private onMicrophoneMuted?: (muted: boolean) => void;

  constructor(
    onProgressUpdate?: (progress: number, duration: number) => void,
    onPlaybackComplete?: () => void,
    onMicrophoneMuted?: (muted: boolean) => void
  ) {
    this.onProgressUpdate = onProgressUpdate;
    this.onPlaybackComplete = onPlaybackComplete;
    this.onMicrophoneMuted = onMicrophoneMuted;
  }

  /**
   * Initialize using the EXISTING AudioContext and mic source from BrowserEncoder.
   * micSource   — the MediaStreamAudioSourceNode already created for the mic
   * destination — the node that feeds the ScriptProcessor / gateway (e.g. processorRef)
   * ctx         — the shared AudioContext
   */
  initializeWithContext(
    ctx: AudioContext,
    micSource: MediaStreamAudioSourceNode,
    destination: AudioNode
  ): void {
    this.audioContext = ctx;
    this.broadcastDestination = destination;

    // Mic gain — starts at 1 (open)
    this.micGainNode = ctx.createGain();
    this.micGainNode.gain.value = 1;

    // Injection gain — starts at 0 (silent)
    this.injectionGainNode = ctx.createGain();
    this.injectionGainNode.gain.value = 0;

    // Wire mic: micSource ──► micGain ──► destination
    micSource.connect(this.micGainNode);
    this.micGainNode.connect(destination);

    // injectionGain output will connect to destination when a file is loaded
    // (connect is lazy — we do it once in playAudioFile)

    console.log('✅ AudioInjectionSystem initialised (shared AudioContext)');
    envConsole.audioInjection.info('AudioInjectionSystem initialised with shared context');
  }

  /** @deprecated kept for backwards compat — will no-op if called after initializeWithContext */
  async initialize(_microphoneStream: MediaStream): Promise<void> {
    // BrowserEncoder now calls initializeWithContext instead.
    // This stub prevents crashes if anything still calls the old API.
    console.warn('⚠️ AudioInjectionSystem.initialize() is deprecated — use initializeWithContext()');
  }

  // ─── Playback ───────────────────────────────────────────────────────────────

  async playAudioFile(audioFile: InjectionAudioFile): Promise<void> {
    if (!this.audioContext || !this.injectionGainNode || !this.broadcastDestination) {
      throw new Error('AudioInjectionSystem not initialised — call initializeWithContext() first');
    }

    // If already playing/paused, clean up old element first
    if (this.playbackState.isPlaying || this.playbackState.isPaused) {
      this.cleanupAudioElement();
      // Brief drain wait (one render quantum ~3ms; 50ms is comfortable)
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    try {
      const audioElement = new Audio();
      audioElement.crossOrigin = 'anonymous';
      audioElement.preload = 'auto';
      audioElement.src = audioFile.url;

      // Attach to Web Audio inside the SHARED context — no cross-context bridge
      const mediaSource = this.audioContext.createMediaElementSource(audioElement);
      mediaSource.connect(this.injectionGainNode);

      // Connect injectionGain to broadcaster destination (idempotent — safe to call multiple times)
      try { this.injectionGainNode.connect(this.broadcastDestination); } catch { /* already connected */ }

      this.audioElement = audioElement;
      this.mediaSource = mediaSource;

      // Switch gains: mute mic, open injection — one Web Audio scheduler call, sample-accurate
      this.setMicGain(0);   // mic off → presenter silent
      this.setInjectionGain(1); // audio on → listeners hear recording

      audioElement.onended = () => {
        if (this.audioElement === audioElement) this.handlePlaybackComplete();
      };
      audioElement.onerror = () => {
        if (this.audioElement === audioElement) {
          console.error('❌ Audio element error during injection');
          this.stopPlayback();
        }
      };

      await audioElement.play();

      this.playbackState = {
        isPlaying: true,
        isPaused: false,
        currentFile: audioFile,
        progress: 0,
        pausedAt: 0,
      };

      this.startProgressTracking();
      console.log(`▶️ Injection playing: ${audioFile.title}`);
    } catch (error) {
      console.error('❌ Failed to play injection audio:', error);
      this.cleanupAudioElement();
      // Restore mic on failure
      this.setMicGain(1);
      this.setInjectionGain(0);
      throw error;
    }
  }

  /**
   * Pause playback — mic is immediately restored so presenter can speak.
   */
  pausePlayback(): void {
    if (!this.playbackState.isPlaying || this.playbackState.isPaused) return;
    if (!this.audioElement) return;

    try {
      this.audioElement.pause();
      this.playbackState.isPaused = true;
      this.playbackState.isPlaying = false;
      this.playbackState.pausedAt = this.audioElement.currentTime;

      // Restore mic immediately — presenter can now speak live
      this.setMicGain(1);
      this.setInjectionGain(0);

      this.onMicrophoneMuted?.(false);
      console.log('⏸️ Injection paused — mic restored for presenter speech');
    } catch (error) {
      console.warn('⚠️ Error pausing injection:', error);
    }
  }

  /**
   * Resume playback — mic is muted again, audio resumes instantly.
   */
  async resumePlayback(): Promise<void> {
    if (!this.playbackState.isPaused || !this.playbackState.currentFile) return;
    if (!this.audioElement) return;

    try {
      // Mute mic before audio restarts — no overlap
      this.setMicGain(0);
      this.setInjectionGain(1);

      await this.audioElement.play();

      this.playbackState.isPlaying = true;
      this.playbackState.isPaused = false;

      this.onMicrophoneMuted?.(true);
      console.log('▶️ Injection resumed');
    } catch (error) {
      // On failure, restore mic so presenter isn't silenced
      this.setMicGain(1);
      this.setInjectionGain(0);
      console.error('❌ Failed to resume injection:', error);
      throw error;
    }
  }

  stopPlayback(): void {
    this.cleanupAudioElement();
    this.stopProgressTracking();

    // Restore mic, silence injection
    this.setMicGain(1);
    this.setInjectionGain(0);
    this.onMicrophoneMuted?.(false);

    this.playbackState = {
      isPlaying: false,
      isPaused: false,
      currentFile: null,
      progress: 0,
      pausedAt: 0,
    };

    console.log('⏹️ Injection stopped — mic restored');
  }

  async seekTo(timeInSeconds: number): Promise<void> {
    if (!this.audioElement || !this.playbackState.currentFile) return;
    const seekTime = Math.max(0, Math.min(timeInSeconds, this.playbackState.currentFile.duration));
    this.audioElement.currentTime = seekTime;
    this.playbackState.progress = seekTime;
  }

  async skipForward(seconds = 10): Promise<void> {
    await this.seekTo(this.getCurrentTime() + seconds);
  }

  async skipBackward(seconds = 10): Promise<void> {
    await this.seekTo(this.getCurrentTime() - seconds);
  }

  // ─── State accessors ────────────────────────────────────────────────────────

  isPlaying(): boolean { return this.playbackState.isPlaying; }
  isPaused(): boolean  { return this.playbackState.isPaused; }
  getCurrentFile(): InjectionAudioFile | null { return this.playbackState.currentFile; }
  getProgress(): number { return this.playbackState.progress; }

  getCurrentTime(): number {
    if (this.audioElement) return this.audioElement.currentTime;
    if (this.playbackState.isPaused) return this.playbackState.pausedAt;
    return this.playbackState.progress;
  }

  setVolume(volume: number): void {
    if (this.injectionGainNode && this.playbackState.isPlaying) {
      this.injectionGainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  setMicrophoneVolume(volume: number): void {
    if (this.micGainNode && !this.playbackState.isPlaying) {
      this.micGainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /** @deprecated — no longer used (no second context). Kept so callers don't crash. */
  getMixedStream(): MediaStream | null { return null; }

  // ─── Internal helpers ────────────────────────────────────────────────────────

  private setMicGain(value: number): void {
    if (this.micGainNode && this.audioContext) {
      // Use linearRampToValueAtTime for a very short (~10ms) fade to avoid clicks
      const t = this.audioContext.currentTime;
      this.micGainNode.gain.cancelScheduledValues(t);
      this.micGainNode.gain.setValueAtTime(this.micGainNode.gain.value, t);
      this.micGainNode.gain.linearRampToValueAtTime(value, t + 0.01);
    }
  }

  private setInjectionGain(value: number): void {
    if (this.injectionGainNode && this.audioContext) {
      const t = this.audioContext.currentTime;
      this.injectionGainNode.gain.cancelScheduledValues(t);
      this.injectionGainNode.gain.setValueAtTime(this.injectionGainNode.gain.value, t);
      this.injectionGainNode.gain.linearRampToValueAtTime(value, t + 0.01);
    }
  }

  private cleanupAudioElement(): void {
    if (this.audioElement) {
      this.audioElement.onended = null;
      this.audioElement.onerror = null;
      try {
        this.audioElement.pause();
        this.audioElement.src = '';
        this.audioElement.load();
      } catch { /* ignore */ }
      this.audioElement = null;
    }
    if (this.mediaSource) {
      try { this.mediaSource.disconnect(); } catch { /* already disconnected */ }
      this.mediaSource = null;
    }
  }

  private startProgressTracking(): void {
    this.stopProgressTracking();
    this.progressInterval = setInterval(() => {
      if (!this.playbackState.isPlaying || !this.audioElement || !this.playbackState.currentFile) return;
      const current = this.audioElement.currentTime;
      const duration = this.playbackState.currentFile.duration;
      this.playbackState.progress = Math.min(current, duration);
      this.onProgressUpdate?.(this.playbackState.progress, duration);
      // Safety: if HTML5 audio hasn't fired onended for some reason
      if (current >= duration) this.handlePlaybackComplete();
    }, 100);
  }

  private stopProgressTracking(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  private handlePlaybackComplete(): void {
    this.stopProgressTracking();
    this.cleanupAudioElement();

    // Restore mic, silence injection
    this.setMicGain(1);
    this.setInjectionGain(0);
    this.onMicrophoneMuted?.(false);

    this.playbackState = {
      isPlaying: false,
      isPaused: false,
      currentFile: null,
      progress: 0,
      pausedAt: 0,
    };

    this.onPlaybackComplete?.();
    console.log('✅ Injection playback complete — mic restored');
  }

  cleanup(): void {
    this.stopPlayback();
    // Restore gains before releasing references
    this.setMicGain(1);
    this.setInjectionGain(0);
    this.audioContext = null;
    this.broadcastDestination = null;
    this.micGainNode = null;
    this.injectionGainNode = null;
    console.log('🧹 AudioInjectionSystem cleaned up');
  }
}

export default AudioInjectionSystem;
