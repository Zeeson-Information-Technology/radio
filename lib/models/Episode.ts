import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Episode interface
 * Represents metadata for recorded lectures
 */
export interface IEpisode extends Document {
  title: string;
  lecturer: string;
  description?: string;
  storageKey: string; // e.g. "recordings/2025-12-07-tafsir.mp3"
  durationSec?: number;
  tags: string[];
  createdAt: Date;
}

const EpisodeSchema = new Schema<IEpisode>(
  {
    title: {
      type: String,
      required: true,
    },
    lecturer: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: false,
    },
    storageKey: {
      type: String,
      required: true,
    },
    durationSec: {
      type: Number,
      required: false,
    },
    tags: {
      type: [String],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false, // We manage createdAt manually
  }
);

// Export pattern compatible with Next.js hot-reload
const Episode: Model<IEpisode> =
  mongoose.models.Episode ||
  mongoose.model<IEpisode>("Episode", EpisodeSchema);

export default Episode;
