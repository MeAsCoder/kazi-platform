import { auth } from "@/lib/auth";
import { DashHeader } from "@/components/DashHeader";

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <div>
      <DashHeader area="Worker" name={session?.user?.name} />
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
