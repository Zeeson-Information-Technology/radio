/**
 * Migration script to add ownership and recurring fields to existing schedules
 * Run this once to update existing schedules with new fields
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not found in environment variables");
  process.exit(1);
}

async function migrateSchedules() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI!);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not established");
    }

    const schedulesCollection = db.collection("schedules");
    const adminUsersCollection = db.collection("adminusers");

    // Get the first super_admin or admin user to assign as creator
    const defaultCreator = await adminUsersCollection.findOne({
      role: { $in: ["super_admin", "admin"] },
    });

    if (!defaultCreator) {
      console.error("❌ No admin user found to assign as default creator");
      console.log("💡 Please create an admin user first");
      process.exit(1);
    }

    console.log(`📝 Using ${defaultCreator.email} as default creator for existing schedules`);

    // Update all schedules that don't have the new fields
    const result = await schedulesCollection.updateMany(
      {
        $or: [
          { createdBy: { $exists: false } },
          { recurringType: { $exists: false } },
          { startDate: { $exists: false } },
        ],
      },
      {
        $set: {
          createdBy: defaultCreator._id,
          recurringType: "weekly",
          startDate: new Date(),
          endDate: null,
        },
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} schedule(s)`);
    console.log("✨ Migration completed successfully!");

    await mongoose.connection.close();
    console.log("👋 Database connection closed");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migration
migrateSchedules();
