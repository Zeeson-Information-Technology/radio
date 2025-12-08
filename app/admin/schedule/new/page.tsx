import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/server-auth";
import ScheduleForm from "./ScheduleForm";

/**
 * Create New Schedule Entry Page
 * Requires admin authentication
 */
export default async function NewSchedulePage() {
  // Check authentication
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  // Only admins can manage schedule
  if (admin.role !== "admin") {
    redirect("/admin/live");
  }

  return <ScheduleForm />;
}
