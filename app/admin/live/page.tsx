import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/server-auth";
import { serializeAdmin } from "@/lib/utils/serialize-admin";
import LiveControlPanel from "./LiveControlPanel";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Control",
  description: "Manage live broadcasts and streaming for Al-Manhaj Radio.",
};

/**
 * Protected admin live control page
 * Requires authentication - redirects to login if not authenticated
 */
export default async function AdminLivePage() {
  // Check authentication
  const admin = await getCurrentAdmin();

  if (!admin) {
    // Not authenticated, redirect to login
    redirect("/admin/login");
  }

  // Authenticated, render the live control panel
  return <LiveControlPanel admin={serializeAdmin(admin)} />;
}
