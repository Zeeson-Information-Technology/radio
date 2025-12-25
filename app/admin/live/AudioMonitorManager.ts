/**
 * Audio Monitor Manager
 * Handles audio monitoring functionality with Web Audio API integration
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

interface AudioMonitorConfig {
  volume: number;
  enabled: boolean;
  feedbackThreshold: number;
  feedbackFrequencyRange: [number, number];
}

class AudioMonitorManager {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private monitorDestination: MediaStreamAudioDestinationNode | null = null;
  private feedbackDetectionInterval: NodeJS.Timeout | null = null;
  
  private config: AudioMonitorConfig = {
    volume: 0.5,
    enabled: false,
    feedbackThreshold: 0.8,
    feedbackFrequencyRange: [200, 4000] // Typical feedback frequency range
  };

  private onFeedbackDetected?: (frequency: number, amplitude: number) => void;

  constructor(onFeedbackDetected?: (frequency: number, amplitude: number) => void) {
    this.onFeedbackDetected = onFeedbackDetected;
  }

  /**
   * Initialize audio monitoring with media stream
   * Requirements: 1.1 - Default to monitor mode OFF
   */
  async initialize(mediaStream: MediaStream): Promise<void> {
    try {
      // Create audio context
      this.audioContext = new AudioContext();
      
      // Create source node from media stream
      this.sourceNode = this.audioContext.createMediaStreamSource(mediaStream);
      
      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 0; // Start with monitoring OFF (Requirements 1.1)
      
      // Create analyser for feedback detection
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 2048;
      this.analyserNode.smoothingTimeConstant = 0.8;
      
      // Create destination for monitor output
      this.monitorDestination = this.audioContext.createMediaStreamDestination();
      
      // Connect audio graph: source -> gain -> analyser -> destination
      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.monitorDestination);
      
      console.log('✅ AudioMonitorManager initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize AudioMonitorManager:', error);
      throw error;
    }
  }

  /**
   * Enable audio monitoring
   * Requirements: 1.2 - Route microphone audio to speakers without affecting broadcast
   */
  enableMonitoring(): void {
    if (!this.gainNode || !this.audioContext) {
      console.warn('⚠️ AudioMonitorManager not initialized');
      return;
    }

    try {
      // Gradually increase volume to prevent sudden loud audio
      this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      this.gainNode.gain.linearRampToValueAtTime(
        this.config.volume, 
        this.audioContext.currentTime + 0.1
      );
      
      this.config.enabled = true;
      
      // Start feedback detection
      this.startFeedbackDetection();
      
      console.log('🔊 Audio monitoring enabled');
      
    } catch (error) {
      console.error('❌ Failed to enable monitoring:', error);
    }
  }

  /**
   * Disable audio monitoring
   * Requirements: 1.3 - Disconnect microphone audio from speakers while maintaining broadcast
   */
  disableMonitoring(): void {
    if (!this.gainNode || !this.audioContext) {
      console.warn('⚠️ AudioMonitorManager not initialized');
      return;
    }

    try {
      // Gradually decrease volume to prevent audio pops
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, this.audioContext.currentTime);
      this.gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.1);
      
      this.config.enabled = false;
      
      // Stop feedback detection
      this.stopFeedbackDetection();
      
      console.log('🔇 Audio monitoring disabled');
      
    } catch (error) {
      console.error('❌ Failed to disable monitoring:', error);
    }
  }

  /**
   * Toggle monitoring state
   */
  toggleMonitoring(): void {
    if (this.config.enabled) {
      this.disableMonitoring();
    } else {
      this.enableMonitoring();
    }
  }

  /**
   * Set monitor volume
   */
  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
    
    if (this.gainNode && this.config.enabled) {
      this.gainNode.gain.value = this.config.volume;
    }
  }

  /**
   * Get current monitoring state
   * Requirements: 1.4 - Visual indicator showing monitoring status
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.config.volume;
  }

  /**
   * Start feedback detection
   * Requirements: 1.5 - Display warning when audio feedback is detected
   */
  private startFeedbackDetection(): void {
    if (!this.analyserNode || this.feedbackDetectionInterval) {
      return;
    }

    this.feedbackDetectionInterval = setInterval(() => {
      this.detectFeedback();
    }, 100); // Check every 100ms
  }

  /**
   * Stop feedback detection
   */
  private stopFeedbackDetection(): void {
    if (this.feedbackDetectionInterval) {
      clearInterval(this.feedbackDetectionInterval);
      this.feedbackDetectionInterval = null;
    }
  }

  /**
   * Detect audio feedback using frequency analysis
   */
  private detectFeedback(): void {
    if (!this.analyserNode) return;

    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyserNode.getByteFrequencyData(dataArray);

    const sampleRate = this.audioContext?.sampleRate || 44100;
    const nyquist = sampleRate / 2;
    
    // Check for peaks in feedback frequency range
    const [minFreq, maxFreq] = this.config.feedbackFrequencyRange;
    const minBin = Math.floor((minFreq / nyquist) * bufferLength);
    const maxBin = Math.floor((maxFreq / nyquist) * bufferLength);

    let maxAmplitude = 0;
    let peakFrequency = 0;

    for (let i = minBin; i < maxBin; i++) {
      const amplitude = dataArray[i] / 255; // Normalize to 0-1
      if (amplitude > maxAmplitude) {
        maxAmplitude = amplitude;
        peakFrequency = (i / bufferLength) * nyquist;
      }
    }

    // Trigger feedback warning if amplitude exceeds threshold
    if (maxAmplitude > this.config.feedbackThreshold) {
      this.onFeedbackDetected?.(peakFrequency, maxAmplitude);
    }
  }

  /**
   * Get monitor audio stream for playback
   */
  getMonitorStream(): MediaStream | null {
    return this.monitorDestination?.stream || null;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopFeedbackDetection();
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    this.audioContext = null;
    this.sourceNode = null;
    this.gainNode = null;
    this.analyserNode = null;
    this.monitorDestination = null;
    
    console.log('🧹 AudioMonitorManager cleaned up');
  }
}

export default AudioMonitorManager;