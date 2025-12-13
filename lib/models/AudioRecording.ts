import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * AudioRecording interface
 * Represents a recorded audio file with comprehensive metadata
 */
export interface IAudioRecording extends Document {
  title: string;
  description?: string;
  
  // Speaker information
  lecturer: mongoose.Types.ObjectId; // Reference to Lecturer
  lecturerName: string; // Denormalized for search performance
  
  // Content classification
  category: mongoose.Types.ObjectId; // Reference to Category
  type: "quran" | "hadith" | "tafsir" | "lecture" | "dua";
  tags: string[];
  
  // Temporal information
  year?: number;
  recordedDate?: Date;
  uploadDate: Date;
  
  // File information
  fileName: string;
  originalFileName: string;
  fileSize: number;
  duration: number; // in seconds
  format: string; // mp3, wav, m4a
  bitrate?: number;
  sampleRate?: number;
  
  // Storage (AWS S3)
  storageKey: string; // S3 object key
  storageUrl: string; // Full S3 URL
  cdnUrl?: string; // CloudFront URL for faster delivery
  
  // Conversion support for AMR files
  originalUrl?: string; // S3 URL to original file (AMR, etc.)
  playbackUrl?: string; // S3 URL to converted MP3 file
  conversionStatus: "pending" | "processing" | "ready" | "failed";
  conversionError?: string; // Error details if conversion fails
  conversionAttempts: number; // Retry tracking
  conversionCompletedAt?: Date; // When conversion finished
  originalFormat?: string; // Original uploaded format
  playbackFormat: string; // Format used for playback (usually mp3)
  
  // Security
  accessLevel: "public" | "authenticated" | "admin";
  
  // Metadata
  createdBy: mongoose.Types.ObjectId; // Admin who uploaded
  createdAt: Date;
  updatedAt: Date;
  
  // Analytics
  playCount: number;
  lastPlayed?: Date;
  
  // Status
  status: "processing" | "active" | "archived";
  isPublic: boolean;
}

const AudioRecordingSchema = new Schema<IAudioRecording>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    
    // Speaker information
    lecturer: {
      type: Schema.Types.ObjectId,
      ref: "Lecturer",
      required: true,
      index: true,
    },
    lecturerName: {
      type: String,
      required: true,
      trim: true,
    },
    
    // Content classification
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["quran", "hadith", "tafsir", "lecture", "dua"],
      required: true,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    
    // Temporal information
    year: {
      type: Number,
      min: 1400, // Islamic calendar consideration
      max: new Date().getFullYear() + 1,
      index: true,
    },
    recordedDate: {
      type: Date,
      index: true,
    },
    uploadDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    
    // File information
    fileName: {
      type: String,
      required: true,
    },
    originalFileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
      min: 0,
    },
    duration: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },
    format: {
      type: String,
      required: true,
      enum: [
        // Common formats
        "mp3", "wav", "m4a", "aac", "ogg",
        // Additional formats for comprehensive support
        "amr", "amr-wb", "flac", "webm", "wma", "3gp", "3gp2"
      ],
    },
    bitrate: {
      type: Number,
      min: 32,
      max: 320,
    },
    sampleRate: {
      type: Number,
      min: 8000,
      max: 192000,
    },
    
    // Storage (AWS S3)
    storageKey: {
      type: String,
      required: true,
      unique: true,
    },
    storageUrl: {
      type: String,
      required: true,
    },
    cdnUrl: {
      type: String,
    },
    
    // Conversion support for AMR files
    originalUrl: {
      type: String,
    },
    playbackUrl: {
      type: String,
    },
    conversionStatus: {
      type: String,
      enum: ["pending", "processing", "ready", "failed"],
      default: "ready", // Most files don't need conversion
      index: true,
    },
    conversionError: {
      type: String,
    },
    conversionAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    conversionCompletedAt: {
      type: Date,
    },
    originalFormat: {
      type: String,
    },
    playbackFormat: {
      type: String,
      default: "mp3",
    },
    
    // Security
    accessLevel: {
      type: String,
      enum: ["public", "authenticated", "admin"],
      default: "public",
      index: true,
    },
    
    // Metadata
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "AdminUser",
      required: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    
    // Analytics
    playCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastPlayed: {
      type: Date,
    },
    
    // Status
    status: {
      type: String,
      enum: ["processing", "active", "archived"],
      default: "processing",
      index: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true }, // We manage createdAt manually
  }
);

// Compound indexes for common queries
AudioRecordingSchema.index({ lecturer: 1, status: 1 });
AudioRecordingSchema.index({ category: 1, status: 1 });
AudioRecordingSchema.index({ type: 1, status: 1 });
AudioRecordingSchema.index({ uploadDate: -1, status: 1 });
AudioRecordingSchema.index({ playCount: -1, status: 1 });
AudioRecordingSchema.index({ tags: 1, status: 1 });

// Text search index for full-text search
AudioRecordingSchema.index({
  title: "text",
  description: "text",
  lecturerName: "text",
  tags: "text"
});

// Pre-save middleware to update timestamps
AudioRecordingSchema.pre("save", function() {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
});

// Force schema refresh by deleting cached model
if (mongoose.models.AudioRecording) {
  delete mongoose.models.AudioRecording;
}

// Export pattern compatible with Next.js hot-reload
const AudioRecording: Model<IAudioRecording> = 
  mongoose.model<IAudioRecording>("AudioRecording", AudioRecordingSchema);

export default AudioRecording;