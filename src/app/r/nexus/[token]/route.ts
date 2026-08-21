import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { FlowAccessStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function optionalParam(url: URL, key: string) {
  const value = url.searchParams.get(key)?.trim();
  return value || undefined;
}

function isSpeculativeNavigation(req: Request) {
  const purpose = (req.headers.get("purpose") || "").toLowerCase();
  const secPurpose = (req.headers.get("sec-purpose") || "").toLowerCase();
  const nextRouterPrefetch = (req.headers.get("next-router-prefetch") || "").toLowerCase();

  return (
    purpose.includes("prefetch") ||
    purpose.includes("prerender") ||
    secPurpose.includes("prefetch") ||
    secPurpose.includes("prerender") ||
    nextRouterPrefetch === "1"
  );
}

function buildDestination(
  targetUrl: string,
  values: {
    clickId: string;
    userId: string;
    flowId: string;
    sub1?: string;
    sub2?: string;
    sub3?: string;
    sub4?: string;
    sub5?: string;
  },
) {
  const replacements: Record<string, string> = {
    "{click_id}": values.clickId,
    "{clickId}": values.clickId,
    "{userId}": values.userId,
    "{flowId}": values.flowId,
    "{sub1}": values.sub1 ?? "",
    "{sub2}": values.sub2 ?? "",
    "{sub3}": values.sub3 ?? "",
    "{sub4}": values.sub4 ?? "",
    "{sub5}": values.sub5 ?? "",
  };

  let expanded = targetUrl;
  for (const [placeholder, value] of Object.entries(replacements)) {
    expanded = expanded.replaceAll(placeholder, value);
  }

  const out = new URL(expanded);

  if (!out.searchParams.has("click_id")) {
    out.searchParams.set("click_id", values.clickId);
  }

  if (values.sub1 && !out.searchParams.has("sub_id")) {
    out.searchParams.set("sub_id", values.sub1);
  }

  return out.toString();
}

export async function GET(req: Request, ctx: { params: { token: string } }) {
  const token = ctx.params.token;

  // Chromium/Opera may issue a speculative prefetch/prerender request immediately
  // before the real navigation. Never count or redirect speculative requests.
  if (isSpeculativeNavigation(req)) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Nexus-Prefetch-Ignored": "1",
        Vary: "Purpose, Sec-Purpose, Next-Router-Prefetch",
      },
    });
  }

  const incoming = new URL(req.url);

  const link = await prisma.nexusTrackingLink.findUnique({
    where: { token },
  });

  if (!link) {
    return NextResponse.json({ error: "TRACKING_LINK_NOT_FOUND" }, { status: 404 });
  }

  const access = await prisma.flowAccess.findUnique({
    where: {
      userId_flowId: {
        userId: link.userId,
        flowId: link.flowId,
      },
    },
    include: {
      termsVersion: true,
      flow: {
        include: {
          market: {
            include: {
              brand: true,
            },
          },
        },
      },
    },
  });

  if (!access || access.status !== FlowAccessStatus.APPROVED) {
    return NextResponse.json({ error: "FLOW_ACCESS_NOT_APPROVED" }, { status: 403 });
  }

  const flow = access.flow;
  const affiliateCpaSnapshot =
    access.customAffiliateCpa ?? access.termsVersion?.affiliateCpa ?? null;
  const advertiserCpaSnapshot =
    access.termsVersion?.advertiserCpa ?? null;
  const currencySnapshot =
    access.termsVersion?.currency ?? "USD";
  const capFtdSnapshot =
    access.customCapFtd ?? access.termsVersion?.capFtd ?? null;

  if (
    flow.status !== "ACTIVE" ||
    flow.market.status !== "ACTIVE" ||
    flow.market.brand.status !== "ACTIVE" ||
    !flow.targetUrl
  ) {
    return NextResponse.json({ error: "FLOW_NOT_AVAILABLE" }, { status: 404 });
  }

  const sub1 =
    optionalParam(incoming, "sub1") ??
    optionalParam(incoming, "subid") ??
    optionalParam(incoming, "sub_id");
  const sub2 = optionalParam(incoming, "sub2");
  const sub3 = optionalParam(incoming, "sub3");
  const sub4 = optionalParam(incoming, "sub4");
  const sub5 = optionalParam(incoming, "sub5");
  const source = optionalParam(incoming, "source");
  const campaign = optionalParam(incoming, "campaign");
  const adset = optionalParam(incoming, "adset");
  const creative = optionalParam(incoming, "creative");

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    undefined;
  const userAgent = req.headers.get("user-agent") ?? undefined;
  const referer = req.headers.get("referer") ?? undefined;

  const clickId = randomUUID();

  let destinationUrl: string;
  try {
    destinationUrl = buildDestination(flow.targetUrl, {
      clickId,
      userId: link.userId,
      flowId: flow.id,
      sub1,
      sub2,
      sub3,
      sub4,
      sub5,
    });
  } catch {
    return NextResponse.json({ error: "INVALID_TARGET_URL" }, { status: 500 });
  }

  await prisma.nexusClick.create({
    data: {
      clickId,
      trackingLinkId: link.id,
      userId: link.userId,
      flowId: flow.id,
      termsVersionId: access.termsVersionId ?? null,
      affiliateCpaSnapshot,
      advertiserCpaSnapshot,
      currencySnapshot,
      capFtdSnapshot,
      sub1,
      sub2,
      sub3,
      sub4,
      sub5,
      source,
      campaign,
      adset,
      creative,
      ip,
      userAgent,
      referer,
      destinationUrl,
    },
  });

  return NextResponse.redirect(destinationUrl, { status: 302 });
}
