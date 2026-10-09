import { isAdminAuthenticated } from "../lib/auth";
import { redirect } from "next/navigation";

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

  return <>{children}</>;
}

