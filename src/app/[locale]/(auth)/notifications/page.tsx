import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Notice = {
  id: string;
  category:
    | "Account"
    | "Access"
    | "Cap"
    | "Finance"
    | "Payout";
  severity:
    | "info"
    | "success"
    | "warning"
    | "critical";
  title: string;
  description: string;
  detail: string;
  createdAt: Date;
  href: string;
  action: string;
};

type SearchParams = Promise<{
  category?: string;
  severity?: string;
}>;

function money(value: unknown, currency = "USD") {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(number) ? number : 0);
}

function when(value: Date) {
  const diff = Date.now() - value.getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours} h ago`;

  const days = Math.floor(hours / 24);

  if (days < 30) return `${days} d ago`;

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
  }).format(value);
}

function severityRank(severity: Notice["severity"]) {
  if (severity === "critical") return 4;
  if (severity === "warning") return 3;
  if (severity === "success") return 2;
  return 1;
}

function badgeClass(severity: Notice["severity"]) {
  if (severity === "critical") {
    return "border-rose-400/25 bg-rose-400/10 text-rose-300";
  }

  if (severity === "warning") {
    return "border-amber-400/25 bg-amber-400/10 text-amber-300";
  }

  if (severity === "success") {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
  }

  return "border-sky-400/20 bg-sky-400/[0.08] text-sky-300";
}

export default async function AffiliateNotificationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  const filters = await searchParams;

  const session = await auth();
  const userId = String((session?.user as any)?.id || "");
  const role = String((session?.user as any)?.role || "");

  if (!session?.user || role !== "USER") {
    redirect(`/${locale}`);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      status: true,
      tier: true,
      application: {
        select: {
          status: true,
          reviewedAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!user || user.status !== "APPROVED") {
    redirect(`/${locale}/status`);
  }

  const since = new Date(
    Date.now() - 45 * 24 * 60 * 60 * 1000,
  );

  const [accesses, requests, payouts, earnings] =
    await Promise.all([
      prisma.flowAccess.findMany({
        where: {
          userId,
          status: "APPROVED",
        },
        orderBy: { updatedAt: "desc" },
        include: {
          termsVersion: true,
          flow: {
            include: {
              termsVersions: {
                orderBy: { version: "desc" },
                take: 1,
              },
              market: {
                include: {
                  brand: true,
                },
              },
            },
          },
        },
      }),

      prisma.flowAccessRequest.findMany({
        where: {
          userId,
          updatedAt: { gte: since },
        },
        orderBy: { updatedAt: "desc" },
        take: 30,
        include: {
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
      }),

      prisma.nexusPayout.findMany({
        where: {
          userId,
          updatedAt: { gte: since },
        },
        orderBy: { updatedAt: "desc" },
        take: 30,
      }),

      prisma.nexusEarning.findMany({
        where: {
          userId,
          updatedAt: { gte: since },
        },
        orderBy: { updatedAt: "desc" },
        take: 40,
        select: {
          id: true,
          flowId: true,
          amount: true,
          currency: true,
          status: true,
          releaseAt: true,
          availableAt: true,
          reversedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

  const capAccesses = accesses
    .map((access) => ({
      ...access,
      effectiveCap:
        access.customCapFtd ??
        access.termsVersion?.capFtd ??
        null,
    }))
    .filter(
      (access) =>
        access.effectiveCap != null &&
        access.effectiveCap > 0,
    );

  const capFlowIds = capAccesses.map(
    (access) => access.flowId,
  );

  const capConversions = capFlowIds.length
    ? await prisma.nexusConversion.findMany({
        where: {
          userId,
          flowId: { in: capFlowIds },
          type: "DEP",
          status: "APPROVED",
        },
        select: {
          flowId: true,
          termsVersionId: true,
        },
        take: 50000,
      })
    : [];

  const ftdByAccess = new Map<string, number>();

  for (const conversion of capConversions) {
    const key = [
      conversion.flowId,
      conversion.termsVersionId || "",
    ].join("|");

    ftdByAccess.set(
      key,
      (ftdByAccess.get(key) || 0) + 1,
    );
  }

  const capRows = capAccesses.map((access) => {
    const key = [
      access.flowId,
      access.termsVersionId || "",
    ].join("|");

    const ftd = ftdByAccess.get(key) || 0;
    const cap = Number(access.effectiveCap || 0);

    return {
      access,
      ftd,
      cap,
      progress: cap > 0 ? ftd / cap : 0,
    };
  });

  const earningFlowIds = Array.from(
    new Set(earnings.map((earning) => earning.flowId)),
  );

  const earningFlows = earningFlowIds.length
    ? await prisma.flow.findMany({
        where: {
          id: { in: earningFlowIds },
        },
        select: {
          id: true,
          name: true,
          market: {
            select: {
              geo: true,
              brand: {
                select: { name: true },
              },
            },
          },
        },
      })
    : [];

  const earningFlowById = new Map(
    earningFlows.map((flow) => [
      flow.id,
      `${flow.market.brand.name} ${flow.market.geo} / ${flow.name}`,
    ]),
  );

  const notices: Notice[] = [];

  if (
    user.application?.status === "APPROVED" &&
    user.application.reviewedAt
  ) {
    notices.push({
      id: "account-approved",
      category: "Account",
      severity: "success",
      title: "Affiliate account approved",
      description:
        "Your NEXUS affiliate application is approved and platform access is active.",
      detail: `Tier ${user.tier}`,
      createdAt: user.application.reviewedAt,
      href: `/${locale}/profile`,
      action: "Open profile",
    });
  }

  for (const request of requests) {
    const flowLabel =
      `${request.flow.market.brand.name} ${request.flow.market.geo} / ${request.flow.name}`;

    if (request.status === "APPROVED") {
      notices.push({
        id: `access:${request.id}:approved`,
        category: "Access",
        severity: "success",
        title: "Offer access approved",
        description: `${flowLabel} is now available in My Offers.`,
        detail: request.processedAt
          ? `Processed ${when(request.processedAt)}`
          : "Approved",
        createdAt: request.processedAt || request.updatedAt,
        href: `/${locale}/offers/mine`,
        action: "Open My Offers",
      });
    } else if (request.status === "REJECTED") {
      notices.push({
        id: `access:${request.id}:rejected`,
        category: "Access",
        severity: "warning",
        title: "Offer access request rejected",
        description: `${flowLabel} was not approved.`,
        detail:
          request.message ||
          "Contact your assigned manager if you need clarification.",
        createdAt: request.processedAt || request.updatedAt,
        href: `/${locale}/offers`,
        action: "Browse offers",
      });
    } else {
      notices.push({
        id: `access:${request.id}:pending`,
        category: "Access",
        severity: "info",
        title: "Offer access request pending",
        description: `${flowLabel} is waiting for review.`,
        detail:
          "Your assigned manager or NEXUS staff will review the request.",
        createdAt: request.createdAt,
        href: `/${locale}/offers`,
        action: "Open offers",
      });
    }
  }

  for (const row of capRows) {
    if (row.progress < 0.8) {
      continue;
    }

    const reached = row.progress >= 1;
    const flow = row.access.flow;

    notices.push({
      id: `cap:${row.access.id}`,
      category: "Cap",
      severity: reached ? "critical" : "warning",
      title: reached ? "Flow cap reached" : "Flow is near cap",
      description:
        `${flow.market.brand.name} ${flow.market.geo} / ${flow.name} has ${row.ftd} of ${row.cap} FTD.`,
      detail: reached
        ? "Pause additional traffic and contact your manager before sending more."
        : `${Math.round(row.progress * 100)}% of the active cap is used.`,
      createdAt: row.access.updatedAt,
      href: `/${locale}/offers/mine`,
      action: "Open My Offers",
    });
  }

  for (const access of accesses) {
    const latest = access.flow.termsVersions[0] || null;

    if (
      !latest ||
      !access.termsVersion ||
      latest.id === access.termsVersion.id
    ) {
      continue;
    }

    notices.push({
      id: `terms:${access.id}:${latest.id}`,
      category: "Access",
      severity: "info",
      title: "New flow terms published",
      description:
        `${access.flow.market.brand.name} ${access.flow.market.geo} / ${access.flow.name} has a newer terms version.`,
      detail:
        `Your approved terms remain v${access.termsVersion.version}. Latest published version is v${latest.version}. Contact your manager before changing traffic assumptions.`,
      createdAt: latest.effectiveFrom,
      href: `/${locale}/offers/mine`,
      action: "Review My Offer",
    });
  }

  for (const earning of earnings) {
    const flowLabel =
      earningFlowById.get(earning.flowId) ||
      "Approved flow";

    if (earning.status === "AVAILABLE") {
      notices.push({
        id: `earning:${earning.id}:available`,
        category: "Finance",
        severity: "success",
        title: "Funds became available",
        description: `${money(
          earning.amount,
          earning.currency,
        )} from ${flowLabel} moved to available balance.`,
        detail:
          "The validated amount is now eligible for payout according to NEXUS payout rules.",
        createdAt: earning.availableAt || earning.updatedAt,
        href: `/${locale}/finance`,
        action: "Open Finance",
      });
    } else if (earning.status === "REVERSED") {
      notices.push({
        id: `earning:${earning.id}:reversed`,
        category: "Finance",
        severity: "critical",
        title: "Earning reversed",
        description: `${money(
          earning.amount,
          earning.currency,
        )} from ${flowLabel} was reversed.`,
        detail:
          "Review the conversion state or contact your assigned manager.",
        createdAt: earning.reversedAt || earning.updatedAt,
        href: `/${locale}/finance`,
        action: "Open Finance",
      });
    } else {
      notices.push({
        id: `earning:${earning.id}:pending`,
        category: "Finance",
        severity: "info",
        title: "Conversion payout pending validation",
        description: `${money(
          earning.amount,
          earning.currency,
        )} from ${flowLabel} is pending.`,
        detail: earning.releaseAt
          ? `Scheduled release: ${new Intl.DateTimeFormat(
              "en-GB",
              { dateStyle: "medium" },
            ).format(earning.releaseAt)}`
          : "Validation or hold requirements are still pending.",
        createdAt: earning.createdAt,
        href: `/${locale}/finance`,
        action: "Open Finance",
      });
    }
  }

  for (const payout of payouts) {
    const amount = money(payout.amount, payout.currency);

    if (payout.status === "PAID") {
      notices.push({
        id: `payout:${payout.id}:paid`,
        category: "Payout",
        severity: "success",
        title: "Payout paid",
        description: `${amount} has been marked as paid.`,
        detail:
          payout.txHash
            ? `Transaction: ${payout.txHash}`
            : payout.destinationLabel || "Payment completed",
        createdAt: payout.paidAt || payout.updatedAt,
        href: `/${locale}/finance`,
        action: "Open Finance",
      });
    } else if (
      payout.status === "REJECTED" ||
      payout.status === "CANCELED"
    ) {
      notices.push({
        id: `payout:${payout.id}:closed`,
        category: "Payout",
        severity: "warning",
        title:
          payout.status === "REJECTED"
            ? "Payout rejected"
            : "Payout canceled",
        description: `${amount} payout request is ${payout.status.toLowerCase()}.`,
        detail:
          payout.note ||
          "Contact your assigned manager if you need clarification.",
        createdAt:
          payout.rejectedAt ||
          payout.canceledAt ||
          payout.updatedAt,
        href: `/${locale}/finance`,
        action: "Open Finance",
      });
    } else if (payout.status === "APPROVED") {
      notices.push({
        id: `payout:${payout.id}:approved`,
        category: "Payout",
        severity: "success",
        title: "Payout approved",
        description: `${amount} is approved for payment.`,
        detail:
          "The payout is waiting for final payment confirmation.",
        createdAt: payout.approvedAt || payout.updatedAt,
        href: `/${locale}/finance`,
        action: "Open Finance",
      });
    } else {
      notices.push({
        id: `payout:${payout.id}:requested`,
        category: "Payout",
        severity: "info",
        title: "Payout request received",
        description: `${amount} payout request is under review.`,
        detail:
          payout.destinationLabel || "Payment destination saved",
        createdAt: payout.requestedAt,
        href: `/${locale}/finance`,
        action: "Open Finance",
      });
    }
  }

  const unique = Array.from(
    new Map(notices.map((item) => [item.id, item])).values(),
  );

  unique.sort((a, b) => {
    const priority =
      severityRank(b.severity) - severityRank(a.severity);

    if (priority !== 0) {
      return priority;
    }

    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const category = String(filters.category || "ALL");
  const severity = String(filters.severity || "ALL");

  const visible = unique.filter((item) => {
    if (
      category !== "ALL" &&
      item.category !== category
    ) {
      return false;
    }

    if (
      severity !== "ALL" &&
      item.severity !== severity
    ) {
      return false;
    }

    return true;
  });

  const capWarnings = unique.filter(
    (item) => item.category === "Cap",
  ).length;

  const critical = unique.filter(
    (item) => item.severity === "critical",
  ).length;

  const moneyNotices = unique.filter(
    (item) =>
      item.category === "Finance" ||
      item.category === "Payout",
  ).length;

  const categories = Array.from(
    new Set(unique.map((item) => item.category)),
  ).sort();

  return (
    <div className="min-h-screen bg-[#08090d] px-5 py-8 text-white md:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-[1600px]">
        <header className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8068ff]">
              Account activity
            </div>

            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em]">
              Notifications
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/42">
              Offer access, cap health, balance validation and payout updates for your affiliate account.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/${locale}/offers/mine`}
              className="rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 py-2.5 text-xs font-semibold text-white/55 transition hover:bg-white/[0.05] hover:text-white"
            >
              My Offers
            </Link>

            <Link
              href={`/${locale}/finance`}
              className="rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 py-2.5 text-xs font-semibold text-white/55 transition hover:bg-white/[0.05] hover:text-white"
            >
              Finance
            </Link>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Live notices" value={unique.length} accent />
          <Metric
            label="Critical"
            value={critical}
            tone={critical > 0 ? "danger" : "good"}
          />
          <Metric
            label="Cap warnings"
            value={capWarnings}
            tone={capWarnings > 0 ? "warning" : "good"}
          />
          <Metric label="Finance updates" value={moneyNotices} />
        </section>

        <form
          className="mt-5 grid gap-3 rounded-2xl border border-white/[0.08] bg-[#0d0f14] p-4 md:grid-cols-[1fr_1fr_auto_auto]"
          method="get"
        >
          <select
            name="category"
            defaultValue={category}
            className="h-12 rounded-xl border border-white/[0.08] bg-[#090b10] px-4 text-sm text-white/70 outline-none focus:border-[#7657ff]/45"
          >
            <option value="ALL">All categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            name="severity"
            defaultValue={severity}
            className="h-12 rounded-xl border border-white/[0.08] bg-[#090b10] px-4 text-sm text-white/70 outline-none focus:border-[#7657ff]/45"
          >
            <option value="ALL">All priorities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="success">Success</option>
            <option value="info">Info</option>
          </select>

          <button
            type="submit"
            className="h-12 rounded-xl bg-[#7357ff] px-5 text-sm font-semibold text-white transition hover:bg-[#826cff]"
          >
            Apply
          </button>

          <Link
            href={`/${locale}/notifications`}
            className="inline-flex h-12 items-center justify-center rounded-xl border border-white/[0.08] px-5 text-sm font-semibold text-white/42 transition hover:bg-white/[0.04] hover:text-white/70"
          >
            Clear
          </Link>
        </form>

        <section className="mt-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14]">
          <div className="border-b border-white/[0.07] px-5 py-4">
            <div className="font-semibold">Notification stream</div>
            <div className="mt-1 text-xs text-white/30">
              Important cap and account actions first, followed by recent updates.
            </div>
          </div>

          {visible.length ? (
            <div className="divide-y divide-white/[0.06]">
              {visible.map((item) => (
                <article
                  key={item.id}
                  className="grid gap-4 px-5 py-5 lg:grid-cols-[180px_minmax(0,1fr)_auto] lg:items-center"
                >
                  <div>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${badgeClass(
                        item.severity,
                      )}`}
                    >
                      {item.severity}
                    </span>

                    <div className="mt-2 text-[9px] font-semibold uppercase tracking-[0.13em] text-white/34">
                      {item.category}
                    </div>

                    <div className="mt-1 text-[10px] text-white/24">
                      {when(item.createdAt)}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white/82">
                      {item.title}
                    </div>

                    <div className="mt-1 text-sm text-white/54">
                      {item.description}
                    </div>

                    <div className="mt-2 text-[11px] leading-5 text-white/28">
                      {item.detail}
                    </div>
                  </div>

                  <div className="flex items-center lg:justify-end">
                    <Link
                      href={item.href}
                      className="rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 py-2.5 text-xs font-semibold text-white/52 transition hover:border-[#7657ff]/30 hover:bg-[#7657ff]/[0.06] hover:text-[#b2a5ff]"
                    >
                      {item.action}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="px-6 py-20 text-center">
              <div className="text-sm font-semibold text-white/65">
                No matching notifications
              </div>
              <div className="mt-2 text-xs text-white/28">
                There are no live notices for the selected filters.
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  accent = false,
  tone = "neutral",
}: {
  label: string;
  value: number;
  accent?: boolean;
  tone?: "neutral" | "good" | "warning" | "danger";
}) {
  const valueClass =
    tone === "good"
      ? "text-emerald-300"
      : tone === "warning"
        ? "text-amber-300"
        : tone === "danger"
          ? "text-rose-300"
          : "text-white";

  return (
    <div
      className={`rounded-2xl border p-5 ${
        accent
          ? "border-[#7657ff]/30 bg-[#7657ff]/[0.065]"
          : "border-white/[0.08] bg-[#0d0f14]"
      }`}
    >
      <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">
        {label}
      </div>

      <div
        className={`mt-3 text-[28px] font-semibold tracking-[-0.035em] ${valueClass}`}
      >
        {value.toLocaleString("en-US")}
      </div>

      <div className="mt-2 text-[10px] text-white/22">
        Live NEXUS data
      </div>
    </div>
  );
}