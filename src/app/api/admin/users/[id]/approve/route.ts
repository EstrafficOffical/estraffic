import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: { id: string }}) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") return NextResponse.json({ ok: false }, { status: 403 });

  const u = await prisma.user.update({ where: { id: params.id }, data: { status: "APPROVED" }});
  return NextResponse.json({ ok: true, id: u.id });
}
