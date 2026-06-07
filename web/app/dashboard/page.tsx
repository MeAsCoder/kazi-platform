import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function DashboardRouter() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role === "WORKER") redirect("/worker");
  if (role === "ADMIN") redirect("/admin");
  if (role === "CLIENT") redirect("/client");
  redirect("/login");
}
