import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Schedule from "@/lib/models/Schedule";

/**
 * Public Schedule API
 * GET /api/schedule
 * 
 * Returns all active schedule entries
 * No authentication required - public endpoint
 */
export async function GET() {
  try {
    console.log("🔍 Schedule API: Starting request");
    
    // Connect to database
    await connectDB();
    console.log("🔍 Schedule API: Database connected");

    // Fetch all active schedules, sorted by day and time
    const schedules = await Schedule.find({ active: true })
      .sort({ dayOfWeek: 1, startTime: 1 })
      .select('dayOfWeek startTime timezone durationMinutes lecturer topic')
      .lean();

    console.log(`🔍 Schedule API: Found ${schedules.length} active schedules`);

    // Ensure all schedules have timezone field (fallback for old schedules)
    const schedulesWithTimezone = schedules.map(schedule => ({
      ...schedule,
      timezone: schedule.timezone || "Africa/Lagos", // Default to Nigeria if missing
    }));

    console.log("🔍 Schedule API: Returning schedules with timezone");
    
    return NextResponse.json({
      ok: true,
      items: schedulesWithTimezone,
    });
  } catch (error) {
    console.error("❌ Public schedule API error:", error);
    
    // Return error response with empty array
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to fetch schedule",
        items: [],
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
