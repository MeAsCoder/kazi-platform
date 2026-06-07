import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Accepts either field: ban/unban a user (User.isBanned) and/or verify a
// worker (WorkerProfile.isVerified). At least one must be present.
const schema = z
  .object({
    isBanned: z.boolean().optional(),
    isVerified: z.boolean().optional(),
  })
  .refine((d) => d.isBanned !== undefined || d.isVerified !== undefined, {
    message: "Nothing to update",
  });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { isBanned, isVerified } = parsed.data;

  if (isBanned !== undefined) {
    await prisma.user.update({ where: { id: params.id }, data: { isBanned } });
  }
  if (isVerified !== undefined) {
    // WorkerProfile is keyed by userId; the id passed in is the user id.
    await prisma.workerProfile.update({ where: { userId: params.id }, data: { isVerified } });
  }
  return NextResponse.json({ ok: true });
}