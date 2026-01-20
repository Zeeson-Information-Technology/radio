import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

// AWS S3 Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || "almanhaj-radio-audio";
const CDN_URL = process.env.AWS_CLOUDFRONT_URL || `https://${BUCKET_NAME}.s3.amazonaws.com`;

export interface UploadResult {
  storageKey: string;
  storageUrl: string;
  cdnUrl: string;
  fileSize: number;
}

/**
 * S3 Service class for managing audio file operations
 */
export class S3Service {
  private static instance: S3Service;

  static getInstance(): S3Service {
    if (!S3Service.instance) {
      S3Service.instance = new S3Service();
    }
    return S3Service.instance;
  }

  /**
   * Generate storage key for original files
   */
  generateOriginalKey(fileName: string, recordingId?: string): string {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    
    if (recordingId) {
      return `originals/${year}/${month}/${recordingId}-${sanitizedFileName}`;
    }
    return `originals/${year}/${month}/${timestamp}-${sanitizedFileName}`;
  }

  /**
   * Generate storage key for playback files
   */
  generatePlaybackKey(recordingId: string, format: string = 'mp3'): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    return `playback/${year}/${month}/${recordingId}.${format}`;
  }

  /**
   * Upload file from File object to S3
   */
  async uploadFromFile(
    file: File,
    storageKey: string,
    contentType: string
  ): Promise<UploadResult> {
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    return this.uploadBuffer(fileBuffer, storageKey, contentType, file.name);
  }

  /**
   * Upload file from local path to S3
   */
  async uploadFile(
    filePath: string,
    storageKey: string,
    contentType: string
  ): Promise<string> {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const result = await this.uploadBuffer(fileBuffer, storageKey, contentType);
      return result.storageUrl;
    } catch (error) {
      console.error("S3 upload from file error:", error);
      throw new Error("Failed to upload file to S3");
    }
  }

  /**
   * Upload buffer to S3
   */
  private async uploadBuffer(
    buffer: Buffer,
    storageKey: string,
    contentType: string,
    originalName?: string
  ): Promise<UploadResult> {
    // Safely encode filename for Content-Disposition header
    const getContentDisposition = (filename?: string): string | undefined => {
      if (!filename) return undefined;
      
      try {
        // Remove or replace problematic characters
        let sanitizedFilename = filename
          .replace(/["\\\r\n\t]/g, '') // Remove quotes, backslashes, and control characters
          .replace(/[^\x20-\x7E]/g, '_') // Replace non-ASCII characters with underscore
          .replace(/\s+/g, '_') // Replace spaces with underscores
          .replace(/[<>:"|?*]/g, '_') // Replace Windows-invalid filename characters
          .replace(/_{2,}/g, '_') // Replace multiple consecutive underscores with single underscore
          .trim()
          .substring(0, 100); // Limit length to prevent header size issues
        
        // Remove leading/trailing underscores and dots
        sanitizedFilename = sanitizedFilename.replace(/^[_.]+|[_.]+$/g, '');
        
        if (!sanitizedFilename || sanitizedFilename.length === 0) return undefined;
        
        // Use RFC 6266 format for better compatibility
        return `inline; filename="${sanitizedFilename}"`;
      } catch (error) {
        console.warn('Failed to create Content-Disposition header:', error);
        return undefined; // Skip the header if there's any issue
      }
    };

    // Safely encode metadata values (S3 metadata must be ASCII)
    const getSafeMetadataValue = (value?: string): string => {
      if (!value) return "unknown";
      
      try {
        // S3 metadata values must be ASCII - replace non-ASCII characters
        return value
          .replace(/[^\x20-\x7E]/g, '_') // Replace non-ASCII characters with underscore
          .replace(/["\\\r\n\t]/g, '') // Remove quotes, backslashes, and control characters
          .replace(/\s+/g, '_') // Replace spaces with underscores
          .replace(/_{2,}/g, '_') // Replace multiple consecutive underscores with single underscore
          .trim()
          .substring(0, 200) // Limit length for metadata
          .replace(/^[_.]+|[_.]+$/g, '') || "unknown"; // Remove leading/trailing underscores
      } catch (error) {
        console.warn('Failed to sanitize metadata value:', error);
        return "unknown";
      }
    };

    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: storageKey,
      Body: buffer,
      ContentType: contentType,
      ContentDisposition: getContentDisposition(originalName),
      CacheControl: "max-age=31536000", // 1 year cache
      Metadata: {
        originalName: getSafeMetadataValue(originalName),
        uploadedAt: new Date().toISOString(),
      },
    };

    try {
      console.log(`🎵 S3 Upload: Starting upload for ${storageKey} (${buffer.length} bytes)`);
      
      const command = new PutObjectCommand(uploadParams);
      await s3Client.send(command);

      const storageUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${storageKey}`;
      const cdnUrl = `${CDN_URL}/${storageKey}`;

      console.log(`🎵 S3 Upload: Successfully uploaded ${storageKey}`);

      return {
        storageKey,
        storageUrl,
        cdnUrl,
        fileSize: buffer.length,
      };
    } catch (error) {
      console.error("S3 upload error:", error);
      console.error("Upload params:", {
        Bucket: BUCKET_NAME,
        Key: storageKey,
        ContentType: contentType,
        ContentDisposition: uploadParams.ContentDisposition,
        BufferSize: buffer.length
      });
      throw new Error("Failed to upload file to S3");
    }
  }

  /**
   * Download file from S3 to local path
   */
  async downloadFile(s3Url: string, localPath: string): Promise<void> {
    try {
      // Extract storage key from URL
      const storageKey = this.extractStorageKeyFromUrl(s3Url);
      
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: storageKey,
      });

      const response = await s3Client.send(command);
      
      if (response.Body) {
        const writeStream = createWriteStream(localPath);
        await pipeline(response.Body as any, writeStream);
      } else {
        throw new Error("No file content received from S3");
      }
    } catch (error) {
      console.error("S3 download error:", error);
      throw new Error("Failed to download file from S3");
    }
  }

  /**
   * Extract storage key from S3 URL
   */
  private extractStorageKeyFromUrl(s3Url: string): string {
    // Handle both direct S3 URLs and CDN URLs
    const url = new URL(s3Url);
    
    if (url.hostname.includes('s3.amazonaws.com')) {
      // Direct S3 URL: https://bucket.s3.amazonaws.com/key
      return url.pathname.substring(1); // Remove leading slash
    } else if (url.hostname.includes('cloudfront.net') || url.hostname === CDN_URL.replace('https://', '')) {
      // CDN URL: https://cdn.domain.com/key
      return url.pathname.substring(1); // Remove leading slash
    } else {
      throw new Error(`Unsupported S3 URL format: ${s3Url}`);
    }
  }
}

/**
 * Legacy function for backward compatibility
 */
export async function uploadAudioToS3(
  file: File,
  fileName: string,
  contentType: string
): Promise<UploadResult> {
  const s3Service = S3Service.getInstance();
  const storageKey = s3Service.generateOriginalKey(fileName);
  return s3Service.uploadFromFile(file, storageKey, contentType);
}

/**
 * Generate signed URL for secure audio access
 */
export async function generateSignedUrl(
  storageKey: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: storageKey,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    throw new Error("Failed to generate signed URL");
  }
}

/**
 * Delete audio file from S3
 */
export async function deleteAudioFromS3(storageKey: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: storageKey,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error("S3 delete error:", error);
    throw new Error("Failed to delete file from S3");
  }
}

/**
 * Extract audio metadata using a simple approach
 * This runs on the server side during upload
 */
export async function extractAudioMetadata(file: File): Promise<{ duration: number; bitrate?: number; sampleRate?: number }> {
  // Server-side metadata extraction - estimate duration based on file size and format
  // For accurate duration, we'd need a server-side audio processing library like ffmpeg
  
  const fileSizeMB = file.size / (1024 * 1024);
  let estimatedDuration = 0;
  
  // Get file extension
  const fileName = file.name.toLowerCase();
  
  // Estimate duration based on common bitrates for different formats
  if (fileName.endsWith('.mp3')) {
    // MP3 at average 128kbps ≈ 1MB per minute
    estimatedDuration = Math.round(fileSizeMB * 60);
  } else if (fileName.endsWith('.m4a') || fileName.endsWith('.aac')) {
    // M4A/AAC at average 96kbps ≈ 0.75MB per minute
    estimatedDuration = Math.round(fileSizeMB * 80);
  } else if (fileName.endsWith('.wav')) {
    // WAV uncompressed ≈ 10MB per minute
    estimatedDuration = Math.round(fileSizeMB * 6);
  } else if (fileName.endsWith('.amr')) {
    // AMR ≈ 0.5MB per minute
    estimatedDuration = Math.round(fileSizeMB * 120);
  } else if (fileName.endsWith('.flac')) {
    // FLAC ≈ 5MB per minute
    estimatedDuration = Math.round(fileSizeMB * 12);
  } else {
    // Default to MP3 estimate
    estimatedDuration = Math.round(fileSizeMB * 60);
  }
  
  console.log(`🎵 Estimated duration for ${file.name}: ${estimatedDuration} seconds (${fileSizeMB.toFixed(1)}MB)`);
  
  return {
    duration: estimatedDuration,
    bitrate: undefined,
    sampleRate: undefined,
  };
}