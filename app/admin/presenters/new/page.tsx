import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/server-auth";
import NewPresenterForm from "./NewPresenterForm";

/**
 * Create new presenter page (Admin only)
 */
export default async function NewPresenterPage() {
  // Check authentication
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  // Check if user is admin
  if (admin.role !== "admin") {
    redirect("/admin/live");
  }

  return <NewPresenterForm />;
}
