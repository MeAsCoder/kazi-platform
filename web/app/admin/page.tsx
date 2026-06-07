import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui";
import { ResolveButton, BanButton, VerifyButton, ScanButton } from "./admin-actions";

// Live health check against the FastAPI model service (same env the matcher uses).
async function modelHealth(): Promise<{ online: boolean; model?: string }> {
  const base = process.env.MODEL_SERVICE_URL ?? "http://localhost:8000";
  try {
    const res = await fetch(`${base}/health`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { online: false };
    const j = await res.json().catch(() => ({}));
    return { online: true, model: j.model ?? "loaded" };
  } catch {
    return { online: false };
  }
}

export default async function AdminDashboard() {
  const [
    users, clients, workerUsers, admins,
    jobsOpen, jobsMatched, jobsCompleted, jobsCancelled,
    matchCount, matchAgg, reviews, openFlags,
    profiles, recentMatches, recentUsers, flags, health,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.user.count({ where: { role: "WORKER" } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.job.count({ where: { status: "OPEN" } }),
    prisma.job.count({ where: { status: "MATCHED" } }),
    prisma.job.count({ where: { status: "COMPLETED" } }),
    prisma.job.count({ where: { status: "CANCELLED" } }),
    prisma.match.count(),
    prisma.match.aggregate({ _avg: { score: true } }),
    prisma.review.count(),
    prisma.fraudFlag.count({ where: { status: "OPEN" } }),
    prisma.workerProfile.findMany({ select: { trade: true, isVerified: true, isAvailable: true } }),
    prisma.match.findMany({
      include: { job: { select: { title: true } }, worker: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { workerProfile: { select: { isVerified: true } } },
    }),
    prisma.fraudFlag.findMany({
      where: { status: "OPEN" },
      include: { user: { select: { name: true, phone: true } } },
      orderBy: { createdAt: "desc" },
    }),
    modelHealth(),
  ]);

  const activeJobs = jobsOpen + jobsMatched;
  const avgScore = matchAgg._avg.score ? Math.round(matchAgg._avg.score * 100) : null;

  // skill-category rollup (real, from worker profiles)
  const trades = new Map<string, { count: number; verified: number; available: number }>();
  for (const p of profiles) {
    const t = trades.get(p.trade) ?? { count: 0, verified: 0, available: 0 };
    t.count++;
    if (p.isVerified) t.verified++;
    if (p.isAvailable) t.available++;
    trades.set(p.trade, t);
  }
  const tradeRows = [...trades.entries()].sort((a, b) => b[1].count - a[1].count);

  const kpis = [
    ["Total users", users],
    ["Clients", clients],
    ["Workers", workerUsers],
    ["Active jobs", activeJobs],
    ["Successful matches", matchCount],
    ["Avg match score", avgScore === null ? "—" : `${avgScore}%`],
    ["Reviews", reviews],
    ["Open flags", openFlags],
  ] as const;

  function jobStatusTone(s: string): "acacia" | "clay" | "muted" {
    if (s === "CANCELLED") return "clay";
    if (s === "COMPLETED" || s === "MATCHED") return "acacia";
    return "muted";
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Admin console</h1>
          <p className="text-muted">Platform health, moderation, and growth at a glance.</p>
        </div>
        <ScanButton />
      </div>

      {/* system health */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm text-muted">AI model service</p>
          <div className="mt-2 flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${health.online ? "bg-acacia" : "bg-clay"}`} />
            <span className="font-display text-lg font-bold">{health.online ? "Online" : "Offline / waking"}</span>
          </div>
          <p className="mt-1 text-xs text-muted">
            {health.online ? `Model: ${health.model}` : "No response — free tier may be spinning up (~30s)."}
          </p>
        </div>

        <div className="card p-5">
          <p className="text-sm text-muted">Job pipeline</p>
          <div className="mt-3 space-y-1.5 text-sm">
            {[
              ["Open", jobsOpen], ["Matched", jobsMatched],
              ["Completed", jobsCompleted], ["Cancelled", jobsCancelled],
            ].map(([label, n]) => (
              <div key={label as string} className="flex items-center justify-between">
                <span className="text-muted">{label}</span>
                <span className="font-medium">{n}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <p className="text-sm text-muted">Moderation queue</p>
          <p className="mt-2 font-display text-3xl font-bold">{openFlags}</p>
          <p className="mt-1 text-xs text-muted">
            {openFlags === 0 ? "All clear — no open flags." : "Open fraud flags awaiting review."}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {kpis.map(([label, value]) => (
          <div key={label} className="card p-5">
            <p className="font-display text-3xl font-bold">{value}</p>
            <p className="text-sm text-muted">{label}</p>
          </div>
        ))}
      </div>

      {/* skill categories */}
      <div>
        <h2 className="mb-3 font-display text-xl font-semibold">Skill categories</h2>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-paper/70 text-left text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Trade</th>
                <th className="px-5 py-3 font-medium">Workers</th>
                <th className="px-5 py-3 font-medium">Verified</th>
                <th className="px-5 py-3 font-medium">Available now</th>
                <th className="px-5 py-3 font-medium">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {tradeRows.map(([trade, t]) => (
                <tr key={trade} className="border-t border-line">
                  <td className="px-5 py-3"><Badge>{trade}</Badge></td>
                  <td className="px-5 py-3 font-medium">{t.count}</td>
                  <td className="px-5 py-3 text-muted">{t.verified}</td>
                  <td className="px-5 py-3 text-muted">{t.available}</td>
                  <td className="px-5 py-3">
                    <span className="inline-block h-2 w-24 rounded-full bg-line align-middle">
                      <span className="block h-2 rounded-full bg-acacia" style={{ width: `${t.count ? (t.verified / t.count) * 100 : 0}%` }} />
                    </span>
                  </td>
                </tr>
              ))}
              {tradeRows.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-6 text-center text-muted">No worker profiles yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 px-1 text-xs text-muted">
          Categories are derived from live worker profiles. A formal add/approve workflow needs a
          dedicated table — easy to add when you want it.
        </p>
      </div>

      {/* recent match logs */}
      <div>
        <h2 className="mb-3 font-display text-xl font-semibold">Recent match activity</h2>
        {recentMatches.length === 0 ? (
          <div className="card p-6 text-center text-muted">No matches recorded yet.</div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-paper/70 text-left text-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Job</th>
                  <th className="px-5 py-3 font-medium">Worker</th>
                  <th className="px-5 py-3 font-medium">Rank</th>
                  <th className="px-5 py-3 font-medium">Score</th>
                  <th className="px-5 py-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {recentMatches.map((m) => (
                  <tr key={m.id} className="border-t border-line">
                    <td className="px-5 py-3 font-medium">{m.job.title}</td>
                    <td className="px-5 py-3 text-muted">{m.worker.user.name}</td>
                    <td className="px-5 py-3">#{m.rank}</td>
                    <td className="px-5 py-3">{Math.round(m.score * 100)}%</td>
                    <td className="px-5 py-3 text-muted">{new Date(m.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* fraud flags */}
      <div>
        <h2 className="mb-3 font-display text-xl font-semibold">Fraud &amp; disputes</h2>
        {flags.length === 0 ? (
          <div className="card p-6 text-center text-muted">No open flags. 🎉</div>
        ) : (
          <div className="space-y-3">
            {flags.map((f) => (
              <div key={f.id} className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{f.user.name}</span>
                    <Badge tone={f.severity === "high" ? "clay" : "muted"}>{f.severity}</Badge>
                  </div>
                  <p className="text-sm text-muted">
                    {f.reason.replace(/_/g, " ")} · {f.user.phone} · reported by {f.reportedBy}
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
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((u) => (
                <tr key={u.id} className="border-t border-line">
                  <td className="px-5 py-3 font-medium">
                    <span className="flex items-center gap-2">
                      {u.name}
                      {u.workerProfile?.isVerified && <Badge tone="acacia">✓</Badge>}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted">{u.phone}</td>
                  <td className="px-5 py-3"><Badge tone="muted">{u.role}</Badge></td>
                  <td className="px-5 py-3">
                    {u.isBanned ? <span className="text-clay">banned</span> : <span className="text-acacia">active</span>}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-4">
                      {u.role === "WORKER" && u.workerProfile && (
                        <VerifyButton id={u.id} verified={u.workerProfile.isVerified} />
                      )}
                      {u.role !== "ADMIN" && <BanButton id={u.id} banned={u.isBanned} />}
                    </div>
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
