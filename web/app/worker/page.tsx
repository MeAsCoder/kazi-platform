import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Stars, Badge } from "@/components/ui";
import { AvailabilityToggle } from "./availability-toggle";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function wa(phone: string) {
  return String(phone).replace(/[^0-9]/g, "");
}
function statusTone(s: string): "acacia" | "clay" | "muted" {
  if (s === "CANCELLED") return "clay";
  if (s === "COMPLETED" || s === "MATCHED") return "acacia";
  return "muted";
}

export default async function WorkerDashboard() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const profile = await prisma.workerProfile.findUnique({
    where: { userId },
    include: { user: { select: { name: true, neighborhood: true } } },
  });
  if (!profile) redirect("/login");

  const [matches, timesMatched, reviews] = await Promise.all([
    prisma.match.findMany({
      where: { workerId: profile.id },
      include: {
        job: { include: { client: { select: { name: true, neighborhood: true, phone: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.match.count({ where: { workerId: profile.id } }),
    prisma.review.findMany({
      where: { workerId: profile.id },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  // ---- profile completeness (real fields only) ----
  const items = [
    { label: "Skills listed", done: !!profile.skills?.trim() },
    { label: "Short bio", done: !!profile.bio?.trim() },
    { label: "Location set", done: !!profile.user.neighborhood },
    { label: "Availability days", done: profile.availableDays.length > 0 },
    { label: "Hourly rate", done: profile.hourlyRate > 0 },
    { label: "Experience added", done: profile.experienceYears > 0 },
    { label: "Verified account", done: profile.isVerified },
  ];
  const pct = Math.round((items.filter((i) => i.done).length / items.length) * 100);
  const circ = 2 * Math.PI * 40;
  const dash = (pct / 100) * circ;

  // ---- match activity over last 6 months (real) ----
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: d.toLocaleString("en", { month: "short" }), key: `${d.getFullYear()}-${d.getMonth()}`, count: 0 };
  });
  for (const m of matches) {
    const d = new Date(m.createdAt);
    const slot = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (slot) slot.count++;
  }
  const maxCount = Math.max(1, ...months.map((m) => m.count));

  const completion = profile.jobsAccepted > 0 ? Math.round((profile.jobsCompleted / profile.jobsAccepted) * 100) : null;
  const estEarnings = profile.jobsCompleted * profile.hourlyRate * 6; // jobs × rate × ~6 billable hrs

  // ---- rule-based performance tips (honest, derived from gaps) ----
  const tips: string[] = [];
  if (!profile.bio?.trim()) tips.push("Add a short bio — workers with a bio get contacted more often.");
  if (profile.availableDays.length > 0 && profile.availableDays.length < 5)
    tips.push(`You're available ${profile.availableDays.length} days a week — adding more days means more matches.`);
  if (!profile.isVerified) tips.push("Get verified to earn the trust badge clients look for.");
  if (profile.ratingCount === 0) tips.push("No reviews yet — ask your first clients to rate you to climb the rankings.");
  if (profile.hourlyRate === 0) tips.push("Set your hourly rate so clients can see your pricing up front.");
  tips.push("Keep your location accurate — distance is weighted heavily in matching.");
  const topTips = tips.slice(0, 3);

  const firstName = profile.user.name.replace(/\s*\(.*?\)\s*$/, "").split(" ")[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Hi, {firstName} 👋</h1>
        <p className="text-muted">Your fundi profile, performance, and the jobs you&apos;ve been matched to.</p>
      </div>

      {/* profile + completeness */}
      <div className="grid gap-5 md:grid-cols-3">
        <div className="card p-6 md:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge>{profile.trade}</Badge>
                {profile.isVerified && <Badge tone="acacia">Verified</Badge>}
              </div>
              <h2 className="mt-2 font-display text-xl font-semibold">{profile.skills}</h2>
              {profile.bio && <p className="mt-1 text-sm text-muted">{profile.bio}</p>}
              <p className="mt-1 text-sm text-muted">
                📍 {profile.user.neighborhood} · {profile.experienceYears} yrs experience · KES {profile.hourlyRate}/hr
              </p>
              <div className="mt-2">
                <Stars value={profile.avgRating} count={profile.ratingCount} />
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {DAYS.map((d) => {
              const on = profile.availableDays.includes(d);
              return <span key={d} className={`chip text-xs ${on ? "chip-on" : "text-muted/50 line-through"}`}>{d}</span>;
            })}
          </div>
          <div className="mt-4 border-t border-line pt-4">
            <p className="mb-1 text-sm text-muted">Availability</p>
            <AvailabilityToggle initial={profile.isAvailable} />
          </div>
        </div>

        {/* completeness ring */}
        <div className="card p-6">
          <p className="text-sm font-medium text-ink/80">Profile completeness</p>
          <div className="my-3 grid place-items-center">
            <div className="relative grid place-items-center">
              <svg width="110" height="110" className="-rotate-90">
                <circle cx="55" cy="55" r="40" fill="none" stroke="#E6DFD1" strokeWidth="9" />
                <circle
                  cx="55" cy="55" r="40" fill="none" stroke="#1A6B45" strokeWidth="9" strokeLinecap="round"
                  strokeDasharray={`${dash} ${circ}`}
                />
              </svg>
              <span className="absolute font-display text-2xl font-bold">{pct}%</span>
            </div>
          </div>
          <ul className="space-y-1.5 text-sm">
            {items.map((it) => (
              <li key={it.label} className="flex items-center gap-2">
                <span className={`grid h-4 w-4 place-items-center rounded-full text-[10px] ${it.done ? "bg-acacia text-white" : "border border-line text-transparent"}`}>✓</span>
                <span className={it.done ? "text-ink" : "text-muted"}>{it.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* analytics */}
      <div>
        <h2 className="mb-3 font-display text-xl font-semibold">Your performance</h2>
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ["Times matched", timesMatched],
            ["Jobs completed", profile.jobsCompleted],
            ["Avg rating", profile.ratingCount ? profile.avgRating.toFixed(1) : "—"],
            ["Completion rate", completion === null ? "—" : `${completion}%`],
          ].map(([label, value]) => (
            <div key={label as string} className="card p-5">
              <p className="font-display text-3xl font-bold">{value}</p>
              <p className="text-sm text-muted">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {/* activity bar chart (real, hand-built) */}
          <div className="card p-6 md:col-span-2">
            <div className="flex items-center justify-between">
              <p className="font-medium">Match activity</p>
              <span className="text-xs text-muted">last 6 months</span>
            </div>
            <div className="mt-5 flex h-40 items-end gap-3">
              {months.map((m) => (
                <div key={m.key} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-lg bg-acacia/80 transition-all"
                      style={{ height: `${(m.count / maxCount) * 100}%`, minHeight: m.count ? "6px" : "2px" }}
                      title={`${m.count} matches`}
                    />
                  </div>
                  <span className="text-xs text-muted">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* est earnings */}
          <div className="card flex flex-col justify-center p-6">
            <p className="text-sm text-muted">Estimated earnings</p>
            <p className="mt-1 font-display text-3xl font-bold text-acacia">KES {estEarnings.toLocaleString()}</p>
            <p className="mt-2 text-xs text-muted">
              Estimate: {profile.jobsCompleted} completed × KES {profile.hourlyRate}/hr × ~6 hrs. Connect payments
              for exact figures.
            </p>
          </div>
        </div>
      </div>

      {/* AI tips */}
      {topTips.length > 0 && (
        <div className="card border-acacia/30 bg-acacia-soft/40 p-6">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
            <span>💡</span> Boost your match score
          </h2>
          <ul className="space-y-2">
            {topTips.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 text-acacia">→</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* job invites */}
      <div>
        <h2 className="mb-3 font-display text-xl font-semibold">Job invites &amp; opportunities</h2>
        {matches.length === 0 ? (
          <div className="card p-8 text-center text-muted">
            No matches yet. Keep your availability on — clients posting {profile.trade} jobs near you will see your profile.
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((m) => (
              <div key={m.id} className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-display font-semibold">{m.job.title}</p>
                    <Badge tone={statusTone(m.job.status)}>{m.job.status.toLowerCase()}</Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-muted">{m.job.description}</p>
                  <p className="mt-1 text-xs text-muted">
                    📍 {m.job.neighborhood} · for {new Date(m.job.requiredDate).toLocaleDateString()} · {m.job.client.name}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="rounded-full bg-acacia px-3 py-1 text-sm font-bold text-white">#{m.rank}</span>
                    <p className="mt-1 text-xs text-muted">{Math.round(m.score * 100)}% match</p>
                  </div>
                  <a href={`https://wa.me/${wa(m.job.client.phone)}`} target="_blank" className="btn-clay text-sm">
                    Message
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* recent reviews */}
      {reviews.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-xl font-semibold">What clients say</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {reviews.map((r) => (
              <div key={r.id} className="card p-5">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{r.author.name}</span>
                  <span className="text-gold">{"★".repeat(r.stars)}<span className="text-line">{"★".repeat(5 - r.stars)}</span></span>
                </div>
                {r.comment && <p className="mt-1 text-sm text-muted">“{r.comment}”</p>}
                <p className="mt-1 text-xs text-muted">{new Date(r.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
