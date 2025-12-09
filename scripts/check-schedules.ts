/**
 * Check schedules in database
 * Run with: npx tsx scripts/check-schedules.ts
 */

import { connectDB } from "../lib/db";
import Schedule from "../lib/models/Schedule";

async function checkSchedules() {
  try {
    console.log("Connecting to database...");
    await connectDB();
    console.log("Connected!");

    console.log("\nFetching all schedules...");
    const schedules = await Schedule.find().lean();
    
    console.log(`\nFound ${schedules.length} schedule(s):\n`);
    
    if (schedules.length === 0) {
      console.log("❌ No schedules found in database!");
      console.log("\nTo create a schedule:");
      console.log("1. Go to http://localhost:3000/admin/login");
      console.log("2. Login as admin");
      console.log("3. Go to Schedule Management");
      console.log("4. Click 'Add Schedule Entry'");
    } else {
      schedules.forEach((schedule, index) => {
        console.log(`Schedule ${index + 1}:`);
        console.log(`  Day: ${getDayName(schedule.dayOfWeek)}`);
        console.log(`  Time: ${schedule.startTime}`);
        console.log(`  Timezone: ${schedule.timezone || 'Africa/Lagos (default)'}`);
        console.log(`  Duration: ${schedule.durationMinutes} minutes`);
        console.log(`  Lecturer: ${schedule.lecturer}`);
        console.log(`  Topic: ${schedule.topic}`);
        console.log(`  Active: ${schedule.active ? '✅ Yes' : '❌ No'}`);
        console.log('');
      });
      
      const activeSchedules = schedules.filter(s => s.active);
      console.log(`Active schedules: ${activeSchedules.length}/${schedules.length}`);
      
      if (activeSchedules.length === 0) {
        console.log("\n⚠️  All schedules are inactive!");
        console.log("Listeners won't see them. Edit schedules to make them active.");
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

function getDayName(day: number): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[day] || "Unknown";
}

checkSchedules();
