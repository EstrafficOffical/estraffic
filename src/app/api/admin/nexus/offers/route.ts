import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  BrandStatus,
  CatalogVisibility,
  FlowAccessMode,
  FlowStatus,
  MarketStatus,
} from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type StaffRole = "OWNER" | "ADMIN" | "MANAGER";

function roleFromSession(session: { user?: { role?: string | null } } | null): StaffRole | null {
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role === "OWNER" || role === "ADMIN" || role === "MANAGER") return role;
  return null;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: unknown) {
  const valueText = text(value);
  return valueText ? valueText : null;
}

function integer(value: unknown, fallback: number | null = null) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isInteger(n) ? n : fallback;
}

function decimal(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : null;
}

function jsonSafe(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (typeof value === "object") {
    if (
      "toString" in (value as Record<string, unknown>) &&
      value?.constructor?.name === "Decimal"
    ) {
      return String(value);
    }
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, jsonSafe(v)]),
    );
  }
  return value;
}

async function requireStaff(write = false) {
  const session = await getServerSession(authOptions);
  const role = roleFromSession(session);
  if (!role) return { error: NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }) };
  if (write && role === "MANAGER") {
    return { error: NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }) };
  }
  return { session, role };
}

export async function GET() {
  const auth = await requireStaff(false);
  if ("error" in auth) return auth.error;

  const [brands, partners] = await Promise.all([
    prisma.brand.findMany({
      orderBy: [{ status: "asc" }, { name: "asc" }],
      include: {
        defaultPartner: { select: { id: true, name: true, status: true } },
        markets: {
          orderBy: { geo: "asc" },
          include: {
            flows: {
              orderBy: [{ status: "asc" }, { name: "asc" }],
              include: {
                partner: { select: { id: true, name: true, status: true } },
                termsVersions: {
                  orderBy: { version: "desc" },
                  take: 1,
                },
              },
            },
          },
        },
      },
    }),
    prisma.partner.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, status: true },
    }),
  ]);

  const mapped = brands.map((brand) => ({
    ...brand,
    markets: brand.markets.map((market) => ({
      ...market,
      flows: market.flows.map((flow) => {
        const latest = flow.termsVersions[0] ?? null;
        const latestTerms = latest
          ? {
              ...latest,
              advertiserCpa:
                auth.role === "MANAGER"
                  ? null
                  : latest.advertiserCpa == null
                    ? null
                    : latest.advertiserCpa.toString(),
              affiliateCpa:
                latest.affiliateCpa == null ? null : latest.affiliateCpa.toString(),
              minDeposit:
                latest.minDeposit == null ? null : latest.minDeposit.toString(),
              baselineValue:
                latest.baselineValue == null ? null : latest.baselineValue.toString(),
              uniqueRdRequirement:
                latest.uniqueRdRequirement == null
                  ? null
                  : latest.uniqueRdRequirement.toString(),
              wagerRequirement:
                latest.wagerRequirement == null
                  ? null
                  : latest.wagerRequirement.toString(),
            }
          : null;

        return {
          ...flow,
          termsVersions: undefined,
          latestTerms,
        };
      }),
    })),
  }));

  return NextResponse.json(
    jsonSafe({
      role: auth.role,
      brands: mapped,
      partners,
    }),
  );
}

export async function POST(request: Request) {
  const auth = await requireStaff(true);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = text((body as Record<string, unknown>).action);

  try {
    if (action === "createBrand") {
      const name = text(body.name);
      const vertical = text(body.vertical);
      if (!name || !vertical) {
        return NextResponse.json({ error: "Brand name and vertical are required" }, { status: 400 });
      }

      let slug = slugify(name);
      if (!slug) slug = `brand-${Date.now()}`;

      const existing = await prisma.brand.findUnique({ where: { slug } });
      if (existing) slug = `${slug}-${Date.now().toString().slice(-5)}`;

      const visibility =
        body.catalogVisibility === "HIDDEN"
          ? CatalogVisibility.HIDDEN
          : body.catalogVisibility === "PRIVATE"
            ? CatalogVisibility.PRIVATE
            : CatalogVisibility.VISIBLE;

      const created = await prisma.brand.create({
        data: {
          name,
          slug,
          vertical,
          status: BrandStatus.ACTIVE,
          catalogVisibility: visibility,
          defaultPartnerId: optionalText(body.defaultPartnerId),
        },
      });

      return NextResponse.json({ ok: true, id: created.id });
    }

    if (action === "createMarket") {
      const brandId = text(body.brandId);
      const geo = text(body.geo).toUpperCase();
      if (!brandId || !geo) {
        return NextResponse.json({ error: "brandId and GEO are required" }, { status: 400 });
      }

      const created = await prisma.market.create({
        data: {
          brandId,
          geo,
          name: optionalText(body.name),
          status: MarketStatus.ACTIVE,
        },
      });

      return NextResponse.json({ ok: true, id: created.id });
    }

    if (action === "createFlow") {
      const marketId = text(body.marketId);
      const name = text(body.name);
      const trafficSource = text(body.trafficSource);
      if (!marketId || !name || !trafficSource) {
        return NextResponse.json({ error: "marketId, flow name and traffic source are required" }, { status: 400 });
      }

      const accessMode =
        body.accessMode === "OPEN"
          ? FlowAccessMode.OPEN
          : body.accessMode === "PRIVATE"
            ? FlowAccessMode.PRIVATE
            : FlowAccessMode.APPROVAL_REQUIRED;

      const created = await prisma.$transaction(async (tx) => {
        const flow = await tx.flow.create({
          data: {
            marketId,
            name,
            trafficSource,
            approach: optionalText(body.approach),
            partnerId: optionalText(body.partnerId),
            tier: integer(body.tier, 3) ?? 3,
            status: FlowStatus.ACTIVE,
            accessMode,
          },
        });

        await tx.flowTermsVersion.create({
          data: {
            flowId: flow.id,
            version: 1,
            advertiserCpa: decimal(body.advertiserCpa),
            affiliateCpa: decimal(body.affiliateCpa),
            currency: text(body.currency) || "USD",
            capFtd: integer(body.capFtd),
            minDeposit: decimal(body.minDeposit),
          },
        });

        return flow;
      });

      return NextResponse.json({ ok: true, id: created.id });
    }

    if (action === "addTermsVersion") {
      const flowId = text(body.flowId);
      if (!flowId) {
        return NextResponse.json({ error: "flowId is required" }, { status: 400 });
      }

      const created = await prisma.$transaction(async (tx) => {
        const latest = await tx.flowTermsVersion.findFirst({
          where: { flowId },
          orderBy: { version: "desc" },
        });

        const now = new Date();
        if (latest && !latest.effectiveTo) {
          await tx.flowTermsVersion.update({
            where: { id: latest.id },
            data: { effectiveTo: now },
          });
        }

        return tx.flowTermsVersion.create({
          data: {
            flowId,
            version: (latest?.version ?? 0) + 1,
            advertiserCpa: decimal(body.advertiserCpa),
            affiliateCpa: decimal(body.affiliateCpa),
            currency: text(body.currency) || latest?.currency || "USD",
            capFtd: integer(body.capFtd),
            minDeposit: decimal(body.minDeposit),
            baselineValue: decimal(body.baselineValue),
            baselineDescription: optionalText(body.baselineDescription),
            uniqueRdRequirement: decimal(body.uniqueRdRequirement),
            wagerRequirement: decimal(body.wagerRequirement),
            validationTiming: optionalText(body.validationTiming),
            fraudHoldDays: integer(body.fraudHoldDays),
            kpiFallback: optionalText(body.kpiFallback),
            notes: optionalText(body.notes),
            effectiveFrom: now,
          },
        });
      });

      return NextResponse.json({ ok: true, id: created.id });
    }


    if (action === "setTrackingTarget") {
      const flowId = text(body.flowId);
      const targetUrl = optionalText(body.targetUrl);
      const trackingTemplate = optionalText(body.trackingTemplate);

      if (!flowId) {
        return NextResponse.json({ error: "flowId is required" }, { status: 400 });
      }

      if (targetUrl) {
        try {
          const parsed = new URL(targetUrl);
          if (!["http:", "https:"].includes(parsed.protocol)) {
            return NextResponse.json({ error: "Target URL must use http or https" }, { status: 400 });
          }
        } catch {
          return NextResponse.json({ error: "Target URL is invalid" }, { status: 400 });
        }
      }

      await prisma.flow.update({
        where: { id: flowId },
        data: {
          targetUrl,
          trackingTemplate,
        },
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("NEXUS admin offers mutation failed", error);
    const message =
      error instanceof Error && error.message.includes("Unique constraint")
        ? "A record with these values already exists"
        : "Database action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}