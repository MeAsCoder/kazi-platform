import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { matchWorkers } from "@/lib/matching";

const HOODS: Record<string, [number, number]> = {
  Kasarani: [-1.2196, 36.8966], Roysambu: [-1.2167, 36.8833], Umoja: [-1.2833, 36.8917],
  Embakasi: [-1.3167, 36.9], Kibera: [-1.3133, 36.7892], Westlands: [-1.2649, 36.805],
  Kilimani: [-1.2906, 36.7833], Karen: [-1.3197, 36.7085], Donholm: [-1.292, 36.887],
  Ruaka: [-1.205, 36.78], Kahawa: [-1.183, 36.923], "South B": [-1.308, 36.835],
  Lavington: [-1.279, 36.77], Ngara: [-1.273, 36.83], CBD: [-1.2864, 36.8172],
};

const schema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  neighborhood: z.string().min(2),
  requiredDate: z.string(),
});

export async function POST(req: Request) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId || role !== "CLIENT") {
    return NextResponse.json({ error: "Only clients can post jobs" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const d = parsed.data;
  const [lat, lng] = HOODS[d.neighborhood] ?? HOODS["CBD"];

  // Predict trade + rank workers.
  const { prediction, workers } = await matchWorkers({
    text: `${d.title}. ${d.description}`,
    lat,
    lng,
    topN: 5,
  });

  // Persist the job and its matches.
  const job = await prisma.job.create({
    data: {
      clientId: userId,
      title: d.title,
      description: d.description,
      neighborhood: d.neighborhood,
      lat,
      lng,
      requiredDate: new Date(d.requiredDate),
      predictedTrade: prediction.trade,
      status: workers.length ? "MATCHED" : "OPEN",
      matches: {
        create: workers.map((w, i) => ({
          workerId: w.workerId,
          score: w.matchPercent / 100,
          scoreBreakdown: w.breakdown,
          rank: i + 1,
        })),
      },
    },
    include: { matches: true },
  });

  // attach the match id to each ranked worker for the rating flow
  const byWorker = new Map(job.matches.map((m) => [m.workerId, m.id]));
  const results = workers.map((w) => ({ ...w, matchId: byWorker.get(w.workerId) }));

  return NextResponse.json({ jobId: job.id, prediction, workers: results }, { status: 201 });
}
