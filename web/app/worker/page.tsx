import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Stars, Badge } from "@/components/ui";
import { AvailabilityToggle } from "./availability-toggle";

export default async function WorkerDashboard() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const profile = await prisma.workerProfile.findUnique({
    where: { userId },
    include: { user: { select: { name: true, neighborhood: true } } },
  });
  if (!profile) redirect("/login");

  const matches = await prisma.match.findMany({
    where: { workerId: profile.id },
    include: { job: { include: { client: { select: { name: true, neighborhood: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Hi, {profile.user.name.split(" ")[0]} 👋</h1>
        <p className="text-muted">Here&apos;s your fundi profile and the jobs you&apos;ve been matched to.</p>
      </div>

      {/* profile + stats */}
      <div className="grid gap-5 md:grid-cols-3">
        <div className="card p-6 md:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <Badge>{profile.trade}</Badge>
              <h2 className="mt-2 font-display text-xl font-semibold">{profile.skills}</h2>
              <p className="mt-1 text-sm text-muted">
                📍 {profile.user.neighborhood} · {profile.experienceYears} yrs experience · KES{" "}
                {profile.hourlyRate}/hr
              </p>
              <div className="mt-2">
                <Stars value={profile.avgRating} count={profile.ratingCount} />
              </div>
            </div>
            {profile.isVerified && <Badge tone="acacia">Verified</Badge>}
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {profile.availableDays.length ? (
              profile.availableDays.map((d) => <span key={d} className="chip chip-on">{d}</span>)
            ) : (
              <span className="text-sm text-muted">Available any day</span>
            )}
          </div>
        </div>

        <div className="card p-6">
          <p className="text-sm text-muted">Availability</p>
          <AvailabilityToggle initial={profile.isAvailable} />
          <div className="mt-5 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl bg-paper/70 p-3">
              <p className="font-display text-2xl font-bold">{profile.jobsCompleted}</p>
              <p className="text-xs text-muted">jobs done</p>
            </div>
            <div className="rounded-xl bg-paper/70 p-3">
              <p className="font-display text-2xl font-bold">{matches.length}</p>
              <p className="text-xs text-muted">matches</p>
            </div>
          </div>
        </div>
      </div>

      {/* matches */}
      <div>
        <h2 className="mb-3 font-display text-xl font-semibold">Jobs you were matched to</h2>
        {matches.length === 0 ? (
          <div className="card p-8 text-center text-muted">
            No matches yet. Keep your availability on — clients posting {profile.trade} jobs near you
            will see your profile.
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((m) => (
              <div key={m.id} className="card flex items-center justify-between p-5">
                <div>
                  <p className="font-display font-semibold">{m.job.title}</p>
                  <p className="text-sm text-muted">{m.job.description}</p>
                  <p className="mt-1 text-xs text-muted">
                    📍 {m.job.neighborhood} · for {new Date(m.job.requiredDate).toLocaleDateString()} ·
                    client {m.job.client.name}
                  </p>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-acacia px-3 py-1 text-sm font-bold text-white">
                    #{m.rank}
                  </span>
                  <p className="mt-1 text-xs text-muted">{Math.round(m.score * 100)}% match</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
