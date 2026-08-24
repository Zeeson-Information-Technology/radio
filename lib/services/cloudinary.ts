import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
  api_key: process.env.CLOUDINARY_API_KEY || "",
  api_secret: process.env.CLOUDINARY_API_SECRET || "",
});

export interface CloudinaryUploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  format: string;
  fileSize: number;
  duration?: number;
}

/**
 * Cloudinary Service for audio file management
 */
export class CloudinaryService {
  private static instance: CloudinaryService;

  static getInstance(): CloudinaryService {
    if (!CloudinaryService.instance) {
      CloudinaryService.instance = new CloudinaryService();
    }
    return CloudinaryService.instance;
  }

  /**
   * Validate Cloudinary configuration
   */
  isConfigured(): boolean {
    return !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );
  }

  /**
   * Generate public ID for audio file (organized by date)
   */
  generatePublicId(fileName: string, recordingId?: string): string {
    const timestamp = Date.now();
    const sanitizedFileName = fileName
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[^a-zA-Z0-9-_]/g, '_') // Replace special chars
      .substring(0, 50); // Limit length

    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    if (recordingId) {
      return `almanhaj-radio/${year}/${month}/${recordingId}`;
    }
    return `almanhaj-radio/${year}/${month}/${timestamp}-${sanitizedFileName}`;
  }

  /**
   * Upload file from File object to Cloudinary
   */
  async uploadFromFile(
    file: File,
    recordingId?: string
  ): Promise<CloudinaryUploadResult> {
    const buffer = Buffer.from(await file.arrayBuffer());
    return this.uploadBuffer(buffer, file.name, file.type, recordingId);
  }

  /**
   * Upload buffer to Cloudinary
   */
  private async uploadBuffer(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    recordingId?: string
  ): Promise<CloudinaryUploadResult> {
    if (!this.isConfigured()) {
      throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.');
    }

    const publicId = this.generatePublicId(fileName, recordingId);

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: 'raw', // 'raw' for audio files
          media_metadata: true,
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(new Error(`Failed to upload to Cloudinary: ${error.message}`));
          } else if (result) {
            console.log(`🎵 Cloudinary Upload: Successfully uploaded ${publicId}`);
            resolve({
              publicId: result.public_id,
              url: result.url,
              secureUrl: result.secure_url,
              format: result.format || 'audio',
              fileSize: result.bytes || buffer.length,
              duration: result.duration, // Available for audio files
            });
          }
        }
      );

      stream.end(buffer);
    });
  }

  /**
   * Delete audio file from Cloudinary
   */
  async deleteFile(publicId: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Cloudinary is not configured');
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'raw',
      });

      if (result.result === 'ok') {
        console.log(`🎵 Cloudinary Delete: Successfully deleted ${publicId}`);
      } else {
        console.warn(`⚠️  Cloudinary Delete: Unexpected response for ${publicId}`, result);
      }
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      throw new Error(`Failed to delete from Cloudinary: ${error}`);
    }
  }

  /**
   * Get download URL for audio file
   */
  getDownloadUrl(publicId: string): string {
    return cloudinary.url(publicId, {
      resource_type: 'raw',
      type: 'upload',
    });
  }

  /**
   * Get secure HTTPS URL
   */
  getSecureUrl(publicId: string): string {
    return cloudinary.url(publicId, {
      resource_type: 'raw',
      type: 'upload',
      secure: true,
    });
  }
}

/**
 * Legacy function for backward compatibility
 */
export async function uploadAudioToCloudinary(
  file: File,
  recordingId?: string
): Promise<CloudinaryUploadResult> {
  const service = CloudinaryService.getInstance();
  return service.uploadFromFile(file, recordingId);
}
