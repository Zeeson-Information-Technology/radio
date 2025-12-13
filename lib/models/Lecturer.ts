import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Lecturer interface
 * Represents Islamic scholars and speakers
 */
export interface ILecturer extends Document {
  name: string;
  arabicName?: string;
  biography?: string;
  photoUrl?: string;
  
  // Contact/Social
  website?: string;
  socialMedia?: {
    twitter?: string;
    youtube?: string;
    facebook?: string;
  };
  
  // Statistics
  recordingCount: number;
  totalDuration: number; // Total minutes of content
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Types.ObjectId;
  
  // Status
  isActive: boolean;
  isVerified: boolean;
}

// Static methods interface
interface ILecturerModel extends Model<ILecturer> {
  findOrCreate(name: string, createdBy: mongoose.Types.ObjectId): Promise<ILecturer>;
}

const LecturerSchema = new Schema<ILecturer>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true, // Prevent duplicate lecturer names
    },
    arabicName: {
      type: String,
      trim: true,
    },
    biography: {
      type: String,
      trim: true,
      maxlength: 2000, // Reasonable limit for biography
    },
    photoUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          // Basic URL validation
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: "Photo URL must be a valid HTTP/HTTPS URL"
      }
    },
    
    // Contact/Social
    website: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: "Website must be a valid HTTP/HTTPS URL"
      }
    },
    socialMedia: {
      twitter: {
        type: String,
        trim: true,
        validate: {
          validator: function(v: string) {
            return !v || /^@?[A-Za-z0-9_]+$/.test(v);
          },
          message: "Twitter handle must be alphanumeric with underscores"
        }
      },
      youtube: {
        type: String,
        trim: true,
        validate: {
          validator: function(v: string) {
            return !v || /^https?:\/\/(www\.)?youtube\.com\/.+/.test(v);
          },
          message: "YouTube URL must be a valid YouTube link"
        }
      },
      facebook: {
        type: String,
        trim: true,
        validate: {
          validator: function(v: string) {
            return !v || /^https?:\/\/(www\.)?facebook\.com\/.+/.test(v);
          },
          message: "Facebook URL must be a valid Facebook link"
        }
      }
    },
    
    // Statistics (updated by triggers/aggregation)
    recordingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalDuration: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Metadata
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "AdminUser",
      required: true,
      index: true,
    },
    
    // Status
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true }, // We manage createdAt manually
  }
);

// Indexes for common queries
LecturerSchema.index({ name: 1, isActive: 1 });
LecturerSchema.index({ recordingCount: -1, isActive: 1 });
LecturerSchema.index({ isVerified: 1, isActive: 1 });

// Text search index
LecturerSchema.index({
  name: "text",
  arabicName: "text",
  biography: "text"
});

// Pre-save middleware to update timestamps
LecturerSchema.pre("save", function() {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
});

// Static method to find or create lecturer
LecturerSchema.statics.findOrCreate = async function(this: any,
  name: string, 
  createdBy: mongoose.Types.ObjectId
): Promise<ILecturer> {
  let lecturer = await this.findOne({ name: name.trim(), isActive: true });
  
  if (!lecturer) {
    lecturer = new this({
      name: name.trim(),
      createdBy,
      isActive: true,
      isVerified: false
    });
    await lecturer.save();
  }
  
  return lecturer;
};

// Instance method to update statistics
LecturerSchema.methods.updateStatistics = async function(): Promise<void> {
  const AudioRecording = mongoose.model("AudioRecording");
  
  const stats = await AudioRecording.aggregate([
    { 
      $match: { 
        lecturer: this._id, 
        status: "active" 
      } 
    },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        totalDuration: { $sum: "$duration" }
      }
    }
  ]);
  
  if (stats.length > 0) {
    this.recordingCount = stats[0].count;
    this.totalDuration = Math.round(stats[0].totalDuration / 60); // Convert to minutes
  } else {
    this.recordingCount = 0;
    this.totalDuration = 0;
  }
  
  await this.save();
};

// Export pattern compatible with Next.js hot-reload
const Lecturer: ILecturerModel =
  (mongoose.models.Lecturer as ILecturerModel) ||
  mongoose.model<ILecturer>("Lecturer", LecturerSchema) as ILecturerModel;

export default Lecturer;