// src/app/api/postback/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type ConvType = "REG" | "DEP" | "LEAD" | "SALE" | "REBILL";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    // 1) секрет
    const secret = url.searchParams.get("secret");
    if (!secret || secret !== process.env.POSTBACK_SHARED_SECRET) {
      return NextResponse.json({ ok: false, error: "bad secret" }, { status: 401 });
    }

    // 2) базовые параметры
    const offerId = url.searchParams.get("offerId") ?? undefined;
    const type = (url.searchParams.get("type") ?? "") as ConvType;
    const subIdParam = url.searchParams.get("subid") ?? undefined; // ← объявляем ОДИН раз

    if (!offerId || !type) {
      return NextResponse.json({ ok: false, error: "missing offerId or type" }, { status: 400 });
    }

    // 3) проверяем оффер
    const offer = await prisma.offer.findUnique({ where: { id: offerId } });
    if (!offer) {
      return NextResponse.json({ ok: false, error: "offer not found" }, { status: 404 });
    }

    // 4) amount — только для денежных типов
    let amountDecimal: Prisma.Decimal | undefined;
    if (type === "DEP" || type === "SALE" || type === "REBILL") {
      const amountRaw = url.searchParams.get("amount");
      if (!amountRaw) {
        return NextResponse.json(
          { ok: false, error: "amount is required for this type" },
          { status: 400 }
        );
      }
      const normalized = amountRaw.replace(",", ".").trim();
      if (normalized === "" || Number.isNaN(Number(normalized))) {
        return NextResponse.json(
          { ok: false, error: "amount must be a number" },
          { status: 400 }
        );
      }
      amountDecimal = new Prisma.Decimal(normalized);
    }

    // 5) создаём конверсию
    const conv = await prisma.conversion.create({
      data: {
        offerId,
        type,
        amount: amountDecimal,
        subId: subIdParam, // ← пишем в поле БД с правильным именем
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: conv.id });
  } catch (e: any) {
    console.error("[POSTBACK] error:", e);
    return NextResponse.json(
      { ok: false, error: "internal", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
