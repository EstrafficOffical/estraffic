import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  telegram: z.string().min(3),
});

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await req.json();
  const { name, telegram } = schema.parse(body);

  await prisma.user.update({ where: { id: userId }, data: { name, telegram }});
  return NextResponse.json({ ok: true });
}
