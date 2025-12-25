/**
 * Performance Monitor for Broadcast Controls
 * Tracks CPU usage, memory usage, and latency metrics
 */

interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  audioLatency: number;
  frameDrops: number;
  timestamp: number;
}

interface PerformanceThresholds {
  maxCpuUsage: number;
  maxMemoryUsage: number;
  maxAudioLatency: number;
  maxFrameDrops: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private thresholds: PerformanceThresholds;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private onWarning?: (metric: string, value: number, threshold: number) => void;

  constructor(
    thresholds: PerformanceThresholds = {
      maxCpuUsage: 80, // 80% CPU usage
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB memory
      maxAudioLatency: 100, // 100ms latency
      maxFrameDrops: 5 // 5 frame drops per second
    },
    onWarning?: (metric: string, value: number, threshold: number) => void
  ) {
    this.thresholds = thresholds;
    this.onWarning = onWarning;
  }

  startMonitoring(intervalMs: number = 1000) {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  private collectMetrics() {
    const metrics: PerformanceMetrics = {
      cpuUsage: this.getCpuUsage(),
      memoryUsage: this.getMemoryUsage(),
      audioLatency: this.getAudioLatency(),
      frameDrops: this.getFrameDrops(),
      timestamp: Date.now()
    };

    this.metrics.push(metrics);

    // Keep only last 60 seconds of metrics
    const cutoff = Date.now() - 60000;
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);

    // Check thresholds
    this.checkThresholds(metrics);
  }

  private getCpuUsage(): number {
    // Estimate CPU usage based on performance timing
    if (typeof performance !== 'undefined' && performance.now) {
      const start = performance.now();
      // Simulate some work
      for (let i = 0; i < 1000; i++) {
        Math.random();
      }
      const end = performance.now();
      
      // Convert to rough CPU percentage (this is a simplified estimation)
      return Math.min((end - start) * 10, 100);
    }
    return 0;
  }

  private getMemoryUsage(): number {
    // Use performance.memory if available (Chrome)
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  private getAudioLatency(): number {
    // Estimate audio latency based on audio context
    if (typeof AudioContext !== 'undefined') {
      try {
        const context = new AudioContext();
        const latency = context.baseLatency * 1000; // Convert to ms
        context.close();
        return latency;
      } catch (error) {
        console.warn('Could not measure audio latency:', error);
      }
    }
    return 0;
  }

  private getFrameDrops(): number {
    // This would need to be tracked by the audio processing pipeline
    // For now, return 0 as a placeholder
    return 0;
  }

  private checkThresholds(metrics: PerformanceMetrics) {
    if (metrics.cpuUsage > this.thresholds.maxCpuUsage) {
      this.onWarning?.('CPU Usage', metrics.cpuUsage, this.thresholds.maxCpuUsage);
    }

    if (metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      this.onWarning?.('Memory Usage', metrics.memoryUsage, this.thresholds.maxMemoryUsage);
    }

    if (metrics.audioLatency > this.thresholds.maxAudioLatency) {
      this.onWarning?.('Audio Latency', metrics.audioLatency, this.thresholds.maxAudioLatency);
    }

    if (metrics.frameDrops > this.thresholds.maxFrameDrops) {
      this.onWarning?.('Frame Drops', metrics.frameDrops, this.thresholds.maxFrameDrops);
    }
  }

  getAverageMetrics(durationMs: number = 10000): PerformanceMetrics | null {
    const cutoff = Date.now() - durationMs;
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff);

    if (recentMetrics.length === 0) {
      return null;
    }

    const sum = recentMetrics.reduce(
      (acc, m) => ({
        cpuUsage: acc.cpuUsage + m.cpuUsage,
        memoryUsage: acc.memoryUsage + m.memoryUsage,
        audioLatency: acc.audioLatency + m.audioLatency,
        frameDrops: acc.frameDrops + m.frameDrops,
        timestamp: acc.timestamp
      }),
      { cpuUsage: 0, memoryUsage: 0, audioLatency: 0, frameDrops: 0, timestamp: Date.now() }
    );

    return {
      cpuUsage: sum.cpuUsage / recentMetrics.length,
      memoryUsage: sum.memoryUsage / recentMetrics.length,
      audioLatency: sum.audioLatency / recentMetrics.length,
      frameDrops: sum.frameDrops / recentMetrics.length,
      timestamp: Date.now()
    };
  }

  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  clearMetrics() {
    this.metrics = [];
  }
}

export default PerformanceMonitor;
export type { PerformanceMetrics, PerformanceThresholds };