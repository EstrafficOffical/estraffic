import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { id, patch } = await req.json().catch(()=>({}));
  if (!id || typeof patch !== "object") {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  // Белый список полей для апдейта
  const data: any = {};
  for (const k of ["title","tag","geo","vertical","cpa","kpi1","kpi2","mode","targetUrl"] as const) {
    if (k in patch) data[k] = patch[k];
  }

  try {
    await prisma.offer.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.code || "DB_ERROR" }, { status: 400 });
  }
}
