import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Severity =
  | "critical"
  | "action"
  | "warning"
  | "info";

type Category =
  | "Registration"
  | "Access"
  | "Payout"
  | "Cap"
  | "Integration"
  | "Terms"
  | "Conversion";

type NotificationItem = {
  id: string;
  severity: Severity;
  category: Category;
  title: string;
  description: string;
  detail?: string;
  createdAt: Date;
  href: string;
  action: string;
};

type SearchParams = Promise<{
  category?: string;
  severity?: string;
}>;

function money(
  value: number,
  currency = "USD",
) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function dateTime(value: Date) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(value);
}

function relativeTime(value: Date) {
  const delta =
    Date.now() - value.getTime();

  const minutes = Math.max(
    0,
    Math.floor(delta / 60000),
  );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(
    minutes / 60,
  );

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(
    hours / 24,
  );

  if (days < 30) {
    return `${days}d ago`;
  }

  return dateTime(value);
}

function severityWeight(
  severity: Severity,
) {
  if (severity === "critical") {
    return 4;
  }

  if (severity === "action") {
    return 3;
  }

  if (severity === "warning") {
    return 2;
  }

  return 1;
}

function severityClasses(
  severity: Severity,
) {
  if (severity === "critical") {
    return {
      badge:
        "border-rose-400/25 bg-rose-400/10 text-rose-300",
      dot: "bg-rose-400",
      card:
        "border-rose-400/15 bg-rose-400/[0.025]",
    };
  }

  if (severity === "action") {
    return {
      badge:
        "border-amber-400/25 bg-amber-400/10 text-amber-300",
      dot: "bg-amber-400",
      card:
        "border-amber-400/12 bg-amber-400/[0.018]",
    };
  }

  if (severity === "warning") {
    return {
      badge:
        "border-[#7657ff]/25 bg-[#7657ff]/10 text-[#a694ff]",
      dot: "bg-[#7657ff]",
      card:
        "border-[#7657ff]/14 bg-[#7657ff]/[0.018]",
    };
  }

  return {
    badge:
      "border-sky-400/20 bg-sky-400/10 text-sky-300",
    dot: "bg-sky-400",
    card:
      "border-white/[0.07] bg-white/[0.012]",
  };
}

export default async function NotificationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  const filters = await searchParams;
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

  const thirtyDaysAgo = new Date(
    Date.now() -
      30 * 24 * 60 * 60 * 1000,
  );

  const [
    pendingRegistrations,
    pendingAccessRequests,
    requestedPayouts,
    approvedAccesses,
    recentTerms,
    problemConversions,
    lastConversion,
  ] = await Promise.all([
    prisma.affiliateApplication.findMany({
      where: {
        status: "PENDING",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 40,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            telegram: true,
            tier: true,
            assignedManager: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),

    prisma.flowAccessRequest.findMany({
      where: {
        status: "PENDING",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 60,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            assignedManager: {
              select: {
                name: true,
              },
            },
          },
        },
        flow: {
          select: {
            id: true,
            name: true,
            trafficSource: true,
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

    prisma.nexusPayout.findMany({
      where: {
        status: "REQUESTED",
      },
      orderBy: {
        requestedAt: "desc",
      },
      take: 50,
      select: {
        id: true,
        userId: true,
        amount: true,
        currency: true,
        destinationLabel: true,
        requestedAt: true,
      },
    }),

    prisma.flowAccess.findMany({
      where: {
        status: "APPROVED",
        user: {
          role: "USER",
          status: "APPROVED",
        },
      },
      select: {
        id: true,
        userId: true,
        flowId: true,
        termsVersionId: true,
        customCapFtd: true,
        updatedAt: true,
        user: {
          select: {
            name: true,
            email: true,
            assignedManager: {
              select: {
                name: true,
              },
            },
          },
        },
        flow: {
          select: {
            name: true,
            trafficSource: true,
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
        termsVersion: {
          select: {
            capFtd: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),

    prisma.flowTermsVersion.findMany({
      where: {
        version: {
          gt: 1,
        },
        effectiveFrom: {
          gte: thirtyDaysAgo,
        },
      },
      orderBy: {
        effectiveFrom: "desc",
      },
      take: 40,
      select: {
        id: true,
        flowId: true,
        version: true,
        advertiserCpa: true,
        affiliateCpa: true,
        currency: true,
        capFtd: true,
        effectiveFrom: true,
        flow: {
          select: {
            name: true,
            trafficSource: true,
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

    prisma.nexusConversion.findMany({
      where: {
        status: {
          in: [
            "REJECTED",
            "REVERSED",
          ],
        },
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
      select: {
        id: true,
        userId: true,
        flowId: true,
        type: true,
        status: true,
        affiliatePayout: true,
        advertiserAmount: true,
        currency: true,
        createdAt: true,
      },
    }),

    prisma.nexusConversion.findFirst({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        createdAt: true,
      },
    }),
  ]);

  const payoutUserIds = Array.from(
    new Set(
      requestedPayouts.map(
        (payout) => payout.userId,
      ),
    ),
  );

  const problemUserIds = Array.from(
    new Set(
      problemConversions.map(
        (conversion) =>
          conversion.userId,
      ),
    ),
  );

  const problemFlowIds = Array.from(
    new Set(
      problemConversions.map(
        (conversion) =>
          conversion.flowId,
      ),
    ),
  );

  const [
    payoutUsers,
    problemUsers,
    problemFlows,
  ] = await Promise.all([
    payoutUserIds.length
      ? prisma.user.findMany({
          where: {
            id: {
              in: payoutUserIds,
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
            assignedManager: {
              select: {
                name: true,
              },
            },
          },
        })
      : [],

    problemUserIds.length
      ? prisma.user.findMany({
          where: {
            id: {
              in: problemUserIds,
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        })
      : [],

    problemFlowIds.length
      ? prisma.flow.findMany({
          where: {
            id: {
              in: problemFlowIds,
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
      : [],
  ]);

  const payoutUserById = new Map(
    payoutUsers.map((user) => [
      user.id,
      user,
    ]),
  );

  const problemUserById = new Map(
    problemUsers.map((user) => [
      user.id,
      user,
    ]),
  );

  const problemFlowById = new Map(
    problemFlows.map((flow) => [
      flow.id,
      flow,
    ]),
  );

  const capAccesses = approvedAccesses
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
        Number(access.effectiveCap) > 0,
    );

  const capUserIds = Array.from(
    new Set(
      capAccesses.map(
        (access) => access.userId,
      ),
    ),
  );

  const capFlowIds = Array.from(
    new Set(
      capAccesses.map(
        (access) => access.flowId,
      ),
    ),
  );

  const capConversions =
    capUserIds.length &&
    capFlowIds.length
      ? await prisma.nexusConversion.findMany({
          where: {
            userId: {
              in: capUserIds,
            },
            flowId: {
              in: capFlowIds,
            },
            type: "DEP",
            status: "APPROVED",
          },
          select: {
            userId: true,
            flowId: true,
            termsVersionId: true,
          },
          take: 50000,
        })
      : [];

  const ftdByAccess = new Map<
    string,
    number
  >();

  for (const conversion of capConversions) {
    const key = [
      conversion.userId,
      conversion.flowId,
      conversion.termsVersionId || "",
    ].join("|");

    ftdByAccess.set(
      key,
      (ftdByAccess.get(key) || 0) + 1,
    );
  }

  const capRows = capAccesses
    .map((access) => {
      const key = [
        access.userId,
        access.flowId,
        access.termsVersionId || "",
      ].join("|");

      const ftd =
        ftdByAccess.get(key) || 0;

      const cap = Number(
        access.effectiveCap || 0,
      );

      const progress =
        cap > 0 ? ftd / cap : 0;

      return {
        id: access.id,
        affiliate:
          access.user.name ||
          access.user.email,
        brand:
          access.flow.market.brand
            .name,
        geo:
          access.flow.market.geo,
        flow:
          access.flow.name,
        source:
          access.flow.trafficSource,
        manager:
          access.user
            .assignedManager?.name ||
          "Unassigned",
        ftd,
        cap,
        progress,
        updatedAt:
          access.updatedAt,
      };
    })
    .filter(
      (row) => row.progress >= 0.8,
    )
    .sort(
      (a, b) =>
        b.progress - a.progress ||
        b.ftd - a.ftd,
    );

  const postbackConfigured = Boolean(
    process.env.NEXUS_POSTBACK_SECRET ||
      process.env.POSTBACK_SHARED_SECRET ||
      process.env.SERVER_SECRET,
  );

  const notifications: NotificationItem[] =
    [];

  for (const application of pendingRegistrations) {
    const affiliate =
      application.user.name ||
      application.user.email;

    notifications.push({
      id: `registration:${application.id}`,
      severity: "action",
      category: "Registration",
      title: "Affiliate application waiting for review",
      description: `${affiliate} submitted a new affiliate application.`,
      detail: [
        `Tier ${application.user.tier}`,
        application.user.telegram ||
          "No Telegram",
        application.user
          .assignedManager?.name ||
          "Unassigned",
      ].join(" / "),
      createdAt:
        application.createdAt,
      href: `/${locale}/admin/registrations`,
      action: "Review registration",
    });
  }

  for (const request of pendingAccessRequests) {
    const affiliate =
      request.user.name ||
      request.user.email;

    notifications.push({
      id: `access:${request.id}`,
      severity: "action",
      category: "Access",
      title: "Flow access request waiting for decision",
      description: `${affiliate} requested ${request.flow.market.brand.name} / ${request.flow.name}.`,
      detail: [
        request.flow.market.geo,
        request.flow.trafficSource,
        request.user
          .assignedManager?.name ||
          "Unassigned",
      ].join(" / "),
      createdAt: request.createdAt,
      href: `/${locale}/admin/requests`,
      action: "Review access",
    });
  }

  for (const payout of requestedPayouts) {
    const user = payoutUserById.get(
      payout.userId,
    );

    notifications.push({
      id: `payout:${payout.id}`,
      severity: "action",
      category: "Payout",
      title: "Payout request needs review",
      description: `${user?.name || user?.email || "Affiliate"} requested ${money(
        Number(payout.amount),
        payout.currency,
      )}.`,
      detail: [
        payout.destinationLabel ||
          "Destination",
        user?.assignedManager?.name ||
          "Unassigned",
      ].join(" / "),
      createdAt: payout.requestedAt,
      href: `/${locale}/admin/payouts`,
      action: "Review payout",
    });
  }

  for (const row of capRows) {
    const percent = Math.round(
      row.progress * 100,
    );

    const reached =
      row.progress >= 1;

    notifications.push({
      id: `cap:${row.id}`,
      severity: reached
        ? "critical"
        : "warning",
      category: "Cap",
      title: reached
        ? "Flow cap reached"
        : "Flow is near cap",
      description: `${row.affiliate} / ${row.brand} ${row.geo} / ${row.flow} is at ${row.ftd} of ${row.cap} FTD.`,
      detail: `${percent}% / ${row.source} / Manager: ${row.manager}`,
      createdAt: row.updatedAt,
      href: `/${locale}/admin/control-center`,
      action: "Open cap monitor",
    });
  }

  if (!postbackConfigured) {
    notifications.push({
      id: "integration:postback-secret",
      severity: "critical",
      category: "Integration",
      title: "Canonical postback is not configured",
      description:
        "NEXUS cannot verify a postback secret in the current environment.",
      detail:
        "NEXUS_POSTBACK_SECRET / POSTBACK_SHARED_SECRET / SERVER_SECRET",
      createdAt: new Date(),
      href: `/${locale}/postbacks`,
      action: "Open integrations",
    });
  }
  else if (!lastConversion) {
    notifications.push({
      id: "integration:no-conversions",
      severity: "warning",
      category: "Integration",
      title: "No conversion has been observed yet",
      description:
        "The canonical postback is configured, but NEXUS has no recorded conversion activity.",
      detail:
        "Configuration is present. This is an activity notice, not a failed-health claim.",
      createdAt: new Date(),
      href: `/${locale}/postbacks`,
      action: "Open integrations",
    });
  }

  const latestTermsByFlow = new Map<
    string,
    (typeof recentTerms)[number]
  >();

  for (const terms of recentTerms) {
    if (
      !latestTermsByFlow.has(
        terms.flowId,
      )
    ) {
      latestTermsByFlow.set(
        terms.flowId,
        terms,
      );
    }
  }

  const latestTerms = Array.from(
    latestTermsByFlow.values(),
  );

  for (const terms of latestTerms) {
    notifications.push({
      id: `terms:${terms.id}`,
      severity: "info",
      category: "Terms",
      title: "Flow terms version changed",
      description: `${terms.flow.market.brand.name} ${terms.flow.market.geo} / ${terms.flow.name} now has terms v${terms.version}.`,
      detail: [
        terms.affiliateCpa != null
          ? `Affiliate CPA ${money(
              Number(
                terms.affiliateCpa,
              ),
              terms.currency,
            )}`
          : "Affiliate CPA not set",
        terms.capFtd != null
          ? `Cap ${terms.capFtd} FTD`
          : "No cap",
        terms.flow.trafficSource,
      ].join(" / "),
      createdAt:
        terms.effectiveFrom,
      href: `/${locale}/admin/offers`,
      action: "Review flow terms",
    });
  }

  for (const conversion of problemConversions) {
    const user =
      problemUserById.get(
        conversion.userId,
      );

    const flow =
      problemFlowById.get(
        conversion.flowId,
      );

    notifications.push({
      id: `conversion:${conversion.id}`,
      severity:
        conversion.status ===
        "REVERSED"
          ? "critical"
          : "warning",
      category: "Conversion",
      title:
        conversion.status ===
        "REVERSED"
          ? "Conversion reversed"
          : "Conversion rejected",
      description: `${user?.name || user?.email || "Affiliate"} / ${flow?.market.brand.name || "Brand"} / ${flow?.name || "Flow"} / ${conversion.type}.`,
      detail: [
        `Status ${conversion.status}`,
        `Affiliate payout ${money(
          Number(
            conversion.affiliatePayout,
          ),
          conversion.currency,
        )}`,
      ].join(" / "),
      createdAt:
        conversion.createdAt,
      href: `/${locale}/conversions`,
      action: "Review conversion",
    });
  }

  notifications.sort((a, b) => {
    const severityDelta =
      severityWeight(b.severity) -
      severityWeight(a.severity);

    if (severityDelta !== 0) {
      return severityDelta;
    }

    return (
      b.createdAt.getTime() -
      a.createdAt.getTime()
    );
  });

  const categoryFilter =
    String(
      filters.category || "ALL",
    );

  const severityFilter =
    String(
      filters.severity || "ALL",
    );

  const visible =
    notifications.filter((item) => {
      if (
        categoryFilter !== "ALL" &&
        item.category !==
          categoryFilter
      ) {
        return false;
      }

      if (
        severityFilter !== "ALL" &&
        item.severity !==
          severityFilter
      ) {
        return false;
      }

      return true;
    });

  const criticalCount =
    notifications.filter(
      (item) =>
        item.severity === "critical",
    ).length;

  const actionCount =
    notifications.filter(
      (item) =>
        item.severity === "action",
    ).length;

  const capCount =
    notifications.filter(
      (item) =>
        item.category === "Cap",
    ).length;

  const categories = Array.from(
    new Set(
      notifications.map(
        (item) => item.category,
      ),
    ),
  ).sort();

  return (
    <div className="min-h-screen bg-[#08090d] px-5 py-8 text-white md:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-[1600px]">
        <header className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8068ff]">
              Internal operations
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-semibold tracking-[-0.04em]">
                Notifications
              </h1>

              <span className="rounded-full border border-[#7657ff]/25 bg-[#7657ff]/10 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#a694ff]">
                OWNER / ADMIN
              </span>
            </div>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/42">
              Live operational notices derived
              from registrations, access,
              payouts, caps, integrations,
              terms and conversion state.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/${locale}/admin/control-center`}
              className="rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 py-2.5 text-xs font-semibold text-white/55 transition hover:bg-white/[0.05] hover:text-white"
            >
              Control Center
            </Link>

            <Link
              href={`/${locale}/admin/audit-log`}
              className="rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 py-2.5 text-xs font-semibold text-white/55 transition hover:bg-white/[0.05] hover:text-white"
            >
              Audit Log
            </Link>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Live notices"
            value={notifications.length}
            accent
          />

          <Metric
            label="Critical"
            value={criticalCount}
            tone={
              criticalCount
                ? "danger"
                : "good"
            }
          />

          <Metric
            label="Needs action"
            value={actionCount}
            tone={
              actionCount
                ? "warning"
                : "good"
            }
          />

          <Metric
            label="Cap warnings"
            value={capCount}
            tone={
              capCount
                ? "warning"
                : "good"
            }
          />
        </section>

        <section className="mt-5 rounded-2xl border border-white/[0.08] bg-[#0d0f14]">
          <form
            method="get"
            className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_auto]"
          >
            <select
              name="category"
              defaultValue={
                categoryFilter
              }
              className="h-11 rounded-xl border border-white/[0.08] bg-[#0b0c11] px-3 text-xs text-white/65 outline-none"
            >
              <option value="ALL">
                All categories
              </option>

              {categories.map(
                (category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                ),
              )}
            </select>

            <select
              name="severity"
              defaultValue={
                severityFilter
              }
              className="h-11 rounded-xl border border-white/[0.08] bg-[#0b0c11] px-3 text-xs text-white/65 outline-none"
            >
              <option value="ALL">
                All priorities
              </option>
              <option value="critical">
                Critical
              </option>
              <option value="action">
                Needs action
              </option>
              <option value="warning">
                Warning
              </option>
              <option value="info">
                Information
              </option>
            </select>

            <div className="flex gap-2">
              <button className="h-11 rounded-xl bg-[#7657ff] px-5 text-xs font-semibold text-white transition hover:bg-[#846cff]">
                Apply
              </button>

              <Link
                href={`/${locale}/admin/notifications`}
                className="grid h-11 place-items-center rounded-xl border border-white/[0.08] px-4 text-xs font-semibold text-white/40 transition hover:bg-white/[0.04] hover:text-white"
              >
                Clear
              </Link>
            </div>
          </form>
        </section>

        <section className="mt-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14]">
          <div className="flex flex-col gap-2 border-b border-white/[0.07] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold">
                Live notification stream
              </div>

              <div className="mt-1 text-xs text-white/32">
                Actionable items first, then
                recent operational updates.
              </div>
            </div>


          </div>

          {visible.length ? (
            <div className="divide-y divide-white/[0.055]">
              {visible.map((item) => {
                const classes =
                  severityClasses(
                    item.severity,
                  );

                return (
                  <article
                    key={item.id}
                    className={`grid gap-4 border-l-2 px-5 py-4 lg:grid-cols-[160px_1fr_auto] ${classes.card}`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${classes.dot}`}
                        />

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold ${classes.badge}`}
                        >
                          {item.severity ===
                          "critical"
                            ? "Critical"
                            : item.severity ===
                                "action"
                              ? "Needs action"
                              : item.severity ===
                                  "warning"
                                ? "Warning"
                                : "Info"}
                        </span>
                      </div>

                      <div className="mt-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-white/26">
                        {item.category}
                      </div>

                      <div
                        className="mt-1 text-[10px] text-white/25"
                        title={dateTime(
                          item.createdAt,
                        )}
                      >
                        {relativeTime(
                          item.createdAt,
                        )}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-white/84">
                        {item.title}
                      </h2>

                      <p className="mt-1.5 text-xs leading-5 text-white/43">
                        {item.description}
                      </p>

                      {item.detail ? (
                        <div className="mt-2 text-[10px] leading-5 text-white/25">
                          {item.detail}
                        </div>
                      ) : null}
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
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-20 text-center">
              <div className="text-sm font-semibold text-white/65">
                No matching notifications
              </div>

              <div className="mt-2 text-xs text-white/28">
                There are no live notices for
                the selected filters.
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
  tone?:
    | "neutral"
    | "good"
    | "warning"
    | "danger";
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
        {value.toLocaleString(
          "en-US",
        )}
      </div>

      <div className="mt-2 text-[10px] text-white/22">
        Live NEXUS data
      </div>
    </div>
  );
}