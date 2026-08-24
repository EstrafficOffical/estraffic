import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PartnerEditor from "./PartnerEditor";
import PartnerBrandLinker from "./PartnerBrandLinker";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  status?: string;
}>;

function dateTime(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function telegramHref(value: string | null) {
  if (!value) return null;

  const handle = value
    .trim()
    .replace(/^https?:\/\/t\.me\//i, "")
    .replace(/^@/, "");

  return handle
    ? `https://t.me/${handle}`
    : null;
}

export default async function PartnersPage({
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

  const [partnerRows, brandRows, flowRows] =
    await Promise.all([
      prisma.partner.findMany({
        orderBy: [
          { status: "asc" },
          { name: "asc" },
        ],
        select: {
          id: true,
          name: true,
          status: true,
          vertical: true,
          contactName: true,
          contactEmail: true,
          contactTelegram: true,
          paymentTerms: true,
          settlementCurrency: true,
          integrationType: true,
          internalNotes: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      prisma.brand.findMany({
        select: {
          id: true,
          name: true,
          vertical: true,
          status: true,
          defaultPartnerId: true,
          updatedAt: true,
        },
        orderBy: {
          name: "asc",
        },
      }),

      prisma.flow.findMany({
        select: {
          id: true,
          name: true,
          status: true,
          trafficSource: true,
          partnerId: true,
          updatedAt: true,
          market: {
            select: {
              geo: true,
              brand: {
                select: {
                  name: true,
                  defaultPartnerId: true,
                },
              },
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      }),
    ]);

  const partnerNameById = new Map(
    partnerRows.map((partner) => [
      partner.id,
      partner.name,
    ]),
  );

  const q = String(filters.q || "")
    .trim()
    .toLowerCase();

  const statusFilter = String(
    filters.status || "ALL",
  ).toUpperCase();

  const brandsByPartner = new Map<
    string,
    typeof brandRows
  >();

  for (const brand of brandRows) {
    if (!brand.defaultPartnerId) continue;

    const list =
      brandsByPartner.get(
        brand.defaultPartnerId,
      ) || [];

    list.push(brand);

    brandsByPartner.set(
      brand.defaultPartnerId,
      list,
    );
  }

  const flowsByPartner = new Map<
    string,
    typeof flowRows
  >();

  for (const flow of flowRows) {
    const effectivePartnerId =
      flow.partnerId ||
      flow.market.brand.defaultPartnerId;

    if (!effectivePartnerId) continue;

    const list =
      flowsByPartner.get(
        effectivePartnerId,
      ) || [];

    list.push(flow);

    flowsByPartner.set(
      effectivePartnerId,
      list,
    );
  }

  const enriched = partnerRows.map(
    (partner) => {
      const brands =
        brandsByPartner.get(partner.id) ||
        [];

      const flows =
        flowsByPartner.get(partner.id) ||
        [];

      const activityDates = [
        partner.updatedAt,
        ...brands.map(
          (brand) => brand.updatedAt,
        ),
        ...flows.map(
          (flow) => flow.updatedAt,
        ),
      ];

      const lastActivity = new Date(
        Math.max(
          ...activityDates.map(
            (value) => value.getTime(),
          ),
        ),
      );

      return {
        ...partner,
        brands,
        flows,
        lastActivity,
      };
    },
  );

  const visiblePartners = enriched.filter(
    (partner) => {
      if (
        statusFilter !== "ALL" &&
        partner.status !== statusFilter
      ) {
        return false;
      }

      if (!q) return true;

      const haystack = [
        partner.name,
        partner.vertical || "",
        partner.contactName || "",
        partner.contactEmail || "",
        partner.contactTelegram || "",
        partner.paymentTerms || "",
        partner.integrationType || "",
        ...partner.brands.map(
          (brand) => brand.name,
        ),
        ...partner.flows.flatMap(
          (flow) => [
            flow.name,
            flow.trafficSource,
            flow.market.geo,
            flow.market.brand.name,
          ],
        ),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    },
  );

  const activeCount = enriched.filter(
    (partner) =>
      partner.status === "ACTIVE",
  ).length;

  const pausedCount = enriched.filter(
    (partner) =>
      partner.status === "PAUSED",
  ).length;

  const effectiveFlowCount =
    enriched.reduce(
      (sum, partner) =>
        sum + partner.flows.length,
      0,
    );

  const defaultBrandCount =
    enriched.reduce(
      (sum, partner) =>
        sum + partner.brands.length,
      0,
    );

  return (
    <div className="min-h-screen bg-[#08090d] px-5 py-8 text-white md:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-[1650px]">
        <header className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8068ff]">
              Internal CRM
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-semibold tracking-[-0.04em]">
                Partners
              </h1>

              <span className="rounded-full border border-[#7657ff]/25 bg-[#7657ff]/10 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9a87ff]">
                Internal В· hidden from affiliates
              </span>
            </div>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/42">
              Advertiser and source relationships,
              contacts, commercial terms and linked
              NEXUS inventory.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <PartnerEditor mode="create" />

            <Link
              href={`/${locale}/admin/offers`}
              className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-2.5 text-xs font-semibold text-white/60 transition hover:bg-white/[0.05] hover:text-white"
            >
              Open offers
            </Link>

            <Link
              href={`/${locale}/postbacks`}
              className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-2.5 text-xs font-semibold text-white/60 transition hover:bg-white/[0.05] hover:text-white"
            >
              Integrations
            </Link>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric
            label="Partners"
            value={enriched.length}
            accent
          />
          <Metric
            label="Active"
            value={activeCount}
            positive
          />
          <Metric
            label="Paused"
            value={pausedCount}
            warning
          />
          <Metric
            label="Default brands"
            value={defaultBrandCount}
          />
          <Metric
            label="Effective flows"
            value={effectiveFlowCount}
          />
        </section>

        <section className="mt-5 rounded-2xl border border-white/[0.08] bg-[#0d0f14] p-4">
          <form
            className="flex flex-col gap-3 lg:flex-row lg:items-center"
            method="get"
          >
            <input
              name="q"
              defaultValue={filters.q || ""}
              placeholder="Search partner, contact, brand, GEO, flow..."
              className="h-11 min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-black/20 px-4 text-xs text-white outline-none transition placeholder:text-white/25 focus:border-[#7657ff]/45"
            />

            <select
              name="status"
              defaultValue={statusFilter}
              className="h-11 rounded-xl border border-white/[0.08] bg-[#0b0c11] px-4 text-xs text-white/70 outline-none"
            >
              <option value="ALL">
                All statuses
              </option>
              <option value="ACTIVE">
                Active
              </option>
              <option value="PAUSED">
                Paused
              </option>
            </select>

            <button className="h-11 rounded-xl bg-[#7657ff] px-5 text-xs font-semibold text-white transition hover:bg-[#846cff]">
              Apply
            </button>

            {(q ||
              statusFilter !== "ALL") && (
              <Link
                href={`/${locale}/admin/partners`}
                className="grid h-11 place-items-center rounded-xl border border-white/[0.08] px-4 text-xs font-semibold text-white/45 transition hover:bg-white/[0.04] hover:text-white"
              >
                Clear
              </Link>
            )}
          </form>
        </section>

        <div className="mt-5 space-y-4">
          {visiblePartners.map((partner) => {
            const tgHref = telegramHref(
              partner.contactTelegram,
            );

            return (
              <section
                key={partner.id}
                className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14]"
              >
                <div className="flex flex-col gap-5 border-b border-white/[0.07] px-5 py-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="truncate text-xl font-semibold tracking-[-0.025em] text-white">
                        {partner.name}
                      </h2>

                      <StatusBadge
                        status={partner.status}
                      />

                      <PartnerBrandLinker
                        partnerId={partner.id}
                        partnerName={partner.name}
                        brands={brandRows.map(
                          (brand) => ({
                            id: brand.id,
                            name: brand.name,
                            vertical:
                              brand.vertical,
                            status:
                              brand.status,
                            defaultPartnerId:
                              brand.defaultPartnerId,
                            defaultPartnerName:
                              brand.defaultPartnerId
                                ? partnerNameById.get(
                                    brand.defaultPartnerId,
                                  ) || null
                                : null,
                          }),
                        )}
                      />

                      <PartnerEditor
                        mode="edit"
                        compact
                        partner={{
                          id: partner.id,
                          name: partner.name,
                          status: partner.status,
                          vertical:
                            partner.vertical || "",
                          contactName:
                            partner.contactName || "",
                          contactEmail:
                            partner.contactEmail || "",
                          contactTelegram:
                            partner.contactTelegram || "",
                          paymentTerms:
                            partner.paymentTerms || "",
                          settlementCurrency:
                            partner.settlementCurrency,
                          integrationType:
                            partner.integrationType || "",
                          internalNotes:
                            partner.internalNotes || "",
                        }}
                      />
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-white/35">
                      <span>
                        Vertical:{" "}
                        <strong className="font-medium text-white/65">
                          {partner.vertical ||
                            "Not set"}
                        </strong>
                      </span>

                      <span>
                        Currency:{" "}
                        <strong className="font-medium text-white/65">
                          {
                            partner.settlementCurrency
                          }
                        </strong>
                      </span>

                      <span>
                        Last record activity:{" "}
                        <strong className="font-medium text-white/65">
                          {dateTime(
                            partner.lastActivity,
                          )}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
                    <Mini
                      label="Brands"
                      value={
                        partner.brands.length
                      }
                    />
                    <Mini
                      label="Flows"
                      value={
                        partner.flows.length
                      }
                    />
                    <MiniText
                      label="Terms"
                      value={
                        partner.paymentTerms ||
                        "Not set"
                      }
                    />
                    <MiniText
                      label="Integration"
                      value={
                        partner.integrationType ||
                        "Not set"
                      }
                    />
                  </div>
                </div>

                <div className="grid xl:grid-cols-[320px_1fr_1fr]">
                  <div className="border-b border-white/[0.07] p-5 xl:border-b-0 xl:border-r">
                    <BlockTitle>
                      Partner contact
                    </BlockTitle>

                    <div className="mt-4 space-y-3">
                      <ContactRow
                        label="Name"
                        value={
                          partner.contactName ||
                          "Not set"
                        }
                      />

                      <ContactRow
                        label="Telegram"
                        value={
                          partner.contactTelegram ||
                          "Not set"
                        }
                        href={tgHref}
                      />

                      <ContactRow
                        label="Email"
                        value={
                          partner.contactEmail ||
                          "Not set"
                        }
                        href={
                          partner.contactEmail
                            ? `mailto:${partner.contactEmail}`
                            : null
                        }
                      />
                    </div>

                    <div className="mt-6">
                      <BlockTitle>
                        Internal notes
                      </BlockTitle>

                      <div className="mt-3 whitespace-pre-wrap break-words rounded-xl border border-white/[0.06] bg-black/15 p-3 text-[11px] leading-5 text-white/42">
                        {partner.internalNotes ||
                          "No internal notes yet."}
                      </div>
                    </div>
                  </div>

                  <div className="border-b border-white/[0.07] p-5 xl:border-b-0 xl:border-r">
                    <div className="flex items-center justify-between gap-3">
                      <BlockTitle>
                        Default brands
                      </BlockTitle>

                      <span className="text-[10px] text-white/25">
                        {
                          partner.brands
                            .length
                        }{" "}
                        linked
                      </span>
                    </div>

                    {partner.brands.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {partner.brands.map(
                          (brand) => (
                            <div
                              key={brand.id}
                              className="rounded-xl border border-white/[0.07] bg-black/15 px-3 py-2"
                            >
                              <div className="text-xs font-semibold text-white/78">
                                {brand.name}
                              </div>

                              <div className="mt-1 text-[9px] uppercase tracking-[0.1em] text-white/25">
                                {brand.vertical} В·{" "}
                                {brand.status}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      <EmptySmall text="No brand uses this partner as its default." />
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <BlockTitle>
                        Effective flows
                      </BlockTitle>

                      <span className="text-[10px] text-white/25">
                        {
                          partner.flows
                            .length
                        }{" "}
                        linked
                      </span>
                    </div>

                    {partner.flows.length ? (
                      <div className="mt-4 divide-y divide-white/[0.055] overflow-hidden rounded-xl border border-white/[0.07]">
                        {partner.flows
                          .slice(0, 6)
                          .map((flow) => (
                            <div
                              key={flow.id}
                              className="grid gap-3 bg-black/10 px-3 py-3 sm:grid-cols-[1fr_auto]"
                            >
                              <div className="min-w-0">
                                <div className="truncate text-xs font-semibold text-white/78">
                                  {
                                    flow.market
                                      .brand.name
                                  }{" "}
                                  /{" "}
                                  {flow.name}
                                </div>

                                <div className="mt-1 truncate text-[9px] text-white/28">
                                  {
                                    flow.market
                                      .geo
                                  }{" "}
                                  В·{" "}
                                  {
                                    flow.trafficSource
                                  }{" "}
                                  В·{" "}
                                  {flow.partnerId
                                    ? "Partner override"
                                    : "Brand default"}
                                </div>
                              </div>

                              <span className="h-fit rounded-full border border-white/[0.08] bg-white/[0.025] px-2 py-1 text-[9px] font-semibold text-white/40">
                                {
                                  flow.status
                                }
                              </span>
                            </div>
                          ))}

                        {partner.flows.length >
                        6 ? (
                          <div className="bg-black/10 px-3 py-2.5 text-center text-[10px] text-white/28">
                            +
                            {partner.flows
                              .length - 6}{" "}
                            more flows
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <EmptySmall text="No effective flows linked to this partner." />
                    )}
                  </div>
                </div>
              </section>
            );
          })}

          {!visiblePartners.length ? (
            <section className="rounded-2xl border border-white/[0.08] bg-[#0d0f14] px-6 py-16 text-center">
              <div className="text-sm font-semibold text-white/70">
                No partners found
              </div>

              <div className="mt-2 text-xs text-white/30">
                Change the search/filter, or add
                partner records in the next CRM
                write phase.
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  accent = false,
  positive = false,
  warning = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
  positive?: boolean;
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
          positive
            ? "text-emerald-300"
            : warning
              ? "text-amber-300"
              : "text-white"
        }`}
      >
        {value.toLocaleString("en-US")}
      </div>

      <div className="mt-2 text-[10px] text-white/22">
        Live NEXUS data
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const active = status === "ACTIVE";

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] ${
        active
          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
          : "border-amber-400/20 bg-amber-400/10 text-amber-300"
      }`}
    >
      {status}
    </span>
  );
}

function Mini({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-[92px] rounded-xl border border-white/[0.07] bg-black/15 px-3 py-2.5">
      <div className="text-[8px] font-semibold uppercase tracking-[0.12em] text-white/25">
        {label}
      </div>

      <div className="mt-1 text-sm font-semibold text-white/80">
        {value}
      </div>
    </div>
  );
}

function MiniText({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-[110px] rounded-xl border border-white/[0.07] bg-black/15 px-3 py-2.5">
      <div className="text-[8px] font-semibold uppercase tracking-[0.12em] text-white/25">
        {label}
      </div>

      <div className="mt-1 max-w-[150px] truncate text-[11px] font-semibold text-white/70">
        {value}
      </div>
    </div>
  );
}

function BlockTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">
      {children}
    </div>
  );
}

function ContactRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string | null;
}) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-[0.1em] text-white/25">
        {label}
      </div>

      {href ? (
        <a
          href={href}
          target={
            href.startsWith("http")
              ? "_blank"
              : undefined
          }
          rel={
            href.startsWith("http")
              ? "noreferrer"
              : undefined
          }
          className="mt-1 block break-all text-xs font-medium text-[#9a87ff] hover:text-[#b4a6ff]"
        >
          {value}
        </a>
      ) : (
        <div className="mt-1 break-all text-xs font-medium text-white/65">
          {value}
        </div>
      )}
    </div>
  );
}

function EmptySmall({
  text,
}: {
  text: string;
}) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-white/[0.07] bg-black/10 px-4 py-8 text-center text-[11px] text-white/28">
      {text}
    </div>
  );
}