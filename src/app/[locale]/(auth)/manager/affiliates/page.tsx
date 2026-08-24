import "server-only";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function money(value: number) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function pillClass(status: string) {
  if (status === "APPROVED") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }

  if (status === "PENDING") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  }

  return "border-rose-400/20 bg-rose-400/10 text-rose-300";
}

type CapTone = "HEALTHY" | "NEAR_CAP" | "REACHED";

type CapSummary = {
  flowId: string;
  label: string;
  used: number;
  cap: number;
  remaining: number;
  percent: number;
  tone: CapTone;
};

function capTone(percent: number): CapTone {
  if (percent >= 100) return "REACHED";
  if (percent >= 80) return "NEAR_CAP";
  return "HEALTHY";
}

function capToneLabel(tone: CapTone) {
  if (tone === "REACHED") return "Cap reached";
  if (tone === "NEAR_CAP") return "Near cap";
  return "Healthy";
}

function capToneClass(tone: CapTone) {
  if (tone === "REACHED") {
    return "border-rose-400/25 bg-rose-400/10 text-rose-300";
  }

  if (tone === "NEAR_CAP") {
    return "border-amber-400/25 bg-amber-400/10 text-amber-300";
  }

  return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
}

function capBarClass(tone: CapTone) {
  if (tone === "REACHED") return "bg-rose-400";
  if (tone === "NEAR_CAP") return "bg-amber-400";
  return "bg-emerald-400";
}

export default async function ManagerAffiliatesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  const role = String((session?.user as any)?.role || "");
  const staffId = String((session?.user as any)?.id || "");

  if (!session?.user || !["MANAGER", "ADMIN", "OWNER"].includes(role)) {
    redirect(`/${locale}`);
  }

  const where =
    role === "MANAGER"
      ? {
          role: "USER" as const,
          assignedManagerId: staffId,
        }
      : {
          role: "USER" as const,
        };

  const affiliates = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      telegram: true,
      status: true,
      tier: true,
      createdAt: true,
      application: {
        select: {
          company: true,
          mainGeos: true,
          trafficSources: true,
          verticalInterests: true,
          estimatedMonthlyVolume: true,
        },
      },
      _count: {
        select: {
          flowAccesses: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  const affiliateIds = affiliates.map((affiliate) => affiliate.id);

  const [
    clickRows,
    conversionRows,
    payoutRows,
    approvedAccessRows,
  ] =
    affiliateIds.length > 0
      ? await Promise.all([
          prisma.nexusClick.groupBy({
            by: ["userId"],
            where: {
              userId: { in: affiliateIds },
            },
            _count: { _all: true },
          }),

          prisma.nexusConversion.groupBy({
            by: ["userId", "flowId", "type", "status"],
            where: {
              userId: { in: affiliateIds },
            },
            _count: { _all: true },
            _sum: { affiliatePayout: true },
          }),

          prisma.nexusPayout.groupBy({
            by: ["userId", "status"],
            where: {
              userId: { in: affiliateIds },
            },
            _count: { _all: true },
            _sum: { amount: true },
          }),

          prisma.flowAccess.findMany({
            where: {
              userId: { in: affiliateIds },
              status: "APPROVED",
            },
            select: {
              userId: true,
              flowId: true,
              customCapFtd: true,
              termsVersion: {
                select: {
                  capFtd: true,
                },
              },
              flow: {
                select: {
                  name: true,
                  market: {
                    select: {
                      geo: true,
                      brand: {
                        select: {
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          }),
        ])
      : [[], [], [], []];

  const clicksByUser = new Map<string, number>();

  for (const row of clickRows) {
    clicksByUser.set(row.userId, row._count._all || 0);
  }

  type Performance = {
    regs: number;
    ftd: number;
    conversions: number;
    affiliatePayout: number;
  };

  const performanceByUser = new Map<string, Performance>();
  const ftdByUserFlow = new Map<string, number>();

  for (const row of conversionRows) {
    const current =
      performanceByUser.get(row.userId) || {
        regs: 0,
        ftd: 0,
        conversions: 0,
        affiliatePayout: 0,
      };

    const count = row._count._all || 0;

    if (row.status === "APPROVED") {
      current.conversions += count;
      current.affiliatePayout += Number(
        row._sum.affiliatePayout || 0,
      );

      if (row.type === "REG") {
        current.regs += count;
      }

      if (row.type === "DEP") {
        current.ftd += count;

        const flowKey = `${row.userId}:${row.flowId}`;
        ftdByUserFlow.set(
          flowKey,
          (ftdByUserFlow.get(flowKey) || 0) + count,
        );
      }
    }

    performanceByUser.set(row.userId, current);
  }

  type PayoutInfo = {
    openCount: number;
    openAmount: number;
  };

  const payoutsByUser = new Map<string, PayoutInfo>();

  for (const row of payoutRows) {
    const current =
      payoutsByUser.get(row.userId) || {
        openCount: 0,
        openAmount: 0,
      };

    if (
      row.status === "REQUESTED" ||
      row.status === "APPROVED"
    ) {
      current.openCount += row._count._all || 0;
      current.openAmount += Number(row._sum.amount || 0);
    }

    payoutsByUser.set(row.userId, current);
  }

  const capsByUser = new Map<string, CapSummary[]>();

  for (const access of approvedAccessRows) {
    const cap = Number(
      access.customCapFtd ??
        access.termsVersion?.capFtd ??
        0,
    );

    if (!Number.isFinite(cap) || cap <= 0) {
      continue;
    }

    const used =
      ftdByUserFlow.get(`${access.userId}:${access.flowId}`) || 0;

    const percent = Math.max(
      0,
      (used / cap) * 100,
    );

    const summary: CapSummary = {
      flowId: access.flowId,
      label: `${access.flow.market.brand.name} ${access.flow.market.geo} / ${access.flow.name}`,
      used,
      cap,
      remaining: Math.max(0, cap - used),
      percent,
      tone: capTone(percent),
    };

    const current = capsByUser.get(access.userId) || [];
    current.push(summary);
    capsByUser.set(access.userId, current);
  }

  for (const [, summaries] of capsByUser) {
    summaries.sort((a, b) => b.percent - a.percent);
  }

  const rows = affiliates.map((affiliate) => {
    const performance =
      performanceByUser.get(affiliate.id) || {
        regs: 0,
        ftd: 0,
        conversions: 0,
        affiliatePayout: 0,
      };

    const payout =
      payoutsByUser.get(affiliate.id) || {
        openCount: 0,
        openAmount: 0,
      };

    const capSummaries = capsByUser.get(affiliate.id) || [];
    const primaryCap = capSummaries[0] ?? null;

    return {
      ...affiliate,
      clicks: clicksByUser.get(affiliate.id) || 0,
      ...performance,
      ...payout,
      capSummaries,
      primaryCap,
    };
  });

  const totals = rows.reduce(
    (acc, row) => {
      acc.clicks += row.clicks;
      acc.regs += row.regs;
      acc.ftd += row.ftd;
      acc.affiliatePayout += row.affiliatePayout;
      acc.openPayouts += row.openCount;

      for (const cap of row.capSummaries) {
        if (cap.tone === "REACHED") {
          acc.capWarnings += 1;
        } else if (cap.tone === "NEAR_CAP") {
          acc.capWarnings += 1;
        }
      }

      return acc;
    },
    {
      clicks: 0,
      regs: 0,
      ftd: 0,
      affiliatePayout: 0,
      openPayouts: 0,
      capWarnings: 0,
    },
  );

  const active = rows.filter(
    (row) => row.status === "APPROVED",
  ).length;

  return (
    <div className="px-5 py-7 md:px-8 md:py-9">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-6">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8068ff]">
            Management
          </div>

          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em]">
            My Affiliates
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-white/45">
            {role === "MANAGER"
              ? "Live read-only performance and cap monitoring for affiliates assigned to you."
              : "Read-only affiliate management overview with approved-flow cap monitoring."}
          </p>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Metric label="Assigned" value={String(rows.length)} />
          <Metric label="Active" value={String(active)} />
          <Metric
            label="Clicks"
            value={totals.clicks.toLocaleString("en-US")}
          />
          <Metric
            label="FTD"
            value={totals.ftd.toLocaleString("en-US")}
          />
          <Metric
            label="Cap warnings"
            value={String(totals.capWarnings)}
            warning={totals.capWarnings > 0}
          />
          <Metric
            label="Affiliate payout"
            value={money(totals.affiliatePayout)}
            accent
          />
        </div>

        <div className="mb-5 rounded-2xl border border-white/[0.08] bg-[#0d0d10] px-5 py-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
            Manager permissions
          </div>

          <div className="mt-2 text-xs leading-5 text-white/48">
            Read assigned affiliate profiles, traffic, performance and approved-flow cap
            progress. Advertiser rates, network margin, partner contacts, role changes,
            balance changes and payout approval remain hidden and unavailable.
          </div>
        </div>

        {totals.capWarnings > 0 ? (
          <div className="mb-5 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] px-5 py-4">
            <div className="text-sm font-semibold text-amber-200">
              Cap attention required
            </div>

            <div className="mt-1 text-xs leading-5 text-amber-100/55">
              {totals.capWarnings} approved flow
              {totals.capWarnings === 1 ? "" : "s"} assigned to your affiliates
              {totals.capWarnings === 1 ? " is" : " are"} at 80% of cap or higher.
              Review the Cap status column before sending more traffic.
            </div>
          </div>
        ) : null}

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d10] px-6 py-16 text-center">
            <div className="text-base font-semibold text-white/80">
              No affiliates assigned yet
            </div>

            <div className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/38">
              OWNER or ADMIN can assign a personal manager when approving a registration.
              Once assigned, the affiliate will appear here automatically.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#0d0d10]">
            <table className="min-w-[1540px] w-full text-left text-sm">
              <thead className="border-b border-white/[0.07] bg-black/10 text-[9px] uppercase tracking-[0.13em] text-white/30">
                <tr>
                  <th className="px-4 py-3">Affiliate</th>
                  <th className="px-4 py-3">Traffic profile</th>
                  <th className="px-4 py-3">Access</th>
                  <th className="px-4 py-3">Flows</th>
                  <th className="px-4 py-3">Clicks</th>
                  <th className="px-4 py-3">REG</th>
                  <th className="px-4 py-3">FTD</th>
                  <th className="min-w-[290px] px-4 py-3">Cap status</th>
                  <th className="px-4 py-3">Affiliate payout</th>
                  <th className="px-4 py-3">Open payouts</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/[0.06]">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="align-top hover:bg-white/[0.015]"
                  >
                    <td className="px-4 py-4">
                      <div className="font-medium text-white/88">
                        {row.name || "Affiliate"}
                      </div>

                      <div className="mt-1 text-xs text-white/42">
                        {row.email}
                      </div>

                      <div className="mt-1 text-xs text-white/30">
                        {row.telegram || "No Telegram"}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="text-xs text-white/62">
                        {row.application?.company || "-"}
                      </div>

                      <div className="mt-1 text-[11px] text-white/35">
                        GEO:{" "}
                        {row.application?.mainGeos?.length
                          ? row.application.mainGeos.join(", ")
                          : "-"}
                      </div>

                      <div className="mt-1 text-[11px] text-white/35">
                        Source:{" "}
                        {row.application?.trafficSources?.length
                          ? row.application.trafficSources.join(", ")
                          : "-"}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${pillClass(
                          row.status,
                        )}`}
                      >
                        {row.status}
                      </span>

                      <div className="mt-2 text-xs text-white/38">
                        Tier {row.tier}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-white/62">
                      {row._count.flowAccesses}
                    </td>

                    <td className="px-4 py-4 text-white/62">
                      {row.clicks}
                    </td>

                    <td className="px-4 py-4 text-white/62">
                      {row.regs}
                    </td>

                    <td className="px-4 py-4 text-white/62">
                      {row.ftd}
                    </td>

                    <td className="px-4 py-4">
                      {row.primaryCap ? (
                        <div>
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div
                                className="truncate text-xs font-medium text-white/72"
                                title={row.primaryCap.label}
                              >
                                {row.primaryCap.label}
                              </div>

                              <div className="mt-1 text-[11px] text-white/40">
                                {row.primaryCap.used} / {row.primaryCap.cap} FTD
                                {" / "}
                                {row.primaryCap.remaining} remaining
                              </div>
                            </div>

                            <span
                              className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] ${capToneClass(
                                row.primaryCap.tone,
                              )}`}
                            >
                              {capToneLabel(row.primaryCap.tone)}
                            </span>
                          </div>

                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                              className={`h-full rounded-full ${capBarClass(
                                row.primaryCap.tone,
                              )}`}
                              style={{
                                width: `${Math.min(
                                  100,
                                  row.primaryCap.percent,
                                )}%`,
                              }}
                            />
                          </div>

                          <div className="mt-1.5 flex items-center justify-between text-[10px] text-white/28">
                            <span>
                              {Math.min(
                                999,
                                row.primaryCap.percent,
                              ).toFixed(0)}
                              % used
                            </span>

                            {row.capSummaries.length > 1 ? (
                              <span>
                                +{row.capSummaries.length - 1} more capped flow
                                {row.capSummaries.length - 1 === 1 ? "" : "s"}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-white/28">
                          No approved cap
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-4 font-medium text-white/82">
                      {money(row.affiliatePayout)}
                    </td>

                    <td className="px-4 py-4">
                      <div className="text-white/62">
                        {row.openCount}
                      </div>

                      <div className="mt-1 text-[11px] text-white/34">
                        {money(row.openAmount)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 text-xs text-white/28">
          Cap progress is calculated from APPROVED FTD / DEP conversions against
          the affiliate&apos;s approved custom or frozen flow cap. Read-only workspace.
          Sensitive actions remain OWNER / ADMIN only.
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  accent = false,
  warning = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        warning
          ? "border-amber-400/25 bg-amber-400/[0.06]"
          : accent
            ? "border-[#7657ff]/25 bg-[#7657ff]/[0.065]"
            : "border-white/[0.08] bg-[#0d0d10]"
      }`}
    >
      <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/32">
        {label}
      </div>

      <div
        className={`mt-3 text-2xl font-semibold tracking-[-0.03em] ${
          warning ? "text-amber-200" : "text-white"
        }`}
      >
        {value}
      </div>

      <div className="mt-2 text-[10px] text-white/24">
        Live NEXUS data
      </div>
    </div>
  );
}