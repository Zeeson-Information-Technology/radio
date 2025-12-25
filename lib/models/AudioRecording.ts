import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * AudioRecording interface
 * Represents a recorded audio file with comprehensive metadata and access control
 */
export interface IAudioRecording extends Document {
  title: string;
  description?: string;
  
  // Speaker information
  lecturer: mongoose.Types.ObjectId; // Reference to Lecturer
  lecturerName: string; // Denormalized for search performance
  
  // Content classification
  category: mongoose.Types.ObjectId; // Reference to Category
  type: "quran" | "hadith" | "tafsir" | "lecture" | "adhkar";
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
  
  // Access Control (Requirements 7.1, 7.2, 8.1, 8.2, 8.3)
  visibility: "private" | "shared" | "public"; // Who can access this audio
  sharedWith: mongoose.Types.ObjectId[]; // Presenter IDs for shared visibility
  broadcastReady: boolean; // Suitable for live broadcast injection
  
  // Security
  accessLevel: "public" | "authenticated" | "admin";
  
  // Metadata
  createdBy: mongoose.Types.ObjectId; // Admin who uploaded
  createdAt: Date;
  updatedAt: Date;
  
  // Analytics
  playCount: number;
  lastPlayed?: Date;
  broadcastUsageCount: number; // How many times used in broadcasts
  lastUsedInBroadcast?: Date; // When last used in a broadcast
  
  // Status
  status: "processing" | "active" | "archived";
  isPublic: boolean;
}

/**
 * User Favorites interface for tracking per-user favorites
 */
export interface IAudioFavorite extends Document {
  userId: mongoose.Types.ObjectId; // Admin/Presenter ID
  audioId: mongoose.Types.ObjectId; // AudioRecording ID
  createdAt: Date;
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
      enum: ["quran", "hadith", "tafsir", "lecture", "adhkar", "qa"],
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
    
    // Access Control (Requirements 7.1, 7.2, 8.1, 8.2, 8.3)
    visibility: {
      type: String,
      enum: ["private", "shared", "public"],
      default: "public", // Simple default value instead of function
      index: true,
    },
    sharedWith: {
      type: [Schema.Types.ObjectId],
      ref: "AdminUser",
      default: [],
      index: true,
    },
    broadcastReady: {
      type: Boolean,
      default: true, // Most audio files are suitable for broadcast
      index: true,
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
    broadcastUsageCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    lastUsedInBroadcast: {
      type: Date,
      index: true,
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

// Access control indexes (Requirements 7.3, 8.3)
AudioRecordingSchema.index({ visibility: 1, status: 1 });
AudioRecordingSchema.index({ createdBy: 1, visibility: 1 });
AudioRecordingSchema.index({ sharedWith: 1, status: 1 });
AudioRecordingSchema.index({ broadcastReady: 1, status: 1 });
AudioRecordingSchema.index({ broadcastUsageCount: -1, status: 1 });

// Text search index for full-text search
AudioRecordingSchema.index({
  title: "text",
  description: "text",
  lecturerName: "text",
  tags: "text"
});

// Static methods for access control (Requirements 8.5, 8.6, 8.7)
AudioRecordingSchema.statics.getAccessibleFiles = function(userId: string, userRole: string) {
  const query: any = { status: 'active' };
  
  // Super admins see everything (Requirements 8.5)
  if (userRole === 'super_admin') {
    return this.find(query);
  }
  
  // Regular admins see public and admin-uploaded files (Requirements 8.6)
  if (userRole === 'admin') {
    query.$or = [
      // Handle both visibility field naming conventions
      { visibility: 'public' },
      { isPublic: true }, // Legacy field name
      { accessLevel: 'public' }, // Alternative field name
      { visibility: 'shared', sharedWith: userId },
      { createdBy: userId }
    ];
    return this.find(query);
  }
  
  // Presenters see based on visibility rules (Requirements 8.7)
  query.$or = [
    // Handle both visibility field naming conventions
    { visibility: 'public' },
    { isPublic: true }, // Legacy field name
    { accessLevel: 'public' }, // Alternative field name
    { visibility: 'shared', sharedWith: userId },
    { createdBy: userId }
  ];
  
  return this.find(query);
};

// Instance methods for sharing management
AudioRecordingSchema.methods.shareWith = function(presenterIds: string[]) {
  if (this.visibility !== 'shared') {
    this.visibility = 'shared';
  }
  
  // Add new presenters to sharedWith array (avoid duplicates)
  const currentShared = this.sharedWith.map((id: any) => id.toString());
  const newShared = presenterIds.filter(id => !currentShared.includes(id));
  this.sharedWith.push(...newShared);
  
  return this.save();
};

AudioRecordingSchema.methods.unshareWith = function(presenterIds: string[]) {
  this.sharedWith = this.sharedWith.filter((id: any) => 
    !presenterIds.includes(id.toString())
  );
  
  // If no one is shared with, make it private
  if (this.sharedWith.length === 0 && this.visibility === 'shared') {
    this.visibility = 'private';
  }
  
  return this.save();
};

AudioRecordingSchema.methods.updateBroadcastUsage = function() {
  this.broadcastUsageCount += 1;
  this.lastUsedInBroadcast = new Date();
  return this.save();
};

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

// AudioFavorite Schema for per-user favorites (Requirements 7.7)
const AudioFavoriteSchema = new Schema<IAudioFavorite>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "AdminUser",
      required: true,
      index: true,
    },
    audioId: {
      type: Schema.Types.ObjectId,
      ref: "AudioRecording",
      required: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: false },
  }
);

// Compound index for efficient favorite queries
AudioFavoriteSchema.index({ userId: 1, audioId: 1 }, { unique: true });

// Static methods for favorites management
AudioFavoriteSchema.statics.addFavorite = async function(userId: string, audioId: string) {
  try {
    await this.create({ userId, audioId });
    return true;
  } catch (error: any) {
    // Handle duplicate key error (already favorited)
    if (error.code === 11000) {
      return false; // Already favorited
    }
    throw error;
  }
};

AudioFavoriteSchema.statics.removeFavorite = async function(userId: string, audioId: string) {
  const result = await this.deleteOne({ userId, audioId });
  return result.deletedCount > 0;
};

AudioFavoriteSchema.statics.getUserFavorites = function(userId: string) {
  return this.find({ userId })
    .populate('audioId')
    .sort({ createdAt: -1 });
};

AudioFavoriteSchema.statics.isFavorite = async function(userId: string, audioId: string) {
  const favorite = await this.findOne({ userId, audioId });
  return !!favorite;
};

// Force schema refresh by deleting cached model
if (mongoose.models.AudioFavorite) {
  delete mongoose.models.AudioFavorite;
}

const AudioFavorite: Model<IAudioFavorite> = 
  mongoose.model<IAudioFavorite>("AudioFavorite", AudioFavoriteSchema);

export default AudioRecording;
export { AudioFavorite };