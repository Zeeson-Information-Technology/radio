import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * LiveState interface
 * Represents the current live status of the radio stream
 */
export interface ILiveState extends Document {
  isLive: boolean;
  mount: string;
  lecturer?: string;
  title?: string;
  startedAt?: Date | null;
  updatedAt: Date;
}

const LiveStateSchema = new Schema<ILiveState>(
  {
    isLive: {
      type: Boolean,
      default: false,
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
