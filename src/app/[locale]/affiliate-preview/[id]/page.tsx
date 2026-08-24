import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Tab =
  | "dashboard"
  | "offers"
  | "my-offers"
  | "statistics"
  | "finance"
  | "profile";

type SearchParams = Promise<{
  tab?: string;
}>;

const TABS: Array<{
  id: Tab;
  label: string;
}> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "offers", label: "Offers" },
  { id: "my-offers", label: "My Offers" },
  { id: "statistics", label: "Statistics" },
  { id: "finance", label: "Finance" },
  { id: "profile", label: "Profile" },
];

function money(
  value: unknown,
  currency = "USD",
) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(
    Number.isFinite(number) ? number : 0,
  );
}

function dateTime(
  value: Date | null | undefined,
) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function cardClass() {
  return "rounded-2xl border border-white/[0.08] bg-[#0d0f14]";
}

function statusTone(value: string) {
  if (
    value === "APPROVED" ||
    value === "ACTIVE" ||
    value === "PAID"
  ) {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }

  if (
    value === "PENDING" ||
    value === "REQUESTED"
  ) {
    return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  }

  return "border-white/10 bg-white/[0.035] text-white/55";
}

function Status({
  value,
}: {
  value: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${statusTone(
        value,
      )}`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}

function Metric({
  label,
  value,
  hint,
  emphasis = false,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`${cardClass()} p-5 ${
        emphasis
          ? "border-[#7657ff]/30 bg-[#7657ff]/[0.055]"
          : ""
      }`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
        {label}
      </div>

      <div className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-white/92">
        {value}
      </div>

      {hint ? (
        <div className="mt-2 text-[11px] text-white/32">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-black/15 px-4 py-3">
      <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/28">
        {label}
      </div>

      <div className="mt-2 break-words text-sm text-white/70">
        {value || "-"}
      </div>
    </div>
  );
}

export default async function AffiliatePreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{
    locale: string;
    id: string;
  }>;
  searchParams: SearchParams;
}) {
  const { locale, id } = await params;
  const query = await searchParams;

  const session = await auth();
  const role = String(
    (session?.user as any)?.role || "",
  );

  if (
    !session?.user ||
    !["OWNER", "ADMIN"].includes(role)
  ) {
    redirect(`/${locale}`);
  }

  const target =
    await prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        telegram: true,
        role: true,
        status: true,
        tier: true,
        createdAt: true,
        assignedManager: {
          select: {
            name: true,
          },
        },
        application: {
          select: {
            status: true,
            company: true,
            trafficSources: true,
            mainGeos: true,
            verticalInterests: true,
            experience: true,
            estimatedMonthlyVolume: true,
            about: true,
          },
        },
      },
    });

  if (!target || target.role !== "USER") {
    redirect(`/${locale}/admin/users`);
  }

  const requestedTab = String(
    query?.tab || "dashboard",
  ) as Tab;

  const tab = TABS.some(
    (item) => item.id === requestedTab,
  )
    ? requestedTab
    : "dashboard";

  const managerName =
    target.assignedManager?.name ||
    "Not assigned";

  const basePath =
    `/${locale}/affiliate-preview/${target.id}`;

  const accessBlocked =
    target.status !== "APPROVED";

  if (accessBlocked) {
    return (
      <div className="min-h-screen bg-[#08090d] px-5 py-8 text-white md:px-8 lg:px-10">
        <div className="mx-auto max-w-[1500px]">
          <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-[#7657ff]/30 bg-[#7657ff]/[0.065] p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a593ff]">
                Viewing as Affiliate / Read Only
              </div>

              <div className="mt-2 text-xl font-semibold">
                {target.name || target.email}
              </div>

              <div className="mt-1 text-xs text-white/40">
                Tier {target.tier} / {target.email}
              </div>
            </div>

            <Link
              href={`/${locale}/admin/users`}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-semibold text-white/75 transition hover:bg-white/[0.04]"
            >
              Exit preview
            </Link>
          </div>

          <div className={`${cardClass()} mx-auto max-w-3xl p-8 text-center`}>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/[0.07] text-xl text-amber-300">
              N
            </div>

            <div className="mt-5 text-2xl font-semibold">
              Platform access unavailable
            </div>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/42">
              This affiliate would not see the internal NEXUS dashboard in the current account state.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Status value={target.status} />
              {target.application?.status ? (
                <Status value={target.application.status} />
              ) : null}
            </div>

            <div className="mt-6 text-xs text-white/30">
              Preview correctly stops here because non-approved affiliates are gated from the platform.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const thirtyDaysAgo =
    new Date(
      Date.now() -
        30 *
          24 *
          60 *
          60 *
          1000,
    );

  const [
    activeFlows,
    approvedAccesses,
    trackingLinks,
    allClicks,
    allRegs,
    allFtd,
    allPayout,
    statClicks,
    statRegs,
    statFtd,
    statPayout,
    recentConversions,
    ledgerRows,
    wallets,
    payouts,
    twoFactor,
  ] = await Promise.all([
    prisma.flow.findMany({
      where: {
        status: "ACTIVE",
        market: {
          status: "ACTIVE",
          brand: {
            status: "ACTIVE",
          },
        },
      },
      orderBy: [
        {
          market: {
            brand: {
              name: "asc",
            },
          },
        },
        {
          market: {
            geo: "asc",
          },
        },
        {
          name: "asc",
        },
      ],
      include: {
        market: {
          include: {
            brand: true,
          },
        },
        termsVersions: {
          orderBy: {
            version: "desc",
          },
          take: 1,
        },
        accesses: {
          where: {
            userId: target.id,
          },
          take: 1,
        },
        accessRequests: {
          where: {
            userId: target.id,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    }),

    prisma.flowAccess.findMany({
      where: {
        userId: target.id,
        status: "APPROVED",
      },
      orderBy: {
        approvedAt: "desc",
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
    }),

    prisma.nexusTrackingLink.findMany({
      where: {
        userId: target.id,
      },
      select: {
        flowId: true,
        token: true,
      },
    }),

    prisma.nexusClick.count({
      where: {
        userId: target.id,
      },
    }),

    prisma.nexusConversion.count({
      where: {
        userId: target.id,
        type: "REG",
        status: "APPROVED",
      },
    }),

    prisma.nexusConversion.count({
      where: {
        userId: target.id,
        type: "DEP",
        status: "APPROVED",
      },
    }),

    prisma.nexusConversion.aggregate({
      where: {
        userId: target.id,
        status: "APPROVED",
      },
      _sum: {
        affiliatePayout: true,
      },
    }),

    prisma.nexusClick.count({
      where: {
        userId: target.id,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    }),

    prisma.nexusConversion.count({
      where: {
        userId: target.id,
        type: "REG",
        status: "APPROVED",
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    }),

    prisma.nexusConversion.count({
      where: {
        userId: target.id,
        type: "DEP",
        status: "APPROVED",
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    }),

    prisma.nexusConversion.aggregate({
      where: {
        userId: target.id,
        status: "APPROVED",
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      _sum: {
        affiliatePayout: true,
      },
    }),

    prisma.nexusConversion.findMany({
      where: {
        userId: target.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 12,
      select: {
        id: true,
        flowId: true,
        type: true,
        status: true,
        affiliatePayout: true,
        currency: true,
        createdAt: true,
      },
    }),

    prisma.nexusFinanceLedger.groupBy({
      by: ["bucket"],
      where: {
        userId: target.id,
      },
      _sum: {
        amount: true,
      },
    }),

    prisma.wallet.findMany({
      where: {
        userId: target.id,
      },
      orderBy: [
        {
          isPrimary: "desc",
        },
        {
          createdAt: "asc",
        },
      ],
      select: {
        id: true,
        label: true,
        address: true,
        verified: true,
        isPrimary: true,
      },
    }),

    prisma.nexusPayout.findMany({
      where: {
        userId: target.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 12,
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        destinationLabel: true,
        txHash: true,
        createdAt: true,
      },
    }),

    prisma.nexusTwoFactor.findUnique({
      where: {
        userId: target.id,
      },
      select: {
        enabled: true,
      },
    }),
  ]);

  const linksByFlow =
    new Map(
      trackingLinks.map((link) => [
        link.flowId,
        link.token,
      ]),
    );

  const flowIds =
    Array.from(
      new Set(
        recentConversions.map(
          (conversion) =>
            conversion.flowId,
        ),
      ),
    );

  const conversionFlows =
    flowIds.length
      ? await prisma.flow.findMany({
          where: {
            id: {
              in: flowIds,
            },
          },
          select: {
            id: true,
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
        })
      : [];

  const conversionFlowById =
    new Map(
      conversionFlows.map(
        (flow) => [
          flow.id,
          `${flow.market.brand.name} / ${flow.market.geo} / ${flow.name}`,
        ],
      ),
    );

  const catalogVisible =
    activeFlows.filter((flow) => {
      const access =
        flow.accesses[0] || null;

      if (
        flow.market.brand
          .catalogVisibility !==
        "VISIBLE"
      ) {
        return false;
      }

      if (flow.tier < target.tier) {
        return false;
      }

      if (
        flow.accessMode ===
          "PRIVATE" &&
        access?.status !==
          "APPROVED"
      ) {
        return false;
      }

      return true;
    });

  const hiddenByBrand =
    activeFlows.filter(
      (flow) =>
        flow.market.brand
          .catalogVisibility !==
        "VISIBLE",
    ).length;

  const hiddenByTier =
    activeFlows.filter(
      (flow) =>
        flow.market.brand
          .catalogVisibility ===
          "VISIBLE" &&
        flow.tier < target.tier,
    ).length;

  const hiddenPrivate =
    activeFlows.filter((flow) => {
      if (
        flow.market.brand
          .catalogVisibility !==
          "VISIBLE" ||
        flow.tier < target.tier ||
        flow.accessMode !==
          "PRIVATE"
      ) {
        return false;
      }

      return (
        flow.accesses[0]?.status !==
        "APPROVED"
      );
    }).length;

  const balance = (
    bucket: string,
  ) =>
    Number(
      ledgerRows.find(
        (row) =>
          row.bucket === bucket,
      )?._sum.amount || 0,
    );

  const pendingBalance =
    balance("PENDING");
  const availableBalance =
    balance("AVAILABLE");
  const reservedBalance =
    balance("RESERVED");
  const paidBalance =
    balance("PAID");

  const totalEarned =
    pendingBalance +
    availableBalance +
    reservedBalance +
    paidBalance;

  const allAffiliatePayout =
    Number(
      allPayout._sum
        .affiliatePayout || 0,
    );

  const statAffiliatePayout =
    Number(
      statPayout._sum
        .affiliatePayout || 0,
    );

  const regToFtd =
    statRegs > 0
      ? statFtd / statRegs
      : 0;

  const visibleNav = (
    <div className={`${cardClass()} overflow-hidden`}>
      <div className="border-b border-white/[0.07] px-4 py-4">
        <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/28">
          Affiliate navigation
        </div>

        <div className="mt-2 text-sm font-semibold">
          NEXUS ALLIANCE
        </div>
      </div>

      <div className="p-2">
        {TABS.map((item) => (
          <Link
            key={item.id}
            href={`${basePath}?tab=${item.id}`}
            className={`block rounded-xl px-3 py-2.5 text-sm transition ${
              item.id === tab
                ? "bg-[#7657ff]/12 font-semibold text-white"
                : "text-white/48 hover:bg-white/[0.035] hover:text-white/70"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="border-t border-white/[0.07] p-4">
        <div className="text-[9px] uppercase tracking-[0.14em] text-white/25">
          Assigned manager
        </div>

        <div className="mt-2 text-sm text-white/65">
          {managerName}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#08090d] px-5 py-8 text-white md:px-8 lg:px-10">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-[#7657ff]/30 bg-[#7657ff]/[0.065] p-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a593ff]">
              Viewing as Affiliate / Read Only
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <div className="text-xl font-semibold">
                {target.name ||
                  target.email}
              </div>

              <Status
                value={
                  target.status
                }
              />

              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/50">
                Tier {target.tier}
              </span>
            </div>

            <div className="mt-2 text-xs text-white/38">
              {target.email} / Manager:{" "}
              {managerName}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/${locale}/admin/users`}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-semibold text-white/75 transition hover:bg-white/[0.04]"
            >
              Exit preview
            </Link>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[230px_minmax(0,1fr)]">
          <aside>
            {visibleNav}
          </aside>

          <main className="min-w-0">
            {tab === "dashboard" ? (
              <div className="space-y-5">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8068ff]">
                    Workspace
                  </div>

                  <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em]">
                    Dashboard
                  </h1>

                  <p className="mt-2 text-sm text-white/42">
                    Affiliate-owned live performance and finance visibility.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Metric
                    label="Affiliate payout"
                    value={money(
                      allAffiliatePayout,
                    )}
                    emphasis
                  />

                  <Metric
                    label="FTD"
                    value={String(
                      allFtd,
                    )}
                  />

                  <Metric
                    label="Registrations"
                    value={String(
                      allRegs,
                    )}
                  />

                  <Metric
                    label="Clicks"
                    value={String(
                      allClicks,
                    )}
                  />

                  <Metric
                    label="Available"
                    value={money(
                      availableBalance,
                    )}
                  />

                  <Metric
                    label="Pending"
                    value={money(
                      pendingBalance,
                    )}
                  />

                  <Metric
                    label="Approved flows"
                    value={String(
                      approvedAccesses.length,
                    )}
                  />

                  <Metric
                    label="Manager"
                    value={
                      managerName
                    }
                  />
                </div>

                <div className={`${cardClass()} overflow-hidden`}>
                  <div className="border-b border-white/[0.07] px-5 py-4">
                    <div className="font-semibold">
                      Recent conversions
                    </div>

                    <div className="mt-1 text-xs text-white/30">
                      Affiliate payout only. Internal advertiser economics are intentionally absent.
                    </div>
                  </div>

                  {recentConversions.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] text-left text-xs">
                        <thead className="border-b border-white/[0.06] text-[9px] uppercase tracking-[0.12em] text-white/28">
                          <tr>
                            <th className="px-5 py-3">
                              Event
                            </th>
                            <th>Flow</th>
                            <th>Status</th>
                            <th>Payout</th>
                            <th>Date</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-white/[0.055]">
                          {recentConversions.map(
                            (conversion) => (
                              <tr
                                key={
                                  conversion.id
                                }
                                className="text-white/58"
                              >
                                <td className="px-5 py-4 font-semibold text-white/75">
                                  {
                                    conversion.type
                                  }
                                </td>

                                <td>
                                  {conversionFlowById.get(
                                    conversion.flowId,
                                  ) ||
                                    "Historical flow"}
                                </td>

                                <td>
                                  <Status
                                    value={
                                      conversion.status
                                    }
                                  />
                                </td>

                                <td>
                                  {money(
                                    conversion.affiliatePayout,
                                    conversion.currency,
                                  )}
                                </td>

                                <td>
                                  {dateTime(
                                    conversion.createdAt,
                                  )}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="px-5 py-12 text-center text-xs text-white/30">
                      No conversions yet.
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {tab === "offers" ? (
              <div className="space-y-5">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8068ff]">
                    Workspace
                  </div>

                  <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em]">
                    Offers
                  </h1>

                  <p className="mt-2 text-sm text-white/42">
                    Active visible flows filtered by this affiliate's Tier {target.tier}. Advertiser economics remain hidden.
                  </p>
                </div>

                {catalogVisible.length ? (
                  <div className="grid gap-4 2xl:grid-cols-2">
                    {catalogVisible.map(
                      (flow) => {
                        const access =
                          flow.accesses[0] ||
                          null;
                        const request =
                          flow.accessRequests[0] ||
                          null;
                        const terms =
                          flow.termsVersions[0] ||
                          null;

                        const accessStatus =
                          access?.status ===
                          "APPROVED"
                            ? "APPROVED"
                            : request?.status ===
                                  "PENDING" ||
                                access?.status ===
                                  "PENDING"
                              ? "PENDING"
                              : request?.status ===
                                    "REJECTED"
                                ? "REJECTED"
                                : access?.status ===
                                      "REVOKED"
                                  ? "REVOKED"
                                  : "AVAILABLE";

                        return (
                          <div
                            key={flow.id}
                            className={`${cardClass()} overflow-hidden`}
                          >
                            <div className="border-b border-white/[0.07] p-5">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="text-xl font-semibold">
                                      {
                                        flow
                                          .market
                                          .brand
                                          .name
                                      }
                                    </div>

                                    <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-semibold text-white/45">
                                      {
                                        flow
                                          .market
                                          .geo
                                      }
                                    </span>

                                    <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-semibold text-white/45">
                                      Tier{" "}
                                      {
                                        flow.tier
                                      }
                                    </span>
                                  </div>

                                  <div className="mt-2 text-sm text-white/70">
                                    {
                                      flow.name
                                    }
                                  </div>

                                  <div className="mt-1 text-xs text-white/32">
                                    {
                                      flow.trafficSource
                                    }
                                    {flow.approach
                                      ? ` / ${flow.approach}`
                                      : ""}
                                    {" / "}
                                    {
                                      flow
                                        .market
                                        .brand
                                        .vertical
                                    }
                                  </div>
                                </div>

                                <Status
                                  value={
                                    accessStatus
                                  }
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-px bg-white/[0.06] lg:grid-cols-4">
                              {[
                                [
                                  "Affiliate CPA",
                                  money(
                                    terms?.affiliateCpa,
                                    terms?.currency ||
                                      "USD",
                                  ),
                                ],
                                [
                                  "Cap FTD",
                                  terms?.capFtd ==
                                  null
                                    ? "-"
                                    : String(
                                        terms.capFtd,
                                      ),
                                ],
                                [
                                  "Min deposit",
                                  terms?.minDeposit ==
                                  null
                                    ? "-"
                                    : money(
                                        terms.minDeposit,
                                        terms.currency,
                                      ),
                                ],
                                [
                                  "Access",
                                  flow.accessMode.replaceAll(
                                    "_",
                                    " ",
                                  ),
                                ],
                              ].map(
                                ([
                                  label,
                                  value,
                                ]) => (
                                  <div
                                    key={
                                      label
                                    }
                                    className="bg-[#0b0d12] px-4 py-4"
                                  >
                                    <div className="text-[9px] uppercase tracking-[0.13em] text-white/27">
                                      {
                                        label
                                      }
                                    </div>

                                    <div className="mt-2 text-sm font-semibold text-white/72">
                                      {
                                        value
                                      }
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>

                            <div className="border-t border-white/[0.07] px-5 py-4 text-xs text-white/30">
                              Read-only preview / access actions disabled.
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                ) : (
                  <div className={`${cardClass()} px-6 py-16 text-center`}>
                    <div className="text-lg font-semibold">
                      No offers visible
                    </div>

                    <div className="mt-2 text-sm text-white/35">
                      No active flow currently passes this affiliate's tier, brand visibility and private-access rules.
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {tab === "my-offers" ? (
              <div className="space-y-5">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8068ff]">
                    Workspace
                  </div>

                  <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em]">
                    My Offers
                  </h1>

                  <p className="mt-2 text-sm text-white/42">
                    Approved flows with the affiliate's frozen/custom commercial terms.
                  </p>
                </div>

                {approvedAccesses.length ? (
                  <div className="grid gap-4 2xl:grid-cols-2">
                    {approvedAccesses.map(
                      (access) => {
                        const flow =
                          access.flow;
                        const terms =
                          access.termsVersion;
                        const token =
                          linksByFlow.get(
                            flow.id,
                          );

                        const affiliateCpa =
                          access.customAffiliateCpa ??
                          terms?.affiliateCpa ??
                          null;

                        const cap =
                          access.customCapFtd ??
                          terms?.capFtd ??
                          null;

                        return (
                          <div
                            key={access.id}
                            className={`${cardClass()} overflow-hidden`}
                          >
                            <div className="border-b border-white/[0.07] p-5">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <div className="text-lg font-semibold">
                                    {
                                      flow
                                        .market
                                        .brand
                                        .name
                                    }{" "}
                                    /{" "}
                                    {
                                      flow
                                        .market
                                        .geo
                                    }
                                  </div>

                                  <div className="mt-1 text-sm text-white/65">
                                    {
                                      flow.name
                                    }
                                  </div>

                                  <div className="mt-1 text-xs text-white/30">
                                    {
                                      flow.trafficSource
                                    }{" "}
                                    / Tier{" "}
                                    {
                                      flow.tier
                                    }
                                  </div>
                                </div>

                                <Status value="APPROVED" />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-px bg-white/[0.06] lg:grid-cols-4">
                              {[
                                [
                                  "Affiliate CPA",
                                  money(
                                    affiliateCpa,
                                    terms?.currency ||
                                      "USD",
                                  ),
                                ],
                                [
                                  "Cap FTD",
                                  cap == null
                                    ? "-"
                                    : String(
                                        cap,
                                      ),
                                ],
                                [
                                  "Terms",
                                  terms
                                    ? `v${terms.version}`
                                    : "-",
                                ],
                                [
                                  "Approved",
                                  access.approvedAt
                                    ? new Date(
                                        access.approvedAt,
                                      ).toLocaleDateString(
                                        "en-GB",
                                      )
                                    : "-",
                                ],
                              ].map(
                                ([
                                  label,
                                  value,
                                ]) => (
                                  <div
                                    key={
                                      label
                                    }
                                    className="bg-[#0b0d12] px-4 py-4"
                                  >
                                    <div className="text-[9px] uppercase tracking-[0.13em] text-white/27">
                                      {
                                        label
                                      }
                                    </div>

                                    <div className="mt-2 text-sm font-semibold text-white/72">
                                      {
                                        value
                                      }
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>

                            <div className="border-t border-white/[0.07] p-5">
                              <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/28">
                                Tracking
                              </div>

                              {token ? (
                                <div className="mt-2 rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2 font-mono text-xs text-white/52">
                                  /r/nexus/
                                  {token}
                                </div>
                              ) : (
                                <div className="mt-2 text-xs text-white/34">
                                  No affiliate tracking link has been generated yet.
                                </div>
                              )}

                              <div className="mt-3 text-[10px] text-white/25">
                                Preview cannot generate, copy or mutate tracking configuration.
                              </div>
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                ) : (
                  <div className={`${cardClass()} px-6 py-16 text-center`}>
                    <div className="text-lg font-semibold">
                      No approved offers yet
                    </div>

                    <div className="mt-2 text-sm text-white/35">
                      This is what the affiliate would see in My Offers right now.
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {tab === "statistics" ? (
              <div className="space-y-5">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8068ff]">
                    Workspace
                  </div>

                  <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em]">
                    Statistics
                  </h1>

                  <p className="mt-2 text-sm text-white/42">
                    Read-only 30-day snapshot from this affiliate's own NexusClick and NexusConversion records.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Metric
                    label="Clicks"
                    value={String(
                      statClicks,
                    )}
                  />

                  <Metric
                    label="Registrations"
                    value={String(
                      statRegs,
                    )}
                  />

                  <Metric
                    label="FTD"
                    value={String(
                      statFtd,
                    )}
                  />

                  <Metric
                    label="Affiliate payout"
                    value={money(
                      statAffiliatePayout,
                    )}
                    emphasis
                  />
                </div>

                <div className={`${cardClass()} p-5`}>
                  <div className="text-sm font-semibold">
                    REG to FTD
                  </div>

                  <div className="mt-3 text-4xl font-semibold tracking-[-0.04em]">
                    {statRegs > 0
                      ? `${(regToFtd * 100).toFixed(2)}%`
                      : "N/A"}
                  </div>

                  <div className="mt-2 text-xs text-white/30">
                    Last 30 days / approved conversions only
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "finance" ? (
              <div className="space-y-5">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8068ff]">
                    Workspace
                  </div>

                  <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em]">
                    Finance
                  </h1>

                  <p className="mt-2 text-sm text-white/42">
                    Same affiliate-owned ledger and payout visibility, with every mutation removed.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Metric
                    label="Available"
                    value={money(
                      availableBalance,
                    )}
                    emphasis
                  />

                  <Metric
                    label="Pending"
                    value={money(
                      pendingBalance,
                    )}
                  />

                  <Metric
                    label="Reserved"
                    value={money(
                      reservedBalance,
                    )}
                  />

                  <Metric
                    label="Paid"
                    value={money(
                      paidBalance,
                    )}
                  />
                </div>

                <div className="grid gap-5 xl:grid-cols-2">
                  <div className={`${cardClass()} overflow-hidden`}>
                    <div className="border-b border-white/[0.07] px-5 py-4">
                      <div className="font-semibold">
                        Payout wallets
                      </div>

                      <div className="mt-1 text-xs text-white/30">
                        Read only in preview.
                      </div>
                    </div>

                    {wallets.length ? (
                      <div className="divide-y divide-white/[0.055]">
                        {wallets.map(
                          (wallet) => (
                            <div
                              key={
                                wallet.id
                              }
                              className="px-5 py-4"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-sm font-semibold text-white/72">
                                  {
                                    wallet.label
                                  }
                                </div>

                                {wallet.isPrimary ? (
                                  <Status value="PRIMARY" />
                                ) : null}

                                {wallet.verified ? (
                                  <Status value="VERIFIED" />
                                ) : null}
                              </div>

                              <div className="mt-2 break-all font-mono text-[11px] text-white/32">
                                {
                                  wallet.address
                                }
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      <div className="px-5 py-10 text-center text-xs text-white/30">
                        No payout wallets.
                      </div>
                    )}
                  </div>

                  <div className={`${cardClass()} overflow-hidden`}>
                    <div className="border-b border-white/[0.07] px-5 py-4">
                      <div className="font-semibold">
                        Payout history
                      </div>

                      <div className="mt-1 text-xs text-white/30">
                        Total ledger balance:{" "}
                        {money(
                          totalEarned,
                        )}
                      </div>
                    </div>

                    {payouts.length ? (
                      <div className="divide-y divide-white/[0.055]">
                        {payouts.map(
                          (payout) => (
                            <div
                              key={
                                payout.id
                              }
                              className="flex items-start justify-between gap-4 px-5 py-4"
                            >
                              <div>
                                <div className="text-sm font-semibold text-white/72">
                                  {money(
                                    payout.amount,
                                    payout.currency,
                                  )}
                                </div>

                                <div className="mt-1 text-[11px] text-white/30">
                                  {
                                    payout.destinationLabel ||
                                    "Payout"
                                  }{" "}
                                  /{" "}
                                  {dateTime(
                                    payout.createdAt,
                                  )}
                                </div>

                                {payout.txHash ? (
                                  <div className="mt-1 max-w-[380px] truncate font-mono text-[10px] text-white/25">
                                    {
                                      payout.txHash
                                    }
                                  </div>
                                ) : null}
                              </div>

                              <Status
                                value={
                                  payout.status
                                }
                              />
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      <div className="px-5 py-10 text-center text-xs text-white/30">
                        No payout history.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "profile" ? (
              <div className="space-y-5">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8068ff]">
                    Workspace
                  </div>

                  <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em]">
                    Profile
                  </h1>

                  <p className="mt-2 text-sm text-white/42">
                    Affiliate-visible profile context. Password and security mutations are intentionally absent.
                  </p>
                </div>

                <div className={`${cardClass()} p-5`}>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <Detail
                      label="Name"
                      value={
                        target.name ||
                        "-"
                      }
                    />

                    <Detail
                      label="Email"
                      value={
                        target.email
                      }
                    />

                    <Detail
                      label="Telegram"
                      value={
                        target.telegram ||
                        "-"
                      }
                    />

                    <Detail
                      label="Tier"
                      value={`Tier ${target.tier}`}
                    />

                    <Detail
                      label="Assigned manager"
                      value={
                        managerName
                      }
                    />

                    <Detail
                      label="2FA"
                      value={
                        twoFactor?.enabled
                          ? "Enabled"
                          : "Disabled"
                      }
                    />
                  </div>
                </div>

                <div className={`${cardClass()} p-5`}>
                  <div className="mb-4 font-semibold">
                    Affiliate application
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <Detail
                      label="Company / Team"
                      value={
                        target.application
                          ?.company ||
                        "-"
                      }
                    />

                    <Detail
                      label="Traffic sources"
                      value={
                        target.application
                          ?.trafficSources
                          .join(", ") ||
                        "-"
                      }
                    />

                    <Detail
                      label="Main GEOs"
                      value={
                        target.application
                          ?.mainGeos.join(
                            ", ",
                          ) || "-"
                      }
                    />

                    <Detail
                      label="Verticals"
                      value={
                        target.application
                          ?.verticalInterests.join(
                            ", ",
                          ) || "-"
                      }
                    />

                    <Detail
                      label="Experience"
                      value={
                        target.application
                          ?.experience ||
                        "-"
                      }
                    />

                    <Detail
                      label="Expected volume"
                      value={
                        target.application
                          ?.estimatedMonthlyVolume ||
                        "-"
                      }
                    />
                  </div>

                  {target.application?.about ? (
                    <div className="mt-3">
                      <Detail
                        label="About traffic"
                        value={
                          target
                            .application
                            .about
                        }
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}