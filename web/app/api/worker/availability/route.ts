import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ isAvailable: z.boolean() });

export async function PATCH(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!userId || role !== "WORKER") {
    return NextResponse.json({ error: "Workers only" }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  await prisma.workerProfile.update({
    where: { userId },
    data: { isAvailable: parsed.data.isAvailable },
  });
  return NextResponse.json({ ok: true });
}
