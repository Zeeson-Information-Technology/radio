/**
 * Audio Injection System
 * Handles pre-recorded audio playback during live broadcasts
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */

import { envConsole } from '../../../lib/utils/console';

interface InjectionAudioFile {
  id: string;
  title: string;
  url: string;
  duration: number;
}

interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentFile: InjectionAudioFile | null;
  progress: number;
  startTime: number;
  pausedAt: number;
  playbackSpeed: number;
}

class AudioInjectionSystem {
  private audioContext: AudioContext | null = null;
  private microphoneGainNode: GainNode | null = null;
  private gainNode: GainNode | null = null;
  private mixerNode: GainNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private microphoneStream: MediaStream | null = null;
  
  // HTML5 Audio for streaming + Web Audio for mixing
  private audioElement: HTMLAudioElement | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;
  
  private playbackState: PlaybackState = {
    isPlaying: false,
    isPaused: false,
    currentFile: null,
    progress: 0,
    startTime: 0,
    pausedAt: 0,
    playbackSpeed: 1.0
  };

  private progressInterval: NodeJS.Timeout | null = null;
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
   * Initialize audio injection system with essential mixing for broadcast
   */
  async initialize(microphoneStream: MediaStream): Promise<void> {
    try {
      // Store microphone stream reference
      this.microphoneStream = microphoneStream;
      
      // Create Web Audio context for mixing (essential for broadcast injection)
      this.audioContext = new AudioContext();
      
      // Create microphone source and gain for muting during audio playback
      const micSource = this.audioContext.createMediaStreamSource(microphoneStream);
      this.microphoneGainNode = this.audioContext.createGain();
      
      // Create gain node for audio file volume control
      this.gainNode = this.audioContext.createGain();
      
      // Create mixer node to combine microphone + audio file
      this.mixerNode = this.audioContext.createGain();
      
      // Create destination for mixed output (THIS IS ESSENTIAL FOR BROADCAST)
      this.destinationNode = this.audioContext.createMediaStreamDestination();
      
      // Connect microphone: micSource -> microphoneGain -> mixer -> destination
      micSource.connect(this.microphoneGainNode);
      this.microphoneGainNode.connect(this.mixerNode);
      this.mixerNode.connect(this.destinationNode);
      
      console.log('✅ AudioInjectionSystem initialized with broadcast mixing');
      envConsole.audioInjection.info('AudioInjectionSystem initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize AudioInjectionSystem:', error);
      envConsole.audioInjection.error('Failed to initialize AudioInjectionSystem', error);
      throw error;
    }
  }

  /**
   * Load and play audio file with fast response + broadcast injection
   * Requirements: 3.1, 3.2 - Display audio files and inject into broadcast stream
   */
  async playAudioFile(audioFile: InjectionAudioFile): Promise<void> {
    if (!this.audioContext || !this.gainNode || !this.mixerNode || !this.destinationNode) {
      throw new Error('AudioInjectionSystem not initialized');
    }

    // If already playing, cleanly switch to new audio without triggering stop events
    if (this.playbackState.isPlaying) {
      console.log(`🔄 Switching from "${this.playbackState.currentFile?.title}" to "${audioFile.title}"`);
      
      // IMPROVED: Wait a moment for cleanup to complete before starting new audio
      this.cleanupCurrentAudio();
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for cleanup
    }

    try {
      console.log(`🎵 Starting audio playback with broadcast injection: ${audioFile.title}`);
      
      // Use HTML5 Audio for fast loading and streaming (like UniversalAudioPlayer)
      const audioElement = new Audio();
      audioElement.crossOrigin = 'anonymous';
      audioElement.preload = 'metadata'; // Fast response - only load metadata
      
      // Set up audio element for immediate streaming
      audioElement.src = audioFile.url;
      
      // CRITICAL: Create Web Audio source from HTML5 Audio for broadcast mixing
      const mediaSource = this.audioContext.createMediaElementSource(audioElement);
      
      // Connect to broadcast mixing chain: mediaSource -> gain -> mixer -> destination
      mediaSource.connect(this.gainNode);
      this.gainNode.connect(this.mixerNode);
      
      // Store references BEFORE setting up event handlers
      this.audioElement = audioElement;
      this.mediaSource = mediaSource;
      
      // Automatically mute microphone during playback (Requirements 3.3)
      this.muteMicrophone();
      
      // Set up event handlers with better error handling and reference checking
      audioElement.onended = () => {
        // Only handle if this is still the current audio element
        if (this.audioElement === audioElement && this.playbackState.currentFile?.id === audioFile.id) {
          console.log(`✅ Audio playback completed: ${audioFile.title}`);
          this.handlePlaybackComplete();
        } else {
          console.log('🔇 Ignoring ended event from old audio element during switch');
        }
      };
      
      audioElement.onerror = (error) => {
        // Only handle if this is still the current audio element
        if (this.audioElement === audioElement && this.playbackState.currentFile?.id === audioFile.id) {
          console.error('❌ Audio element error:', error);
          this.handlePlaybackError(new Error('Audio playback failed'));
        } else {
          console.log('🔇 Ignoring error from old audio element during switch');
        }
      };
      
      audioElement.onloadedmetadata = () => {
        if (this.audioElement === audioElement && this.playbackState.currentFile?.id === audioFile.id) {
          console.log(`✅ Audio metadata loaded: ${audioFile.title} (${audioFile.duration}s)`);
        }
      };
      
      audioElement.oncanplay = () => {
        if (this.audioElement === audioElement && this.playbackState.currentFile?.id === audioFile.id) {
          console.log(`✅ Audio ready for broadcast injection: ${audioFile.title}`);
        }
      };
      
      // Start playback immediately (streaming approach)
      await audioElement.play();
      
      // Update playback state ONLY if this is still the current element
      if (this.audioElement === audioElement) {
        this.playbackState = {
          isPlaying: true,
          isPaused: false,
          currentFile: audioFile,
          progress: 0,
          startTime: Date.now(),
          pausedAt: 0,
          playbackSpeed: 1.0
        };
        
        // Start progress tracking (Requirements 3.5)
        this.startProgressTracking();
        
        console.log(`▶️ Playing with broadcast injection: ${audioFile.title}`);
      } else {
        // This audio was replaced during loading - clean it up
        console.log('🔄 Audio was replaced during loading - cleaning up');
        try {
          audioElement.pause();
          audioElement.src = '';
          mediaSource.disconnect();
        } catch (error) {
          console.warn('⚠️ Error cleaning up replaced audio:', error);
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to play audio file:', error);
      // Clean up on error
      this.cleanupCurrentAudio();
      throw error;
    }
  }

  /**
   * Clean up current audio without triggering stop events (for switching)
   */
  private cleanupCurrentAudio(): void {
    // Stop progress tracking
    this.stopProgressTracking();
    
    // Clean up HTML5 Audio element WITHOUT triggering error handlers
    if (this.audioElement) {
      try {
        // CRITICAL FIX: Remove ALL event listeners FIRST to prevent interference
        this.audioElement.onended = null;
        this.audioElement.onerror = null;
        this.audioElement.onloadedmetadata = null;
        this.audioElement.oncanplay = null;
        this.audioElement.onloadstart = null;
        this.audioElement.onloadeddata = null;
        this.audioElement.oncanplaythrough = null;
        this.audioElement.onplay = null;
        this.audioElement.onpause = null;
        this.audioElement.onstalled = null;
        this.audioElement.onsuspend = null;
        this.audioElement.onwaiting = null;
        this.audioElement.onabort = null;
        this.audioElement.onemptied = null;
        
        // Then clean up the element
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        this.audioElement.src = '';
        this.audioElement.load(); // Force cleanup of internal state
      } catch (error) {
        console.warn('⚠️ Error cleaning up audio element:', error);
      }
      this.audioElement = null;
    }

    // Disconnect Web Audio source
    if (this.mediaSource) {
      try {
        this.mediaSource.disconnect();
      } catch (error) {
        console.warn('⚠️ Error disconnecting media source:', error);
      }
      this.mediaSource = null;
    }
  }

  /**
   * Pause audio playback
   */
  pausePlayback(): void {
    if (!this.playbackState.isPlaying || this.playbackState.isPaused) {
      return;
    }

    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.playbackState.isPaused = true;
        this.playbackState.isPlaying = false;
        this.playbackState.pausedAt = this.audioElement.currentTime;
        
        console.log('⏸️ Audio playback paused at:', this.playbackState.pausedAt);
      } catch (error) {
        console.warn('⚠️ Error pausing audio:', error);
      }
    }
  }

  /**
   * Resume audio playback from paused position
   */
  async resumePlayback(): Promise<void> {
    if (!this.playbackState.isPaused || !this.playbackState.currentFile) {
      return;
    }

    try {
      if (this.audioElement) {
        // Resume from paused position
        await this.audioElement.play();
        
        // Update state
        this.playbackState.isPlaying = true;
        this.playbackState.isPaused = false;
        
        console.log('▶️ Audio playback resumed from:', this.audioElement.currentTime);
      }
    } catch (error) {
      console.error('❌ Failed to resume audio playback:', error);
      throw error;
    }
  }

  /**
   * Seek to specific time in audio (simple HTML5 approach)
   */
  async seekTo(timeInSeconds: number): Promise<void> {
    if (!this.playbackState.currentFile || !this.audioElement) {
      return;
    }

    const duration = this.playbackState.currentFile.duration;
    const seekTime = Math.max(0, Math.min(timeInSeconds, duration));
    
    try {
      // Simple HTML5 Audio seeking (instant and reliable)
      this.audioElement.currentTime = seekTime;
      this.playbackState.progress = seekTime;
      
      console.log('⏭️ Audio seeked to:', seekTime);
    } catch (error) {
      console.error('❌ Failed to seek audio:', error);
      throw error;
    }
  }

  /**
   * Skip forward by specified seconds
   */
  async skipForward(seconds: number = 10): Promise<void> {
    if (!this.playbackState.currentFile) return;
    
    const currentTime = this.getCurrentTime();
    const newTime = Math.min(currentTime + seconds, this.playbackState.currentFile.duration);
    await this.seekTo(newTime);
    
    console.log(`⏩ Skipped forward ${seconds}s to:`, newTime);
  }

  /**
   * Skip backward by specified seconds
   */
  async skipBackward(seconds: number = 10): Promise<void> {
    const currentTime = this.getCurrentTime();
    const newTime = Math.max(currentTime - seconds, 0);
    await this.seekTo(newTime);
    
    console.log(`⏪ Skipped backward ${seconds}s to:`, newTime);
  }

  /**
   * Get current playback time (simple HTML5 approach)
   */
  getCurrentTime(): number {
    if (this.audioElement) {
      // Use HTML5 Audio currentTime (most accurate and simple)
      return this.audioElement.currentTime;
    }
    
    if (this.playbackState.isPaused) {
      return this.playbackState.pausedAt;
    }
    
    return this.playbackState.progress;
  }
  /**
   * Stop audio playback and restore microphone to broadcast
   * Requirements: 3.6 - Manual stop functionality
   */
  stopPlayback(): void {
    // Stop HTML5 Audio element
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        this.audioElement.src = '';
      } catch (error) {
        console.warn('⚠️ Error stopping audio element:', error);
      }
      this.audioElement = null;
    }

    // Disconnect Web Audio source from mixing chain
    if (this.mediaSource) {
      try {
        this.mediaSource.disconnect();
      } catch (error) {
        console.warn('⚠️ Error disconnecting media source:', error);
      }
      this.mediaSource = null;
    }

    this.stopProgressTracking();
    
    // Restore microphone to broadcast (Requirements 3.4)
    this.unmuteMicrophone();
    
    // Reset playback state
    this.playbackState = {
      isPlaying: false,
      isPaused: false,
      currentFile: null,
      progress: 0,
      startTime: 0,
      pausedAt: 0,
      playbackSpeed: 1.0
    };

    console.log('⏹️ Audio playback stopped, microphone restored to broadcast');
  }

  /**
   * Mute microphone during audio playback
   * Requirements: 3.3 - Automatic microphone muting
   */
  private muteMicrophone(): void {
    if (this.microphoneGainNode) {
      this.microphoneGainNode.gain.setValueAtTime(0, this.audioContext!.currentTime);
      this.onMicrophoneMuted?.(true);
      console.log('🎤🔇 Microphone muted for audio playback');
    }
  }

  /**
   * Unmute microphone after audio playback
   * Requirements: 3.4 - Automatic microphone restoration
   */
  private unmuteMicrophone(): void {
    if (this.microphoneGainNode) {
      this.microphoneGainNode.gain.setValueAtTime(1, this.audioContext!.currentTime);
      this.onMicrophoneMuted?.(false);
      console.log('🎤🔊 Microphone restored after audio playback');
    }
  }

  /**
   * Start progress tracking (simplified HTML5 approach)
   * Requirements: 3.5 - Display playback progress and remaining time
   */
  private startProgressTracking(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    this.progressInterval = setInterval(() => {
      if (this.playbackState.isPlaying && this.playbackState.currentFile && this.audioElement) {
        // Use HTML5 Audio currentTime (simple and accurate)
        const currentTime = this.audioElement.currentTime;
        const duration = this.playbackState.currentFile.duration;
        
        this.playbackState.progress = Math.min(currentTime, duration);
        
        this.onProgressUpdate?.(this.playbackState.progress, duration);
        
        // Auto-stop if duration exceeded (safety check)
        if (currentTime >= duration) {
          this.handlePlaybackComplete();
        }
      }
    }, 100); // Update every 100ms
  }

  /**
   * Stop progress tracking
   */
  private stopProgressTracking(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  /**
   * Handle playback errors
   */
  private handlePlaybackError(error: Error): void {
    console.error('❌ Audio playback error:', error);
    this.stopPlayback();
    // Could notify parent component about the error
  }

  /**
   * Handle playback completion
   * Requirements: 3.4 - Automatic microphone restoration when finished
   */
  private handlePlaybackComplete(): void {
    this.stopProgressTracking();
    this.unmuteMicrophone();
    
    this.playbackState = {
      isPlaying: false,
      isPaused: false,
      currentFile: null,
      progress: 0,
      startTime: 0,
      pausedAt: 0,
      playbackSpeed: 1.0
    };

    this.onPlaybackComplete?.();
    console.log('✅ Audio playback completed');
  }

  /**
   * Get current playback state
   * Requirements: 3.7 - Visual indicator showing which audio file is playing
   */
  isPlaying(): boolean {
    return this.playbackState.isPlaying;
  }

  isPaused(): boolean {
    return this.playbackState.isPaused;
  }

  getCurrentFile(): InjectionAudioFile | null {
    return this.playbackState.currentFile;
  }

  getProgress(): number {
    return this.playbackState.progress;
  }

  getPlaybackSpeed(): number {
    return this.playbackState.playbackSpeed;
  }

  /**
   * Get mixed audio stream for broadcast
   */
  getMixedStream(): MediaStream | null {
    return this.destinationNode?.stream || null;
  }

  /**
   * Set audio file volume
   */
  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Set microphone volume in the mix
   */
  setMicrophoneVolume(volume: number): void {
    if (this.microphoneGainNode) {
      this.microphoneGainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Cleanup resources (with proper Web Audio cleanup)
   */
  cleanup(): void {
    this.stopPlayback();
    
    // Clean up HTML5 Audio
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement = null;
    }
    
    // Clean up Web Audio source
    if (this.mediaSource) {
      try {
        this.mediaSource.disconnect();
      } catch (error) {
        // Already disconnected
      }
      this.mediaSource = null;
    }
    
    // Clean up Web Audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    this.audioContext = null;
    this.microphoneGainNode = null;
    this.gainNode = null;
    this.mixerNode = null;
    this.destinationNode = null;
    this.microphoneStream = null;
    
    console.log('🧹 AudioInjectionSystem cleaned up (with broadcast mixing)');
  }
}

export default AudioInjectionSystem;
export type { InjectionAudioFile, PlaybackState };