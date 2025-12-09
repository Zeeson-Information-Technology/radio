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

  // All authenticated users can edit schedules
  return <EditScheduleForm scheduleId={id} />;
}
