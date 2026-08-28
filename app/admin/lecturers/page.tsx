import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/server-auth";
import LecturersManager from "./LecturersManager";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Speakers / Lecturers",
  description: "Manage speakers and lecturers for Al-Manhaj Radio.",
};

export default async function LecturersPage() {
  const admin = await getCurrentAdmin();

  if (!admin) redirect("/admin/login");
  if (!["super_admin", "admin"].includes(admin.role)) redirect("/admin/live");

  return <LecturersManager />;
}
