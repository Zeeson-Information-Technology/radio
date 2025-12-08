import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/server-auth";
import EditScheduleForm from "./EditScheduleForm";

/**
 * Edit Schedule Entry Page
 * Requires admin authentication
 */
export default async function EditSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Check authentication
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  // Only admins can manage schedule
  if (admin.role !== "admin") {
    redirect("/admin/live");
  }

  return <EditScheduleForm scheduleId={id} />;
}
