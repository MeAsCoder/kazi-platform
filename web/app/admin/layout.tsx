import { auth } from "@/lib/auth";
import { DashHeader } from "@/components/DashHeader";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <div>
      <DashHeader area="Admin" name={session?.user?.name} />
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
