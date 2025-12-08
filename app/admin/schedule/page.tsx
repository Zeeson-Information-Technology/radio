import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/server-auth";
import ScheduleList from "./ScheduleList";

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

  return <ScheduleList admin={admin} />;
}
