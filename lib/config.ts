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
} as const;

/**
 * Get the stream URL with fallback
 * @returns The configured stream URL or a fallback placeholder
 */
export function getStreamUrl(): string {
  return config.streamUrl || "https://example.com/stream";
}
