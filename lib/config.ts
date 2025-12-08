/**
 * Application configuration
 * Centralizes environment variables for easy access
 */

export const config = {
  // MongoDB
  mongodbUri: process.env.MONGODB_URI || "",

  // Authentication
  jwtSecret: process.env.JWT_SECRET || "",

  // Streaming Server
  streamUrl: process.env.STREAM_URL || "",
  streamHost: process.env.STREAM_HOST || "",
  streamPort: process.env.STREAM_PORT || "",
  streamMount: process.env.STREAM_MOUNT || "",
  streamPassword: process.env.STREAM_PASSWORD || "",
  streamFormat: process.env.STREAM_FORMAT || "",
} as const;

/**
 * Get the stream URL with fallback
 * @returns The configured stream URL or a fallback placeholder
 */
export function getStreamUrl(): string {
  const url = config.streamUrl;
  
  if (!url && process.env.NODE_ENV === 'development') {
    console.warn('⚠️  STREAM_URL is not configured. Using placeholder URL.');
  }
  
  return url || "https://example.com/stream";
}

/**
 * Get the streaming server host
 * @returns The configured stream host or placeholder
 */
export function getStreamHost(): string {
  return config.streamHost || "radio.example.com";
}

/**
 * Get the streaming server port
 * @returns The configured stream port or default
 */
export function getStreamPort(): string {
  return config.streamPort || "8000";
}

/**
 * Get the streaming mount point
 * @returns The configured mount point or default
 */
export function getStreamMount(): string {
  return config.streamMount || "/stream";
}

/**
 * Get the streaming format description
 * @returns The configured format or default
 */
export function getStreamFormatDescription(): string {
  return config.streamFormat || "MP3 128kbps";
}

/**
 * Check if streaming configuration is complete
 * @returns true if all required streaming config is set
 */
export function isStreamConfigured(): boolean {
  return !!(
    config.streamUrl &&
    config.streamHost &&
    config.streamPort &&
    config.streamMount
  );
}

/**
 * Get streaming connection details for display
 * @returns Object with all connection details
 */
export function getStreamConnectionDetails() {
  return {
    url: getStreamUrl(),
    host: getStreamHost(),
    port: getStreamPort(),
    mount: getStreamMount(),
    format: getStreamFormatDescription(),
    isConfigured: isStreamConfigured(),
  };
}
