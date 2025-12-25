import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * LiveState interface
 * Represents the current live status of the radio stream with enhanced broadcast controls
 */
export interface ILiveState extends Document {
  isLive: boolean;
  isMuted: boolean;
  mutedAt?: Date | null;
  mount: string;
  lecturer?: string;
  title?: string;
  startedAt?: Date | null;
  updatedAt: Date;
  
  // Enhanced broadcast control fields
  isMonitoring: boolean;
  currentAudioFile?: {
    id: string;
    title: string;
    duration: number;
    startedAt: Date;
  } | null;
  lastActivity: Date;
}

const LiveStateSchema = new Schema<ILiveState>(
  {
    isLive: {
      type: Boolean,
      default: false,
    },
    isMuted: {
      type: Boolean,
      default: false,
    },
    mutedAt: {
      type: Date,
      required: false,
      default: null,
    },
    mount: {
      type: String,
      default: "/stream",
    },
    lecturer: {
      type: String,
      required: false,
    },
    title: {
      type: String,
      required: false,
    },
    startedAt: {
      type: Date,
      required: false,
      default: null,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    
    // Enhanced broadcast control fields
    isMonitoring: {
      type: Boolean,
      default: false,
    },
    currentAudioFile: {
      type: {
        id: { type: String, required: true },
        title: { type: String, required: true },
        duration: { type: Number, required: true },
        startedAt: { type: Date, required: true },
      },
      required: false,
      default: null,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false, // We manage updatedAt manually
  }
);

// Update updatedAt before saving
LiveStateSchema.pre("save", function () {
  this.updatedAt = new Date();
});

// Export pattern compatible with Next.js hot-reload
const LiveState: Model<ILiveState> =
  mongoose.models.LiveState ||
  mongoose.model<ILiveState>("LiveState", LiveStateSchema);

export default LiveState;
