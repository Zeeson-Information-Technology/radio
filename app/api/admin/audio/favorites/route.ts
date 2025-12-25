import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import AdminUser from "@/lib/models/AdminUser";
import { AudioFavorite } from "@/lib/models/AudioRecording";

/**
 * POST /api/admin/audio/favorites
 * Add audio to user's favorites
 * Requirements: 7.7
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    await connectDB();
    const admin = await AdminUser.findById(payload.userId);
    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 401 });
    }

    const { audioId } = await request.json();
    if (!audioId) {
      return NextResponse.json({ error: "Audio ID is required" }, { status: 400 });
    }

    // Add to favorites
    const added = await (AudioFavorite as any).addFavorite(admin._id.toString(), audioId);
    
    if (!added) {
      return NextResponse.json({ 
        success: false, 
        message: "Audio is already in favorites" 
      }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      message: "Audio added to favorites"
    });

  } catch (error) {
    console.error("Error adding audio to favorites:", error);
    return NextResponse.json(
      { error: "Failed to add to favorites" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/audio/favorites
 * Remove audio from user's favorites
 * Requirements: 7.7
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    await connectDB();
    const admin = await AdminUser.findById(payload.userId);
    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 401 });
    }

    const { audioId } = await request.json();
    if (!audioId) {
      return NextResponse.json({ error: "Audio ID is required" }, { status: 400 });
    }

    // Remove from favorites
    const removed = await (AudioFavorite as any).removeFavorite(admin._id.toString(), audioId);
    
    if (!removed) {
      return NextResponse.json({ 
        success: false, 
        message: "Audio was not in favorites" 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Audio removed from favorites"
    });

  } catch (error) {
    console.error("Error removing audio from favorites:", error);
    return NextResponse.json(
      { error: "Failed to remove from favorites" },
      { status: 500 }
    );
  }
}