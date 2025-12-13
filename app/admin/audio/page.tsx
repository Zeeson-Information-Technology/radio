import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/server-auth";
import { serializeAdmin } from "@/lib/utils/serialize-admin";
import AudioLibraryPanel from "./AudioLibraryPanel";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Audio Library",
  description: "Manage recorded audio content for Al-Manhaj Radio.",
};

/**
 * Protected admin audio library page
 * Requires authentication - redirects to login if not authenticated
 */
export default async function AdminAudioPage() {
  // Check authentication
  const admin = await getCurrentAdmin();

  if (!admin) {
    // Not authenticated, redirect to login
    redirect("/admin/login");
  }

  // Authenticated, render the audio library panel
  return <AudioLibraryPanel admin={serializeAdmin(admin)} />;
}