import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  event?: string;
  actor?: string;
  range?: string;
  from?: string;
  to?: string;
}>;

type JsonRecord = Record<string, unknown>;

const REDACTED_KEYS =
  /secret|password|passwd|hash|token|recovery|otp|totp|code|authorization|cookie|credential/i;

function dateTime(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(value);
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function isRecord(
  value: unknown,
): value is JsonRecord {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value),
  );
}

function sanitizeMetadata(
  value: unknown,
  depth = 0,
): unknown {
  if (depth > 5) {
    return "[nested data]";
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 30)
      .map((item) =>
        sanitizeMetadata(
          item,
          depth + 1,
        ),
      );
  }

  if (isRecord(value)) {
    const out: JsonRecord = {};

    for (const [key, item] of Object.entries(
      value,
    )) {
      if (REDACTED_KEYS.test(key)) {
        out[key] = "[REDACTED]";
        continue;
      }

      out[key] = sanitizeMetadata(
        item,
        depth + 1,
      );
    }

    return out;
  }

  if (typeof value === "string") {
    return value.length > 800
      ? `${value.slice(0, 800)}вЂ¦`
      : value;
  }

  return value;
}

function prettyEvent(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function eventCategory(
  value: string,
) {
  const upper = value.toUpperCase();

  if (
    upper.includes("PARTNER") ||
    upper.includes("OFFER") ||
    upper.includes("FLOW")
  ) {
    return "Commercial";
  }

  if (
    upper.includes("PAYOUT") ||
    upper.includes("FINANCE") ||
    upper.includes("BALANCE") ||
    upper.includes("WALLET")
  ) {
    return "Finance";
  }

  if (
    upper.includes("ROLE") ||
    upper.includes("TEAM") ||
    upper.includes("MANAGER") ||
    upper.includes("AFFILIATE") ||
    upper.includes("USER")
  ) {
    return "Access";
  }

  if (
    upper.includes("2FA") ||
    upper.includes("STEP") ||
    upper.includes("LOGIN") ||
    upper.includes("PASSWORD") ||
    upper.includes("OWNER") ||
    upper.includes("SECURITY") ||
    upper.includes("RECOVERY")
  ) {
    return "Security";
  }

  return "System";
}

function categoryClasses(
  category: string,
) {
  if (category === "Commercial") {
    return "border-[#7657ff]/25 bg-[#7657ff]/10 text-[#9a87ff]";
  }

  if (category === "Finance") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }

  if (category === "Access") {
    return "border-sky-400/20 bg-sky-400/10 text-sky-300";
  }

  if (category === "Security") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  }

  return "border-white/10 bg-white/[0.035] text-white/42";
}

function extractTargetUserId(
  metadata: unknown,
) {
  if (!isRecord(metadata)) {
    return null;
  }

  const direct = [
    metadata.targetUserId,
    metadata.targetId,
    metadata.affiliateId,
  ].find(
    (value) =>
      typeof value === "string" &&
      value.length > 0,
  );

  return typeof direct === "string"
    ? direct
    : null;
}

function extractObjectLabel(
  metadata: unknown,
) {
  if (!isRecord(metadata)) {
    return null;
  }

  const candidates = [
    metadata.partnerName,
    metadata.name,
    metadata.brandName,
    metadata.flowName,
    metadata.offerName,
    metadata.payoutId,
    metadata.partnerId,
    metadata.flowId,
    metadata.offerId,
  ];

  const value = candidates.find(
    (item) =>
      typeof item === "string" &&
      item.trim().length > 0,
  );

  return typeof value === "string"
    ? value
    : null;
}

function parseDate(
  value: string | undefined,
  endOfDay = false,
) {
  if (
    !value ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return null;
  }

  const parsed = new Date(
    `${value}T${
      endOfDay
        ? "23:59:59.999"
        : "00:00:00.000"
    }Z`,
  );

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
}

export default async function AuditLogPage({
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

  const q = String(
    filters.q || "",
  )
    .trim()
    .toLowerCase();

  const eventFilter = String(
    filters.event || "ALL",
  );

  const actorFilter = String(
    filters.actor || "ALL",
  );

  const range = String(
    filters.range || "30D",
  ).toUpperCase();

  const now = new Date();
  let fromDate: Date | null = null;
  let toDate: Date | null = null;

  if (range === "7D") {
    fromDate = new Date(now);
    fromDate.setUTCDate(
      fromDate.getUTCDate() - 6,
    );
    fromDate.setUTCHours(0, 0, 0, 0);
  }
  else if (range === "30D") {
    fromDate = new Date(now);
    fromDate.setUTCDate(
      fromDate.getUTCDate() - 29,
    );
    fromDate.setUTCHours(0, 0, 0, 0);
  }
  else if (range === "90D") {
    fromDate = new Date(now);
    fromDate.setUTCDate(
      fromDate.getUTCDate() - 89,
    );
    fromDate.setUTCHours(0, 0, 0, 0);
  }
  else if (range === "CUSTOM") {
    fromDate = parseDate(filters.from);
    toDate = parseDate(
      filters.to,
      true,
    );
  }

  const whereDate =
    fromDate || toDate
      ? {
          createdAt: {
            ...(fromDate
              ? { gte: fromDate }
              : {}),
            ...(toDate
              ? { lte: toDate }
              : {}),
          },
        }
      : {};

  const events =
    await prisma.nexusSecurityEvent.findMany({
      where: {
        ...whereDate,
        ...(eventFilter !== "ALL"
          ? {
              eventType: eventFilter,
            }
          : {}),
        ...(actorFilter !== "ALL"
          ? {
              userId: actorFilter,
            }
          : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 1000,
    });

  const allEventTypes =
    await prisma.nexusSecurityEvent.findMany({
      distinct: ["eventType"],
      select: {
        eventType: true,
      },
      orderBy: {
        eventType: "asc",
      },
    });

  const allActorIds = Array.from(
    new Set(
      events
        .map((event) => event.userId)
        .filter(
          (
            value,
          ): value is string =>
            Boolean(value),
        ),
    ),
  );

  const targetIds = Array.from(
    new Set(
      events
        .map((event) =>
          extractTargetUserId(
            event.metadata,
          ),
        )
        .filter(
          (
            value,
          ): value is string =>
            Boolean(value),
        ),
    ),
  );

  const lookupUserIds = Array.from(
    new Set([
      ...allActorIds,
      ...targetIds,
    ]),
  );

  const lookupUsers = lookupUserIds.length
    ? await prisma.user.findMany({
        where: {
          id: {
            in: lookupUserIds,
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      })
    : [];

  const userById = new Map(
    lookupUsers.map((user) => [
      user.id,
      user,
    ]),
  );

  const actorIdRows =
    await prisma.nexusSecurityEvent.findMany({
      where: {
        userId: {
          not: null,
        },
      },
      distinct: ["userId"],
      select: {
        userId: true,
      },
    });

  const actorIds = actorIdRows
    .map((row) => row.userId)
    .filter(
      (
        value,
      ): value is string =>
        Boolean(value),
    );

  const actorOptions = actorIds.length
    ? await prisma.user.findMany({
        where: {
          id: {
            in: actorIds,
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        orderBy: [
          { role: "asc" },
          { name: "asc" },
        ],
      })
    : [];

  const filteredEvents = events.filter(
    (event) => {
      if (!q) return true;

      const actor = event.userId
        ? userById.get(event.userId)
        : null;

      const targetId =
        extractTargetUserId(
          event.metadata,
        );

      const target = targetId
        ? userById.get(targetId)
        : null;

      const safeMetadata =
        sanitizeMetadata(
          event.metadata,
        );

      const haystack = [
        event.eventType,
        prettyEvent(event.eventType),
        actor?.name || "",
        actor?.email || "",
        target?.name || "",
        target?.email || "",
        extractObjectLabel(
          event.metadata,
        ) || "",
        JSON.stringify(
          safeMetadata,
        ),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    },
  );

  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);

  const todayCount = events.filter(
    (event) =>
      event.createdAt >= todayStart,
  ).length;

  const securityCount =
    filteredEvents.filter(
      (event) =>
        eventCategory(
          event.eventType,
        ) === "Security",
    ).length;

  const partnerCount =
    filteredEvents.filter(
      (event) =>
        event.eventType
          .toUpperCase()
          .includes("PARTNER"),
    ).length;

  const uniqueActors = new Set(
    filteredEvents
      .map((event) => event.userId)
      .filter(Boolean),
  ).size;

  const filterBase = {
    q: filters.q || "",
    event: eventFilter,
    actor: actorFilter,
    from: filters.from || "",
    to: filters.to || "",
  };

  function rangeHref(
    nextRange: string,
  ) {
    const query = new URLSearchParams();

    if (filterBase.q) {
      query.set("q", filterBase.q);
    }

    if (
      filterBase.event &&
      filterBase.event !== "ALL"
    ) {
      query.set(
        "event",
        filterBase.event,
      );
    }

    if (
      filterBase.actor &&
      filterBase.actor !== "ALL"
    ) {
      query.set(
        "actor",
        filterBase.actor,
      );
    }

    query.set("range", nextRange);

    return `/${locale}/admin/audit-log?${query.toString()}`;
  }

  return (
    <div className="min-h-screen bg-[#08090d] px-5 py-8 text-white md:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-[1650px]">
        <header className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8068ff]">
              Internal governance
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-semibold tracking-[-0.04em]">
                Audit Log
              </h1>

              <span className="rounded-full border border-[#7657ff]/25 bg-[#7657ff]/10 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9a87ff]">
                OWNER / ADMIN  /  Read only
              </span>
            </div>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/42">
              Security and administrative events
              recorded by NEXUS, with sensitive
              metadata automatically redacted.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/${locale}/admin/control-center`}
              className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-2.5 text-xs font-semibold text-white/55 transition hover:bg-white/[0.05] hover:text-white"
            >
              Control Center
            </Link>

            <Link
              href={`/${locale}/admin/team`}
              className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-2.5 text-xs font-semibold text-white/55 transition hover:bg-white/[0.05] hover:text-white"
            >
              Team & Roles
            </Link>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric
            label="Events in view"
            value={filteredEvents.length}
            accent
          />
          <Metric
            label="Today"
            value={todayCount}
          />
          <Metric
            label="Security"
            value={securityCount}
            warning
          />
          <Metric
            label="Partner events"
            value={partnerCount}
          />
          <Metric
            label="Unique actors"
            value={uniqueActors}
          />
        </section>

        <section className="mt-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14]">
          <form
            method="get"
            className="grid gap-3 p-4 xl:grid-cols-[1fr_230px_230px_auto]"
          >
            <input
              name="q"
              defaultValue={filters.q || ""}
              placeholder="Search event, actor, target, partner, metadata..."
              className="h-11 rounded-xl border border-white/[0.08] bg-black/20 px-4 text-xs text-white outline-none placeholder:text-white/23 focus:border-[#7657ff]/45"
            />

            <select
              name="event"
              defaultValue={eventFilter}
              className="h-11 rounded-xl border border-white/[0.08] bg-[#0b0c11] px-3 text-xs text-white/65 outline-none"
            >
              <option value="ALL">
                All events
              </option>

              {allEventTypes.map((row) => (
                <option
                  key={row.eventType}
                  value={row.eventType}
                >
                  {prettyEvent(
                    row.eventType,
                  )}
                </option>
              ))}
            </select>

            <select
              name="actor"
              defaultValue={actorFilter}
              className="h-11 rounded-xl border border-white/[0.08] bg-[#0b0c11] px-3 text-xs text-white/65 outline-none"
            >
              <option value="ALL">
                All actors
              </option>

              {actorOptions.map((user) => (
                <option
                  key={user.id}
                  value={user.id}
                >
                  {user.name ||
                    user.email}{" "}
                   /  {user.role}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <input
                type="hidden"
                name="range"
                value={range}
              />

              {range === "CUSTOM" ? (
                <>
                  <input
                    type="hidden"
                    name="from"
                    value={
                      filters.from || ""
                    }
                  />
                  <input
                    type="hidden"
                    name="to"
                    value={
                      filters.to || ""
                    }
                  />
                </>
              ) : null}

              <button className="h-11 rounded-xl bg-[#7657ff] px-5 text-xs font-semibold text-white transition hover:bg-[#846cff]">
                Apply
              </button>

              <Link
                href={`/${locale}/admin/audit-log`}
                className="grid h-11 place-items-center rounded-xl border border-white/[0.08] px-4 text-xs font-semibold text-white/40 transition hover:bg-white/[0.04] hover:text-white"
              >
                Clear
              </Link>
            </div>
          </form>

          <div className="flex flex-col gap-3 border-t border-white/[0.07] p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {["7D", "30D", "90D"].map(
                (item) => (
                  <Link
                    key={item}
                    href={rangeHref(item)}
                    className={`rounded-lg border px-3 py-2 text-[10px] font-semibold transition ${
                      range === item
                        ? "border-white/10 bg-white/[0.08] text-white"
                        : "border-white/[0.06] text-white/35 hover:text-white/65"
                    }`}
                  >
                    {item}
                  </Link>
                ),
              )}

              <span
                className={`rounded-lg border px-3 py-2 text-[10px] font-semibold ${
                  range === "CUSTOM"
                    ? "border-[#7657ff]/30 bg-[#7657ff]/10 text-[#9a87ff]"
                    : "border-white/[0.06] text-white/30"
                }`}
              >
                Custom
              </span>
            </div>

            <form
              method="get"
              className="flex flex-wrap items-center gap-2"
            >
              <input
                type="hidden"
                name="range"
                value="CUSTOM"
              />

              {filters.q ? (
                <input
                  type="hidden"
                  name="q"
                  value={filters.q}
                />
              ) : null}

              {eventFilter !== "ALL" ? (
                <input
                  type="hidden"
                  name="event"
                  value={eventFilter}
                />
              ) : null}

              {actorFilter !== "ALL" ? (
                <input
                  type="hidden"
                  name="actor"
                  value={actorFilter}
                />
              ) : null}

              <input
                name="from"
                type="date"
                defaultValue={
                  filters.from ||
                  dateOnly(
                    new Date(
                      Date.now() -
                        29 *
                          24 *
                          60 *
                          60 *
                          1000,
                    ),
                  )
                }
                className="h-9 rounded-lg border border-white/[0.08] bg-black/20 px-3 text-[10px] text-white/55 outline-none"
              />

              <span className="text-[10px] text-white/25">
                to
              </span>

              <input
                name="to"
                type="date"
                defaultValue={
                  filters.to ||
                  dateOnly(now)
                }
                className="h-9 rounded-lg border border-white/[0.08] bg-black/20 px-3 text-[10px] text-white/55 outline-none"
              />

              <button className="h-9 rounded-lg border border-white/[0.08] px-3 text-[10px] font-semibold text-white/45 transition hover:bg-white/[0.04] hover:text-white">
                Custom range
              </button>
            </form>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14]">
          <div className="flex flex-col gap-2 border-b border-white/[0.07] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold">
                Event stream
              </div>

              <div className="mt-1 text-xs text-white/32">
                Latest matching events  /  up to
                1,000 records per view.
              </div>
            </div>

            <div className="text-[10px] text-white/25">
              Metadata keys containing secrets,
              tokens, passwords, recovery codes or
              credentials are redacted.
            </div>
          </div>

          {filteredEvents.length ? (
            <div className="divide-y divide-white/[0.055]">
              {filteredEvents.map(
                (event) => {
                  const actor = event.userId
                    ? userById.get(
                        event.userId,
                      )
                    : null;

                  const targetId =
                    event.eventType ===
                    "STEP_UP_GRANTED"
                      ? null
                      : extractTargetUserId(
                          event.metadata,
                        );

                  const target = targetId
                    ? userById.get(targetId)
                    : null;

                  const category =
                    eventCategory(
                      event.eventType,
                    );

                  const objectLabel =
                    event.eventType ===
                    "STEP_UP_GRANTED"
                      ? null
                      : extractObjectLabel(
                          event.metadata,
                        );

                  const safeMetadata =
                    sanitizeMetadata(
                      event.metadata,
                    );

                  return (
                    <article
                      key={event.id}
                      className="grid gap-4 px-5 py-4 xl:grid-cols-[160px_1fr]"
                    >
                      <div>
                        <div className="text-xs font-medium text-white/62">
                          {dateTime(
                            event.createdAt,
                          )}
                        </div>

                        <div className="mt-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold ${categoryClasses(
                              category,
                            )}`}
                          >
                            {category}
                          </span>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-sm font-semibold text-white/86">
                            {prettyEvent(
                              event.eventType,
                            )}
                          </h2>

                          <span className="font-mono text-[9px] text-white/18">
                            {
                              event.eventType
                            }
                          </span>
                        </div>

                        <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                          <Identity
                            label="Actor"
                            primary={
                              actor?.name ||
                              actor?.email ||
                              (event.userId
                                ? "Unknown user"
                                : "System")
                            }
                            secondary={
                              actor
                                ? `${actor.email}  /  ${actor.role}`
                                : event.userId ||
                                  "Automated / system event"
                            }
                          />

                          <Identity
                            label="Target"
                            primary={
                              target?.name ||
                              target?.email ||
                              objectLabel || "No explicit target"
                            }
                            secondary={
                              target
                                ? `${target.email}  /  ${target.role}`
                                : targetId ||
                                  objectLabel || "No explicit target"
                            }
                          />

                          <Identity
                            label="Event ID"
                            primary={
                              event.id
                            }
                            mono
                          />
                        </div>

                        {event.metadata ? (
                          <details className="mt-3 rounded-xl border border-white/[0.06] bg-black/15">
                            <summary className="cursor-pointer px-4 py-2.5 text-[10px] font-semibold text-white/38 transition hover:text-white/65">
                              View safe metadata
                            </summary>

                            <pre className="max-h-[320px] overflow-auto border-t border-white/[0.06] px-4 py-3 text-[10px] leading-5 text-white/42">
                              {JSON.stringify(
                                safeMetadata,
                                null,
                                2,
                              )}
                            </pre>
                          </details>
                        ) : null}
                      </div>


                    </article>
                  );
                },
              )}
            </div>
          ) : (
            <div className="px-6 py-20 text-center">
              <div className="text-sm font-semibold text-white/65">
                No audit events found
              </div>

              <div className="mt-2 text-xs text-white/28">
                Change the filters or date range.
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
  warning = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
  warning?: boolean;
}) {
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
        className={`mt-3 text-[26px] font-semibold tracking-[-0.035em] ${
          warning
            ? "text-amber-300"
            : "text-white"
        }`}
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

function Identity({
  label,
  primary,
  secondary,
  mono = false,
}: {
  label: string;
  primary: string;
  secondary?: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/[0.055] bg-black/10 px-3 py-2.5">
      <div className="text-[8px] font-semibold uppercase tracking-[0.12em] text-white/20">
        {label}
      </div>

      <div
        className={`mt-1 truncate text-xs font-semibold text-white/65 ${
          mono ? "font-mono" : ""
        }`}
        title={primary}
      >
        {primary}
      </div>

      {secondary ? (
        <div
          className="mt-1 truncate text-[9px] text-white/24"
          title={secondary}
        >
          {secondary}
        </div>
      ) : null}
    </div>
  );
}