import { NextResponse } from "next/server";
import {
  PartnerStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminStepUp } from "@/lib/api-guards";

export const dynamic = "force-dynamic";

function optionalText(
  value: unknown,
  max = 191,
) {
  const text = String(value ?? "").trim();

  if (!text) return null;

  return text.slice(0, max);
}

function currency(value: unknown) {
  const text = String(value ?? "USD")
    .trim()
    .toUpperCase();

  if (!/^[A-Z]{3,12}$/.test(text)) {
    return "USD";
  }

  return text;
}

function status(value: unknown) {
  return String(value || "").toUpperCase() ===
    "PAUSED"
    ? PartnerStatus.PAUSED
    : PartnerStatus.ACTIVE;
}

export async function POST(req: Request) {
  const guard = await requireAdminStepUp();

  if (guard.res) {
    return guard.res;
  }

  const actorId = String(
    (guard.session?.user as any)?.id || "",
  );

  const body = await req
    .json()
    .catch(() => null);

  if (!body) {
    return NextResponse.json(
      { error: "INVALID_JSON" },
      { status: 400 },
    );
  }

  const name = String(body.name || "")
    .trim()
    .slice(0, 191);

  if (!name) {
    return NextResponse.json(
      { error: "PARTNER_NAME_REQUIRED" },
      { status: 400 },
    );
  }

  try {
    const partner =
      await prisma.partner.create({
        data: {
          name,
          status: status(body.status),
          vertical: optionalText(
            body.vertical,
          ),
          contactName: optionalText(
            body.contactName,
          ),
          contactEmail: optionalText(
            body.contactEmail,
          ),
          contactTelegram: optionalText(
            body.contactTelegram,
          ),
          paymentTerms: optionalText(
            body.paymentTerms,
          ),
          settlementCurrency: currency(
            body.settlementCurrency,
          ),
          integrationType: optionalText(
            body.integrationType,
            64,
          ),
          internalNotes: optionalText(
            body.internalNotes,
            10000,
          ),
        },
      });

    await prisma.nexusSecurityEvent.create({
      data: {
        eventType: "PARTNER_CREATED",
        userId: actorId || null,
        metadata: {
          partnerId: partner.id,
          name: partner.name,
          status: partner.status,
        },
      },
    });

    return NextResponse.json(
      { ok: true, partner },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "PARTNER_NAME_EXISTS" },
        { status: 409 },
      );
    }

    console.error(
      "[NEXUS PARTNER CREATE ERROR]",
      error,
    );

    return NextResponse.json(
      { error: "PARTNER_CREATE_FAILED" },
      { status: 500 },
    );
  }
}