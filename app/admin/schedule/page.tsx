import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/server-auth";
import { serializeAdmin } from "@/lib/utils/serialize-admin";
import ScheduleList from "./ScheduleList";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Schedule Management",
  description: "Manage broadcast schedule for Al-Manhaj Radio.",
};

/**
 * Admin Schedule Management Page
 * Requires admin authentication
 */
export default async function AdminSchedulePage() {
  // Check authentication
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  // Only admins can manage schedule
  if (admin.role !== "admin") {
    redirect("/admin/live");
  }

  return <ScheduleList admin={serializeAdmin(admin)} />;
}
