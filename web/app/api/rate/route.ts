import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  matchId: z.string(),
  stars: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!userId || role !== "CLIENT") {
    return NextResponse.json({ error: "Only clients can rate" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { matchId, stars, comment } = parsed.data;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { job: true, review: true },
  });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (match.job.clientId !== userId) {
    return NextResponse.json({ error: "Not your job" }, { status: 403 });
  }
  if (match.review) return NextResponse.json({ error: "Already rated" }, { status: 409 });

  await prisma.$transaction(async (tx) => {
    await tx.review.create({
      data: {
        matchId: match.id,
        jobId: match.jobId,
        workerId: match.workerId,
        authorId: userId,
        stars,
        comment,
      },
    });
    const w = await tx.workerProfile.findUnique({ where: { id: match.workerId } });
    if (w) {
      const newCount = w.ratingCount + 1;
      const newAvg = (w.avgRating * w.ratingCount + stars) / newCount;
      await tx.workerProfile.update({
        where: { id: w.id },
        data: {
          ratingCount: newCount,
          avgRating: newAvg,
          jobsCompleted: w.jobsCompleted + 1,
          jobsAccepted: Math.max(w.jobsAccepted, w.jobsCompleted + 1),
        },
      });
    }
    await tx.job.update({ where: { id: match.jobId }, data: { status: "COMPLETED" } });
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
