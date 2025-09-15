import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { OfferMode } from "@prisma/client";

const schema = z.object({
  title: z.string().min(2, "Минимум 2 символа"),
  tag: z.string().trim().optional().nullable(),
  cpa: z.coerce.number().min(0).optional().nullable(),
  geo: z.string().min(2, "Укажи GEO (например US)"),
  vertical: z.string().min(2, "Укажи вертикаль"),
  kpi1: z.coerce.number().min(0).optional().nullable(),
  kpi2: z.coerce.number().min(0).optional().nullable(),
  mode: z.enum(["Auto", "Manual"]).default("Auto"),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, tag, cpa, geo, vertical, kpi1, kpi2, mode } = parsed.data;

    const created = await prisma.offer.create({
      data: {
        title,
        tag: tag ?? null,
        cpa: cpa ?? null,
        geo: geo.toUpperCase(),
        vertical,
        kpi1: kpi1 ?? null,
        kpi2: kpi2 ?? null,
        mode: mode as OfferMode,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
