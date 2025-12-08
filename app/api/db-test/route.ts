import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import LiveState from "@/lib/models/LiveState";

/**
 * Database test endpoint
 * GET /api/db-test
 * 
 * Tests MongoDB connection and LiveState model
 * Creates a default LiveState document if none exists
 */
export async function GET() {
  try {
    // Connect to database
    await connectDB();

    // Try to find existing LiveState
    let liveState = await LiveState.findOne();

    // If no LiveState exists, create a default one
    if (!liveState) {
      liveState = await LiveState.create({
        isLive: false,
        mount: "/stream",
        title: "Initial state",
      });
    }

    // Return success response
    return NextResponse.json({
      ok: true,
      message: "Database connection successful",
      liveState: {
        id: liveState._id.toString(),
        isLive: liveState.isLive,
        mount: liveState.mount,
        title: liveState.title,
        lecturer: liveState.lecturer,
        startedAt: liveState.startedAt,
        updatedAt: liveState.updatedAt,
      },
    });
  } catch (error) {
    console.error("Database test error:", error);
    
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
