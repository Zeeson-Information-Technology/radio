import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Schedule interface
 * Represents planned lecture/stream times
 */
export interface ISchedule extends Document {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startTime: string; // "20:00" in 24h format (in the specified timezone)
  timezone: string; // IANA timezone (e.g., "Africa/Lagos", "America/New_York")
  durationMinutes: number;
  mount: string;
  lecturer: string;
  topic: string;
  active: boolean;
  createdBy?: mongoose.Types.ObjectId; // User who created this schedule (optional for legacy)
  recurringType?: "once" | "weekly" | "monthly" | "quarterly"; // How often it repeats
  startDate?: Date; // When the program starts
  endDate?: Date | null; // When the program ends (null = indefinite)
}

const ScheduleSchema = new Schema<ISchedule>(
  {
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
    },
    startTime: {
      type: String,
      required: true,
      validate: {
        validator: function (v: string) {
          // Validate HH:MM format
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: (props) =>
          `${props.value} is not a valid time format! Use HH:MM (24h format)`,
      },
    },
    timezone: {
      type: String,
      required: true,
      default: "Africa/Lagos", // Default to Nigeria timezone
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
    mount: {
      type: String,
      default: "/stream",
    },
    lecturer: {
      type: String,
      required: true,
    },
    topic: {
      type: String,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "AdminUser",
      required: false, // Optional for backward compatibility with existing schedules
    },
    recurringType: {
      type: String,
      enum: ["once", "weekly", "monthly", "quarterly"],
      default: "weekly",
    },
    startDate: {
      type: Date,
      required: false, // Optional for backward compatibility
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// Export pattern compatible with Next.js hot-reload
const Schedule: Model<ISchedule> =
  mongoose.models.Schedule ||
  mongoose.model<ISchedule>("Schedule", ScheduleSchema);

export default Schedule;
