import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Lightweight in-app fraud scan: flags accounts that share a phone, and worker
// profiles whose skills text is identical to another's (a cheap clone signal).
export async function POST() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const users = await prisma.user.findMany({ include: { workerProfile: true } });

  // duplicate phones
  const byPhone = new Map<string, string[]>();
  for (const u of users) byPhone.set(u.phone, [...(byPhone.get(u.phone) ?? []), u.id]);

  // duplicate skills text among workers
  const bySkills = new Map<string, string[]>();
  for (const u of users) {
    const s = u.workerProfile?.skills?.trim().toLowerCase();
    if (s) bySkills.set(s, [...(bySkills.get(s) ?? []), u.id]);
  }

  const flags: { userId: string; reason: string; severity: string; details: object }[] = [];
  for (const [phone, ids] of byPhone) if (ids.length > 1)
    ids.forEach((id) => flags.push({ userId: id, reason: "duplicate_phone", severity: "high", details: { phone, shared: ids } }));
  for (const [skills, ids] of bySkills) if (ids.length > 1)
    ids.forEach((id) => flags.push({ userId: id, reason: "duplicate_profile", severity: "medium", details: { skills, shared: ids } }));

  let created = 0;
  for (const f of flags) {
    const exists = await prisma.fraudFlag.findFirst({
      where: { userId: f.userId, reason: f.reason, status: "OPEN" },
    });
    if (!exists) {
      await prisma.fraudFlag.create({ data: { ...f } });
      created++;
    }
  }
  return NextResponse.json({ created });
}
