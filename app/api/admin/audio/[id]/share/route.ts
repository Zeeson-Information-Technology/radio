import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import AdminUser from "@/lib/models/AdminUser";
import AudioRecording from "@/lib/models/AudioRecording";
import mongoose from "mongoose";

/**
 * POST /api/admin/audio/[id]/share
 * Share audio file with specific presenters
 * Requirements: 7.1, 7.2, 8.3, 8.4
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params in newer Next.js versions
    const { id } = await params;
    
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

    const { presenterIds, visibility } = await request.json();
    
    // Find the audio file
    const audioFile = await AudioRecording.findById(id);
    if (!audioFile) {
      return NextResponse.json({ error: "Audio file not found" }, { status: 404 });
    }

    // Check if user has permission to modify this file
    const canModify = admin.role === 'super_admin' || 
                     audioFile.createdBy.toString() === admin._id.toString();
    
    if (!canModify) {
      return NextResponse.json({ 
        error: "You can only modify your own audio files" 
      }, { status: 403 });
    }

    // Update visibility
    if (visibility) {
      audioFile.visibility = visibility;
    }

    // Handle sharing
    if (visibility === 'shared' && presenterIds && Array.isArray(presenterIds)) {
      // Validate presenter IDs
      const validPresenters = await AdminUser.find({
        _id: { $in: presenterIds },
        role: { $in: ['presenter', 'admin', 'super_admin'] }
      }).select('_id');

      const validIds = validPresenters.map(p => p._id.toString());
      
      // Update sharing directly
      if (audioFile.visibility !== 'shared') {
        audioFile.visibility = 'shared';
      }
      
      // Add new presenters to sharedWith array (avoid duplicates)
      const currentShared = audioFile.sharedWith.map((id: any) => id.toString());
      const newShared = validIds.filter(id => !currentShared.includes(id));
      const newObjectIds = newShared.map(id => new mongoose.Types.ObjectId(id));
      audioFile.sharedWith.push(...newObjectIds);
    } else if (visibility === 'private') {
      // Clear shared list for private files
      audioFile.sharedWith = [];
    }

    await audioFile.save();

    return NextResponse.json({
      success: true,
      message: "Audio sharing updated successfully",
      visibility: audioFile.visibility,
      sharedWith: audioFile.sharedWith
    });

  } catch (error) {
    console.error("Error updating audio sharing:", error);
    return NextResponse.json(
      { error: "Failed to update sharing settings" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/audio/[id]/share
 * Remove sharing from audio file (make it private)
 * Requirements: 8.4
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params in newer Next.js versions
    const { id } = await params;
    
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

    const { presenterIds } = await request.json();
    
    // Find the audio file
    const audioFile = await AudioRecording.findById(id);
    if (!audioFile) {
      return NextResponse.json({ error: "Audio file not found" }, { status: 404 });
    }

    // Check if user has permission to modify this file
    const canModify = admin.role === 'super_admin' || 
                     audioFile.createdBy.toString() === admin._id.toString();
    
    if (!canModify) {
      return NextResponse.json({ 
        error: "You can only modify your own audio files" 
      }, { status: 403 });
    }

    if (presenterIds && Array.isArray(presenterIds)) {
      // Remove specific presenters from sharing
      audioFile.sharedWith = audioFile.sharedWith.filter((id: any) => 
        !presenterIds.includes(id.toString())
      );
      
      // If no one is shared with, make it private
      if (audioFile.sharedWith.length === 0 && audioFile.visibility === 'shared') {
        audioFile.visibility = 'private';
      }
      
      await audioFile.save();
    } else {
      // Remove all sharing (make private)
      audioFile.visibility = 'private';
      audioFile.sharedWith = [];
      await audioFile.save();
    }

    return NextResponse.json({
      success: true,
      message: "Sharing removed successfully",
      visibility: audioFile.visibility,
      sharedWith: audioFile.sharedWith
    });

  } catch (error) {
    console.error("Error removing audio sharing:", error);
    return NextResponse.json(
      { error: "Failed to remove sharing" },
      { status: 500 }
    );
  }
}