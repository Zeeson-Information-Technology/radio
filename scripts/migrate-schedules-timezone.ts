/**
 * Migration script to add timezone field to existing schedules
 * Run with: npx tsx scripts/migrate-schedules-timezone.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

import { connectDB } from "../lib/db";
import Schedule from "../lib/models/Schedule";

async function migrateSchedules() {
  try {
    console.log("Environment check:");
    console.log("MONGODB_URI exists:", !!process.env.MONGODB_URI);
    console.log("MONGODB_URI length:", process.env.MONGODB_URI?.length || 0);
    
    console.log("\nConnecting to database...");
    await connectDB();
    console.log("Connected!");

    console.log("\nFinding schedules without timezone field...");
    const schedulesWithoutTimezone = await Schedule.find({
      $or: [
        { timezone: { $exists: false } },
        { timezone: null },
        { timezone: "" }
      ]
    });
    
    console.log(`Found ${schedulesWithoutTimezone.length} schedule(s) without timezone\n`);
    
    if (schedulesWithoutTimezone.length === 0) {
      console.log("✅ All schedules already have timezone field!");
      process.exit(0);
    }
    
    // Update each schedule
    for (const schedule of schedulesWithoutTimezone) {
      console.log(`Updating schedule: ${schedule.topic} (${getDayName(schedule.dayOfWeek)} ${schedule.startTime})`);
      
      schedule.timezone = "Africa/Lagos"; // Default to Nigeria timezone
      await schedule.save();
      
      console.log(`  ✅ Updated with timezone: Africa/Lagos`);
    }
    
    console.log(`\n✅ Successfully migrated ${schedulesWithoutTimezone.length} schedule(s)!`);
    console.log("\nAll schedules now have timezone field set to Africa/Lagos (WAT, UTC+1)");
    console.log("You can edit them in the admin panel to change timezone if needed.");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

function getDayName(day: number): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[day] || "Unknown";
}

migrateSchedules();
