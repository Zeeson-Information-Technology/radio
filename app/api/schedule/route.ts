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
    // Connect to database
    await connectDB();

    // Fetch all active schedules, sorted by day and time
    const schedules = await Schedule.find({ active: true })
      .sort({ dayOfWeek: 1, startTime: 1 })
      .select('dayOfWeek startTime timezone durationMinutes lecturer topic')
      .lean();

    // Ensure all schedules have timezone field (fallback for old schedules)
    const schedulesWithTimezone = schedules.map(schedule => ({
      ...schedule,
      timezone: schedule.timezone || "Africa/Lagos", // Default to Nigeria if missing
    }));

    return NextResponse.json({
      ok: true,
      items: schedulesWithTimezone,
    });
  } catch (error) {
    console.error("Public schedule API error:", error);
    
    // Return error response with empty array
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to fetch schedule",
        items: [],
      },
      { status: 500 }
    );
  }
}
