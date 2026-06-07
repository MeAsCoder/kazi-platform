import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui";
import { ResolveButton, BanButton, ScanButton } from "./admin-actions";

export default async function AdminDashboard() {
  const [users, workers, jobs, openFlags, recentUsers, flags] = await Promise.all([
    prisma.user.count(),
    prisma.workerProfile.count(),
    prisma.job.count(),
    prisma.fraudFlag.count({ where: { status: "OPEN" } }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.fraudFlag.findMany({
      where: { status: "OPEN" },
      include: { user: { select: { name: true, phone: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const stats = [
    ["Users", users],
    ["Workers", workers],
    ["Jobs posted", jobs],
    ["Open flags", openFlags],
  ] as const;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Admin</h1>
        <ScanButton />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="card p-5">
            <p className="font-display text-3xl font-bold">{value}</p>
            <p className="text-sm text-muted">{label}</p>
          </div>
        ))}
      </div>

      {/* fraud flags */}
      <div>
        <h2 className="mb-3 font-display text-xl font-semibold">Fraud flags</h2>
        {flags.length === 0 ? (
          <div className="card p-6 text-center text-muted">No open flags. 🎉</div>
        ) : (
          <div className="space-y-3">
            {flags.map((f) => (
              <div key={f.id} className="card flex items-center justify-between p-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{f.user.name}</span>
                    <Badge tone={f.severity === "high" ? "clay" : "muted"}>{f.severity}</Badge>
                  </div>
                  <p className="text-sm text-muted">
                    {f.reason} · {f.user.phone} · reported by {f.reportedBy}
                  </p>
                </div>
                <ResolveButton id={f.id} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* users */}
      <div>
        <h2 className="mb-3 font-display text-xl font-semibold">Recent users</h2>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-paper/70 text-left text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Phone</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((u) => (
                <tr key={u.id} className="border-t border-line">
                  <td className="px-5 py-3 font-medium">{u.name}</td>
                  <td className="px-5 py-3 text-muted">{u.phone}</td>
                  <td className="px-5 py-3">
                    <Badge tone="muted">{u.role}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    {u.isBanned ? <span className="text-clay">banned</span> : <span className="text-acacia">active</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {u.role !== "ADMIN" && <BanButton id={u.id} banned={u.isBanned} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
