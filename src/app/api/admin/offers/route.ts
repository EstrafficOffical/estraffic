import { NextResponse } from "next/server";
import { z } from "zod";
import  {auth}  from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const OfferSchema = z.object({
  title: z.string().min(2).max(200),
  geo: z.string().min(2).max(50),
  vertical: z.string().min(2).max(50),
  cpa: z.preprocess(v => (v === "" || v == null ? null : Number(v)), z.number().nonnegative().nullable()),
  mode: z.enum(["Auto", "Manual"]).default("Auto"),
  tag: z.string().max(50).optional(),
  targetUrl: z.string().url().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;
  if (!session?.user || role !== "ADMIN") return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const form = await req.formData();
  const payload = Object.fromEntries(form.entries());
  const parsed = OfferSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });

  const offer = await prisma.offer.create({ data: parsed.data });
  return NextResponse.json({ ok: true, offer });
}
