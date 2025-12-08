import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * AdminUser interface
 * Represents an admin or presenter who can manage the radio
 */
export interface IAdminUser extends Document {
  email: string;
  passwordHash: string;
  role: "admin" | "presenter";
  mustChangePassword: boolean;
  createdBy: mongoose.Types.ObjectId | null;
  lastLoginAt: Date | null;
  createdAt: Date;
}

const AdminUserSchema = new Schema<IAdminUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "presenter"],
      default: "presenter",
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "AdminUser",
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
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
// Prevents "Cannot overwrite model" errors in development
const AdminUser: Model<IAdminUser> =
  mongoose.models.AdminUser ||
  mongoose.model<IAdminUser>("AdminUser", AdminUserSchema);

export default AdminUser;
