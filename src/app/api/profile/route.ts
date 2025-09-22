// src/app/api/profile/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const PatchSchema = z.object({
  name: z.string().trim().max(120).optional(),
  telegram: z.string().trim().max(120).optional(),
  email: z.string().trim().email().optional(), // у тебя readOnly, но пусть валидируется
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const id = (session.user as any).id as string;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, telegram: true, image: true },
  });
  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const id = (session.user as any).id as string;

  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  const data: any = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name || null;
  if (parsed.data.telegram !== undefined) data.telegram = parsed.data.telegram || null;
  if (parsed.data.email !== undefined) data.email = parsed.data.email || null;

  try {
    const user = await prisma.user.update({ where: { id }, data, select: { id: true } });
    return NextResponse.json({ ok: true, id: user.id });
  } catch (e: any) {
    // возможный уникальный email и т.п.
    return NextResponse.json({ error: e?.code || "DB_ERROR" }, { status: 400 });
  }
}
