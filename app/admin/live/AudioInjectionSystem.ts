/**
 * Audio Injection System
 * Handles pre-recorded audio playback during live broadcasts
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */

import { envConsole } from '../../../lib/utils/console';

interface AudioFile {
  id: string;
  title: string;
  url: string;
  duration: number;
}

interface PlaybackState {
  isPlaying: boolean;
  currentFile: AudioFile | null;
  progress: number;
  startTime: number;
}

class AudioInjectionSystem {
  private audioContext: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private microphoneGainNode: GainNode | null = null;
  private mixerNode: GainNode | null = null;
  
  private playbackState: PlaybackState = {
    isPlaying: false,
    currentFile: null,
    progress: 0,
    startTime: 0
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
   * Initialize audio injection system
   */
  async initialize(microphoneStream: MediaStream): Promise<void> {
    try {
      // Create audio context
      this.audioContext = new AudioContext();
      
      // Create microphone source
      const micSource = this.audioContext.createMediaStreamSource(microphoneStream);
      
      // Create gain nodes for mixing
      this.microphoneGainNode = this.audioContext.createGain();
      this.gainNode = this.audioContext.createGain();
      this.mixerNode = this.audioContext.createGain();
      
      // Create destination for mixed output
      this.destinationNode = this.audioContext.createMediaStreamDestination();
      
      // Connect microphone: micSource -> microphoneGain -> mixer -> destination
      micSource.connect(this.microphoneGainNode);
      this.microphoneGainNode.connect(this.mixerNode);
      this.mixerNode.connect(this.destinationNode);
      
      console.log('✅ AudioInjectionSystem initialized');
      envConsole.audioInjection.info('AudioInjectionSystem initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize AudioInjectionSystem:', error);
      envConsole.audioInjection.error('Failed to initialize AudioInjectionSystem', error);
      throw error;
    }
  }

  /**
   * Load and play audio file
   * Requirements: 3.1, 3.2 - Display audio files and inject into broadcast stream
   */
  async playAudioFile(audioFile: AudioFile): Promise<void> {
    if (!this.audioContext || !this.gainNode || !this.mixerNode || !this.destinationNode) {
      throw new Error('AudioInjectionSystem not initialized');
    }

    if (this.playbackState.isPlaying) {
      this.stopPlayback();
    }

    try {
      // Load audio file
      console.log(`🎵 Loading audio file: ${audioFile.title}`);
      const audioBuffer = await this.loadAudioFile(audioFile.url);
      
      // Create source node
      this.sourceNode = this.audioContext.createBufferSource();
      this.sourceNode.buffer = audioBuffer;
      
      // Connect audio file: source -> gain -> mixer -> destination
      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(this.mixerNode);
      
      // Automatically mute microphone during playback (Requirements 3.3)
      this.muteMicrophone();
      
      // Set up playback completion handler
      this.sourceNode.onended = () => {
        this.handlePlaybackComplete();
      };
      
      // Start playback
      this.sourceNode.start();
      
      // Update playback state
      this.playbackState = {
        isPlaying: true,
        currentFile: audioFile,
        progress: 0,
        startTime: this.audioContext.currentTime
      };
      
      // Start progress tracking (Requirements 3.5)
      this.startProgressTracking();
      
      console.log(`▶️ Playing: ${audioFile.title}`);
      
    } catch (error) {
      console.error('❌ Failed to play audio file:', error);
      throw error;
    }
  }

  /**
   * Stop audio playback
   * Requirements: 3.6 - Manual stop functionality
   */
  stopPlayback(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch (error) {
        // Source might already be stopped
        console.warn('⚠️ Source node already stopped');
      }
      this.sourceNode = null;
    }

    this.stopProgressTracking();
    
    // Restore microphone (Requirements 3.4)
    this.unmuteMicrophone();
    
    // Reset playback state
    this.playbackState = {
      isPlaying: false,
      currentFile: null,
      progress: 0,
      startTime: 0
    };

    console.log('⏹️ Audio playback stopped');
  }

  /**
   * Load audio file from URL
   * Requirements: 3.8 - Handle missing or corrupted audio files
   */
  private async loadAudioFile(url: string): Promise<AudioBuffer> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch audio file: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
      
      return audioBuffer;
      
    } catch (error) {
      console.error('❌ Failed to load audio file:', error);
      throw new Error(`Failed to load audio file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
   * Start progress tracking
   * Requirements: 3.5 - Display playback progress and remaining time
   */
  private startProgressTracking(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    this.progressInterval = setInterval(() => {
      if (this.playbackState.isPlaying && this.playbackState.currentFile && this.audioContext) {
        const elapsed = this.audioContext.currentTime - this.playbackState.startTime;
        const duration = this.playbackState.currentFile.duration;
        
        this.playbackState.progress = Math.min(elapsed, duration);
        
        this.onProgressUpdate?.(this.playbackState.progress, duration);
        
        // Auto-stop if duration exceeded (safety check)
        if (elapsed >= duration) {
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
   * Handle playback completion
   * Requirements: 3.4 - Automatic microphone restoration when finished
   */
  private handlePlaybackComplete(): void {
    this.stopProgressTracking();
    this.unmuteMicrophone();
    
    this.playbackState = {
      isPlaying: false,
      currentFile: null,
      progress: 0,
      startTime: 0
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

  getCurrentFile(): AudioFile | null {
    return this.playbackState.currentFile;
  }

  getProgress(): number {
    return this.playbackState.progress;
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
   * Cleanup resources
   */
  cleanup(): void {
    this.stopPlayback();
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    this.audioContext = null;
    this.sourceNode = null;
    this.gainNode = null;
    this.destinationNode = null;
    this.microphoneGainNode = null;
    this.mixerNode = null;
    
    console.log('🧹 AudioInjectionSystem cleaned up');
  }
}

export default AudioInjectionSystem;
export type { AudioFile, PlaybackState };