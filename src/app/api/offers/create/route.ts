import { NextResponse } from "next/server";
import { z } from "zod";
import { OfferMode } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-guards";

const schema = z.object({
  title: z.string().min(2),
  tag: z.string().trim().optional().nullable(),
  cpa: z.coerce.number().min(0).optional().nullable(),
  geo: z.string().min(2),
  vertical: z.string().min(2),
  kpi1: z.coerce.number().min(0).optional().nullable(),
  kpi2: z.coerce.number().min(0).optional().nullable(),
  mode: z.enum(["Auto", "Manual"]).default("Auto"),
});

export async function POST(req: Request) {
  const { res } = await requireAdmin();

  if (res) {
    return res;
  }

  try {
    const json = await req.json();
    const parsed = schema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const {
      title,
      tag,
      cpa,
      geo,
      vertical,
      kpi1,
      kpi2,
      mode,
    } = parsed.data;

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
      select: {
        id: true,
      },
    });

    return NextResponse.json({
      ok: true,
      id: created.id,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Server error",
      },
      { status: 500 },
    );
  }
}
