import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Nairobi neighbourhood coordinates (same table the model service demo uses).
const HOODS: Record<string, [number, number]> = {
  Kasarani: [-1.2196, 36.8966], Roysambu: [-1.2167, 36.8833], Umoja: [-1.2833, 36.8917],
  Embakasi: [-1.3167, 36.9], Kibera: [-1.3133, 36.7892], Westlands: [-1.2649, 36.805],
  Kilimani: [-1.2906, 36.7833], Karen: [-1.3197, 36.7085], Donholm: [-1.292, 36.887],
  Ruaka: [-1.205, 36.78], Kahawa: [-1.183, 36.923], "South B": [-1.308, 36.835],
  Lavington: [-1.279, 36.77], Ngara: [-1.273, 36.83], CBD: [-1.2864, 36.8172],
};

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().min(7),
  password: z.string().min(6),
  role: z.enum(["WORKER", "CLIENT"]),
  neighborhood: z.string().min(2),
  // worker-only fields
  trade: z.string().optional(),
  skills: z.string().optional(),
  experienceYears: z.coerce.number().int().min(0).optional(),
  hourlyRate: z.coerce.number().int().min(0).optional(),
  availableDays: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const d = parsed.data;

  if (await prisma.user.findUnique({ where: { phone: d.phone } })) {
    return NextResponse.json({ error: "Phone already registered" }, { status: 409 });
  }
  if (d.role === "WORKER" && (!d.trade || !d.skills)) {
    return NextResponse.json({ error: "Workers must provide a trade and skills" }, { status: 400 });
  }

  const [lat, lng] = HOODS[d.neighborhood] ?? HOODS["CBD"];
  const passwordHash = await bcrypt.hash(d.password, 10);

  const user = await prisma.user.create({
    data: {
      name: d.name,
      phone: d.phone,
      passwordHash,
      role: d.role,
      neighborhood: d.neighborhood,
      lat,
      lng,
      ...(d.role === "WORKER"
        ? {
            workerProfile: {
              create: {
                trade: d.trade!,
                skills: d.skills!,
                experienceYears: d.experienceYears ?? 0,
                hourlyRate: d.hourlyRate ?? 0,
                availableDays: d.availableDays ?? [],
              },
            },
          }
        : {}),
    },
  });

  return NextResponse.json({ id: user.id, role: user.role }, { status: 201 });
}
