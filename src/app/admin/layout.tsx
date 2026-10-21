import { isAdminAuthenticated } from "../lib/auth";
import { redirect } from "next/navigation";
import AdminSidebar from "./AdminSidebar";

export const runtime = "nodejs";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-100 lg:flex">
      <AdminSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
