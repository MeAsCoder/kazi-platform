import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ status: z.enum(["RESOLVED", "DISMISSED", "OPEN"]) });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  await prisma.fraudFlag.update({ where: { id: params.id }, data: { status: parsed.data.status } });
  return NextResponse.json({ ok: true });
}
