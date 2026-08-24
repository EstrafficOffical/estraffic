"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Terms = {
  id: string;
  version: number;
  advertiserCpa: string | null;
  affiliateCpa: string | null;
  currency: string;
  capFtd: number | null;
  minDeposit: string | null;
  baselineValue: string | null;
  baselineDescription: string | null;
  uniqueRdRequirement: string | null;
  wagerRequirement: string | null;
  validationTiming: string | null;
  fraudHoldDays: number | null;
  kpiFallback: string | null;
  notes: string | null;
  effectiveFrom: string;
};

type Partner = {
  id: string;
  name: string;
  status: string;
};

type Flow = {
  id: string;
  name: string;
  trafficSource: string;
  approach: string | null;
  tier: number;
  status: string;
  accessMode: string;
  targetUrl: string | null;
  trackingTemplate: string | null;
  partner: Partner | null;
  latestTerms: Terms | null;
};

type Market = {
  id: string;
  geo: string;
  name: string | null;
  status: string;
  flows: Flow[];
};

type Brand = {
  id: string;
  name: string;
  slug: string;
  vertical: string;
  status: string;
  catalogVisibility: string;
  description: string | null;
  defaultPartner: Partner | null;
  markets: Market[];
};

type Payload = {
  role: "OWNER" | "ADMIN" | "MANAGER";
  brands: Brand[];
  partners: Partner[];
};

const shell = {
  page: "min-h-screen bg-[#08090d] text-white",
  card: "rounded-2xl border border-white/10 bg-[#0d0f14]",
  input:
    "h-11 rounded-xl border border-white/10 bg-[#090b10] px-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#7357ff]/60",
  button:
    "inline-flex h-11 items-center justify-center rounded-xl bg-[#7357ff] px-4 text-sm font-semibold text-white transition hover:bg-[#826cff] disabled:cursor-not-allowed disabled:opacity-40",
  secondary:
    "inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.025] px-3 text-sm font-medium text-white/80 transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40",
};

function money(value: string | null, currency = "USD") {
  if (value == null || value === "") return "-";
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

function margin(flow: Flow) {
  const a = Number(flow.latestTerms?.advertiserCpa ?? NaN);
  const b = Number(flow.latestTerms?.affiliateCpa ?? NaN);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return a - b;
}

function badge(value: string) {
  const normalized = value.replaceAll("_", " ");
  const good = ["ACTIVE", "VISIBLE", "OPEN", "APPROVED"].includes(value);
  const warn = ["PAUSED", "APPROVAL_REQUIRED", "PENDING"].includes(value);
  return (
    <span
      className={[
        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]",
        good
          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
          : warn
            ? "border-amber-500/25 bg-amber-500/10 text-amber-300"
            : "border-white/10 bg-white/[0.04] text-white/55",
      ].join(" ")}
    >
      {normalized}
    </span>
  );
}

function redirectAdminOffersToStepUp() {
  const locale = window.location.pathname.split("/")[1] || "en";
  window.location.assign(
    `/${locale}/security/step-up?callbackUrl=${encodeURIComponent(
      window.location.pathname,
    )}`,
  );
}

export default function AdminOffersPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [createBrandOpen, setCreateBrandOpen] = useState(false);
  const [marketForBrand, setMarketForBrand] = useState<string | null>(null);
  const [flowForMarket, setFlowForMarket] = useState<string | null>(null);
  const [termsForFlow, setTermsForFlow] = useState<string | null>(null);
  const [trackingForFlow, setTrackingForFlow] = useState<string | null>(null);

  const writable = data?.role === "OWNER" || data?.role === "ADMIN";
  const showInternal = writable;

  async function load() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/nexus/offers", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json?.error || "Failed to load NEXUS offers");
      setLoading(false);
      return;
    }
    setData(json);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function mutate(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/nexus/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (
      res.status === 428 &&
      json?.error === "STEP_UP_REQUIRED"
    ) {
      redirectAdminOffersToStepUp();
      return null;
    }

    if (!res.ok) {
      setError(json?.message || json?.error || "Action failed");
      return null;
    }
    await load();
    return json as { ok?: boolean; id?: string };
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data?.brands ?? [];
    return (data?.brands ?? []).filter((brand) => {
      const haystack = [
        brand.name,
        brand.vertical,
        brand.defaultPartner?.name ?? "",
        ...brand.markets.flatMap((m) => [
          m.geo,
          m.name ?? "",
          ...m.flows.flatMap((f) => [f.name, f.trafficSource, f.approach ?? ""]),
        ]),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [data, search]);

  const stats = useMemo(() => {
    const brands = data?.brands ?? [];
    const markets = brands.flatMap((b) => b.markets);
    const flows = markets.flatMap((m) => m.flows);
    return {
      brands: brands.length,
      activeBrands: brands.filter((b) => b.status === "ACTIVE").length,
      markets: markets.length,
      activeFlows: flows.filter((f) => f.status === "ACTIVE").length,
    };
  }, [data]);

  return (
    <div className={shell.page}>
      <div className="mx-auto w-full max-w-[1540px] px-6 py-10 lg:px-10">
        <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#8068ff]">
              Administration
            </div>
            <h1 className="text-4xl font-semibold tracking-[-0.04em]">Offers</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">
              Brand / market / flow / commercial terms. This workspace is backed by the live NEXUS development database.
            </p>
          </div>

          <div className="flex gap-2">
            <button className={shell.secondary} onClick={() => void load()}>
              Refresh
            </button>
            {writable && (
              <button className={shell.button} onClick={() => setCreateBrandOpen((v) => !v)}>
                + Create offer
              </button>
            )}
          </div>
        </div>

        {data?.role === "MANAGER" && (
          <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-200/80">
            MANAGER access is read-only here. Commercial and structural changes require ADMIN or OWNER.
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/25 bg-red-500/[0.08] px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Brands", stats.brands],
            ["Active brands", stats.activeBrands],
            ["Markets / GEOs", stats.markets],
            ["Active flows", stats.activeFlows],
          ].map(([label, value]) => (
            <div key={label} className={`${shell.card} p-5`}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">{label}</div>
              <div className="mt-3 text-3xl font-semibold">{value}</div>
            </div>
          ))}
        </div>

        {createBrandOpen && writable && (
          <CreateOfferWizard
            partners={data?.partners ?? []}
            busy={busy}
            mutate={mutate}
            onCancel={() => setCreateBrandOpen(false)}
            onDone={(brandId) => {
              setCreateBrandOpen(false);
              setExpanded(brandId);
            }}
          />
        )}

        <div className={`${shell.card} mb-5 p-4`}>
          <input
            className={`${shell.input} w-full`}
            placeholder="Search brand, GEO, flow, traffic source..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className={`${shell.card} flex min-h-64 items-center justify-center text-sm text-white/40`}>
            Loading live offer architecture...
          </div>
        ) : filtered.length === 0 ? (
          <div className={`${shell.card} flex min-h-72 flex-col items-center justify-center px-6 text-center`}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#7357ff]/25 bg-[#7357ff]/10 text-[#8c77ff]">
              N
            </div>
            <div className="text-lg font-semibold">No NEXUS brands yet</div>
            <div className="mt-2 max-w-lg text-sm leading-6 text-white/40">
              Create the first brand, add a GEO market, then create traffic flows and their commercial terms.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((brand) => {
              const flows = brand.markets.flatMap((m) => m.flows);
              const isOpen = expanded === brand.id;
              return (
                <section key={brand.id} className={`${shell.card} overflow-hidden`}>
                  <button
                    className="grid w-full gap-5 px-5 py-5 text-left md:grid-cols-[1.6fr_.8fr_1fr_.55fr_.55fr_.7fr] md:items-center"
                    onClick={() => setExpanded(isOpen ? null : brand.id)}
                  >
                    <div>
                      <div className="text-lg font-semibold">{brand.name}</div>
                      <div className="mt-1 text-xs text-white/35">{brand.slug}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.16em] text-white/30">Vertical</div>
                      <div className="mt-1 text-sm text-white/75">{brand.vertical}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.16em] text-white/30">Internal partner</div>
                      <div className="mt-1 text-sm text-white/75">{brand.defaultPartner?.name ?? "Unassigned"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.16em] text-white/30">GEOs</div>
                      <div className="mt-1 text-sm font-semibold">{brand.markets.length}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.16em] text-white/30">Flows</div>
                      <div className="mt-1 text-sm font-semibold">{flows.length}</div>
                    </div>
                    <div className="flex items-center justify-between gap-2 md:justify-end">
                      {badge(brand.status)}
                      <span className="text-white/30">{isOpen ? "v" : "+"}</span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-white/8 bg-black/10 px-5 py-5">
                      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                          {badge(brand.catalogVisibility)}
                          <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/45">
                            {brand.markets.length} markets
                          </span>
                          <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/45">
                            {flows.filter((f) => f.status === "ACTIVE").length} active flows
                          </span>
                        </div>
                        {writable && (
                           <div className="flex flex-wrap gap-2">
                             <button
                               className={shell.secondary}
                               onClick={() =>
                                 setMarketForBrand(
                                   marketForBrand === brand.id
                                     ? null
                                     : brand.id,
                                 )
                               }
                             >
                               + Add market
                             </button>

                             <button
                               type="button"
                               disabled={busy}
                               className="inline-flex h-10 items-center justify-center rounded-xl border border-rose-400/25 bg-rose-400/[0.055] px-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-400/10 disabled:opacity-40"
                               onClick={async () => {
                                 if (
                                   !confirm(
                                     `Permanently delete brand "${brand.name}"? This is allowed only when the brand contains no flows. Empty GEOs will be removed with it.`,
                                   )
                                 ) {
                                   return;
                                 }

                                 const ok = await mutate({
                                   action: "deleteBrand",
                                   brandId: brand.id,
                                 });

                                 if (ok) {
                                   if (expanded === brand.id) {
                                     setExpanded(null);
                                   }

                                   if (marketForBrand === brand.id) {
                                     setMarketForBrand(null);
                                   }
                                 }
                               }}
                             >
                               Delete brand
                             </button>
                           </div>
                         )}
                      </div>

                      {marketForBrand === brand.id && writable && (
                        <AddMarketForm
                          busy={busy}
                          onCancel={() => setMarketForBrand(null)}
                          onSubmit={async (payload) => {
                            const ok = await mutate({ action: "createMarket", brandId: brand.id, ...payload });
                            if (ok) setMarketForBrand(null);
                          }}
                        />
                      )}

                      {brand.markets.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-white/10 px-5 py-10 text-center text-sm text-white/35">
                          No GEO markets yet.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {brand.markets.map((market) => (
                            <div key={market.id} className="rounded-2xl border border-white/8 bg-[#090b0f]">
                              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="rounded-lg bg-white/[0.05] px-2.5 py-1 text-sm font-bold">{market.geo}</div>
                                  <div>
                                    <div className="text-sm font-semibold">{market.name || `${brand.name} ${market.geo}`}</div>
                                    <div className="text-xs text-white/30">{market.flows.length} flows</div>
                                  </div>
                                  {badge(market.status)}
                                </div>
                                {writable && (
                                   <div className="flex flex-wrap gap-2">
                                     <button
                                       className={shell.secondary}
                                       onClick={() =>
                                         setFlowForMarket(
                                           flowForMarket === market.id
                                             ? null
                                             : market.id,
                                         )
                                       }
                                     >
                                       + Add flow
                                     </button>

                                     <button
                                       type="button"
                                       disabled={busy}
                                       className="inline-flex h-10 items-center justify-center rounded-xl border border-rose-400/25 bg-rose-400/[0.055] px-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-400/10 disabled:opacity-40"
                                       onClick={async () => {
                                         if (
                                           !confirm(
                                             `Permanently delete GEO "${brand.name} / ${market.geo}"? This is allowed only when the GEO contains no flows.`,
                                           )
                                         ) {
                                           return;
                                         }

                                         const ok = await mutate({
                                           action: "deleteMarket",
                                           marketId: market.id,
                                         });

                                         if (
                                           ok &&
                                           flowForMarket === market.id
                                         ) {
                                           setFlowForMarket(null);
                                         }
                                       }}
                                     >
                                       Delete GEO
                                     </button>
                                   </div>
                                 )}
                              </div>

                              {flowForMarket === market.id && writable && (
                                <div className="border-b border-white/8 p-4">
                                  <AddFlowForm
                                    partners={data?.partners ?? []}
                                    defaultPartnerId={brand.defaultPartner?.id ?? ""}
                                    busy={busy}
                                    onCancel={() => setFlowForMarket(null)}
                                    onSubmit={async (payload) => {
                                      const ok = await mutate({ action: "createFlow", marketId: market.id, ...payload });
                                      if (ok) setFlowForMarket(null);
                                    }}
                                  />
                                </div>
                              )}

                              {market.flows.length === 0 ? (
                                <div className="px-4 py-7 text-center text-sm text-white/30">No flows for {market.geo} yet.</div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="min-w-[1100px] w-full text-left">
                                    <thead>
                                      <tr className="text-[10px] uppercase tracking-[0.16em] text-white/30">
                                        <th className="px-4 py-3 font-semibold">Flow</th>
                                        <th className="px-4 py-3 font-semibold">Traffic</th>
                                        <th className="px-4 py-3 font-semibold">Affiliate CPA</th>
                                        {showInternal && <th className="px-4 py-3 font-semibold">Advertiser CPA</th>}
                                        {showInternal && <th className="px-4 py-3 font-semibold">Margin</th>}
                                        <th className="px-4 py-3 font-semibold">Cap</th>
                                        <th className="px-4 py-3 font-semibold">Access</th>
                                        <th className="px-4 py-3 font-semibold">Status</th>
                                        <th className="px-4 py-3 font-semibold">Terms / Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {market.flows.map((flow) => {
                                        const m = margin(flow);
                                        return (
                                          <tr key={flow.id} className="border-t border-white/[0.06] align-top">
                                            <td className="px-4 py-4">
                                              <div className="font-medium">{flow.name}</div>
                                              <div className="mt-1 text-xs text-white/30">Tier {flow.tier}</div>
                                            </td>
                                            <td className="px-4 py-4">
                                              <div className="text-sm text-white/75">{flow.trafficSource}</div>
                                              <div className="mt-1 text-xs text-white/30">{flow.approach || "-"}</div>
                                            </td>
                                            <td className="px-4 py-4 text-sm font-semibold">
                                              {money(flow.latestTerms?.affiliateCpa ?? null, flow.latestTerms?.currency)}
                                            </td>
                                            {showInternal && (
                                              <td className="px-4 py-4 text-sm">
                                                {money(flow.latestTerms?.advertiserCpa ?? null, flow.latestTerms?.currency)}
                                              </td>
                                            )}
                                            {showInternal && (
                                              <td className="px-4 py-4 text-sm font-semibold text-emerald-300">
                                                {m == null ? "-" : money(String(m), flow.latestTerms?.currency)}
                                              </td>
                                            )}
                                            <td className="px-4 py-4 text-sm text-white/70">
                                              {flow.latestTerms?.capFtd ?? "-"}
                                            </td>
                                            <td className="px-4 py-4">{badge(flow.accessMode)}</td>
                                            <td className="px-4 py-4">{badge(flow.status)}</td>
                                            <td className="px-4 py-4">
                                              <div className="text-xs text-white/35">
                                                {flow.latestTerms ? `v${flow.latestTerms.version}` : "No terms"}
                                              </div>
                                              {writable && (
                                                <div className="mt-2 flex flex-col items-start gap-1">
                                                  <button
                                                    className="text-xs font-semibold text-[#8b76ff] hover:text-[#a291ff]"
                                                    onClick={() => setTermsForFlow(termsForFlow === flow.id ? null : flow.id)}
                                                  >
                                                    + New terms version
                                                  </button>
                                                  <button
                                                    className="text-xs font-semibold text-[#8b76ff] hover:text-[#a291ff]"
                                                    onClick={() => setTrackingForFlow(trackingForFlow === flow.id ? null : flow.id)}
                                                  >
                                                    + Tracking
                                                  </button>
                                                </div>
                                              )}
                                            
                                               {writable && (
                                                 <div className="mt-3 flex min-w-[110px] flex-col gap-2 border-t border-white/[0.06] pt-3">
                                                   {flow.status !== "ARCHIVED" && (
                                                     <button
                                                       type="button"
                                                       disabled={busy}
                                                       className="rounded-lg border border-amber-400/20 bg-amber-400/[0.055] px-3 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-400/10 disabled:opacity-40"
                                                       onClick={async () => {
                                                         if (
                                                           !confirm(
                                                             `Archive "${brand.name} / ${market.geo} / ${flow.name}"? The flow will stop being active, but its history stays intact.`,
                                                           )
                                                         ) {
                                                           return;
                                                         }

                                                         await mutate({
                                                           action: "archiveFlow",
                                                           flowId: flow.id,
                                                         });
                                                       }}
                                                     >
                                                       Archive
                                                     </button>
                                                   )}

                                                   <button
                                                     type="button"
                                                     disabled={busy}
                                                     className="rounded-lg border border-rose-400/25 bg-rose-400/[0.055] px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-400/10 disabled:opacity-40"
                                                     onClick={async () => {
                                                       if (
                                                         !confirm(
                                                           `Permanently delete "${brand.name} / ${market.geo} / ${flow.name}"? Only unused flows can be deleted. This cannot be undone.`,
                                                         )
                                                       ) {
                                                         return;
                                                       }

                                                       const ok =
                                                         await mutate({
                                                           action: "deleteFlow",
                                                           flowId: flow.id,
                                                         });

                                                       if (
                                                         ok &&
                                                         termsForFlow ===
                                                           flow.id
                                                       ) {
                                                         setTermsForFlow(
                                                           null,
                                                         );
                                                       }
                                                     }}
                                                   >
                                                     Delete
                                                   </button>
                                                 </div>
                                               )}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>

                                  {market.flows.map((flow) =>
                                    termsForFlow === flow.id && writable ? (
                                      <div key={`${flow.id}-terms`} className="border-t border-white/8 p-4">
                                        <TermsForm
                                          flow={flow}
                                          busy={busy}
                                          onCancel={() => setTermsForFlow(null)}
                                          onSubmit={async (payload) => {
                                            const ok = await mutate({ action: "addTermsVersion", flowId: flow.id, ...payload });
                                            if (ok) setTermsForFlow(null);
                                          }}
                                        />
                                      </div>
                                    ) : null,
                                  )}

                                  {market.flows.map((flow) =>
                                    trackingForFlow === flow.id && writable ? (
                                      <div key={`${flow.id}-tracking`} className="border-t border-white/8 p-4">
                                        <TrackingForm
                                          flow={flow}
                                          busy={busy}
                                          onCancel={() => setTrackingForFlow(null)}
                                          onSubmit={async (payload) => {
                                            const ok = await mutate({ action: "setTrackingTarget", flowId: flow.id, ...payload });
                                            if (ok) setTrackingForFlow(null);
                                          }}
                                        />
                                      </div>
                                    ) : null,
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateOfferWizard({
  partners,
  busy,
  mutate,
  onCancel,
  onDone,
}: {
  partners: Partner[];
  busy: boolean;
  mutate: (body: Record<string, unknown>) => Promise<{ ok?: boolean; id?: string } | null>;
  onCancel: () => void;
  onDone: (brandId: string) => void;
}) {
  const steps = ["Brand", "Markets", "Flows", "Commercial terms", "Review"];
  const [step, setStep] = useState(1);
  const [brandId, setBrandId] = useState("");
  const [marketId, setMarketId] = useState("");
  const [flowId, setFlowId] = useState("");

  const [brand, setBrand] = useState({
    name: "",
    vertical: "iGaming",
    partnerId: "",
    visibility: "VISIBLE",
  });

  const [market, setMarket] = useState({
    geo: "",
    name: "",
  });

  const [flow, setFlow] = useState({
    name: "",
    trafficSource: "Facebook",
    approach: "",
    partnerId: "",
    tier: "3",
    accessMode: "APPROVAL_REQUIRED",
  });

  const [terms, setTerms] = useState({
    affiliateCpa: "",
    advertiserCpa: "",
    capFtd: "",
    minDeposit: "",
    currency: "USD",
    baselineValue: "",
    baselineDescription: "",
    uniqueRdRequirement: "",
    wagerRequirement: "",
    validationTiming: "",
    fraudHoldDays: "",
    kpiFallback: "",
  });

  const marginValue = useMemo(() => {
    const advertiser = Number(terms.advertiserCpa);
    const affiliate = Number(terms.affiliateCpa);
    if (!Number.isFinite(advertiser) || !Number.isFinite(affiliate) || !terms.advertiserCpa || !terms.affiliateCpa) {
      return null;
    }
    return advertiser - affiliate;
  }, [terms.advertiserCpa, terms.affiliateCpa]);

  function updateBrand(name: keyof typeof brand) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setBrand((value) => ({ ...value, [name]: e.target.value }));
  }

  function updateMarket(name: keyof typeof market) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setMarket((value) => ({ ...value, [name]: e.target.value }));
  }

  function updateFlow(name: keyof typeof flow) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setFlow((value) => ({ ...value, [name]: e.target.value }));
  }

  function updateTerms(name: keyof typeof terms) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setTerms((value) => ({ ...value, [name]: e.target.value }));
  }

  async function saveBrand(e: FormEvent) {
    e.preventDefault();
    const result = await mutate({
      action: "createBrand",
      name: brand.name,
      vertical: brand.vertical,
      defaultPartnerId: brand.partnerId || null,
      catalogVisibility: brand.visibility,
    });
    if (result?.id) {
      setBrandId(result.id);
      setFlow((value) => ({ ...value, partnerId: brand.partnerId }));
      setStep(2);
    }
  }

  async function saveMarket(e: FormEvent) {
    e.preventDefault();
    const result = await mutate({
      action: "createMarket",
      brandId,
      geo: market.geo.toUpperCase(),
      name: market.name || null,
    });
    if (result?.id) {
      setMarketId(result.id);
      setStep(3);
    }
  }

  function saveFlowDraft(e: FormEvent) {
    e.preventDefault();
    if (!flow.name.trim() || !flow.trafficSource.trim()) return;
    setStep(4);
  }

  async function saveCommercialTerms(e: FormEvent) {
    e.preventDefault();
    const result = await mutate({
      action: "createFlow",
      marketId,
      name: flow.name,
      trafficSource: flow.trafficSource,
      approach: flow.approach || null,
      partnerId: flow.partnerId || null,
      tier: Number(flow.tier),
      accessMode: flow.accessMode,
      affiliateCpa: terms.affiliateCpa || null,
      advertiserCpa: terms.advertiserCpa || null,
      capFtd: terms.capFtd ? Number(terms.capFtd) : null,
      minDeposit: terms.minDeposit || null,
      currency: terms.currency || "USD",
    });
    if (result?.id) {
      setFlowId(result.id);
      setStep(5);
    }
  }

  return (
    <section className={`${shell.card} mb-6 overflow-hidden`}>
      <div className="border-b border-white/8 px-5 py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8068ff]">
              Create offer
            </div>
            <div className="mt-1 text-xl font-semibold">Guided offer setup</div>
            <div className="mt-1 text-sm text-white/40">
              Each completed database step is saved immediately, so progress survives refresh.
            </div>
          </div>
          <button type="button" className={shell.secondary} onClick={onCancel}>
            Close
          </button>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-5">
          {steps.map((label, index) => {
            const number = index + 1;
            const active = number === step;
            const complete = number < step;
            return (
              <div
                key={label}
                className={[
                  "rounded-xl border px-3 py-3",
                  active
                    ? "border-[#7357ff]/55 bg-[#7357ff]/10"
                    : complete
                      ? "border-emerald-500/20 bg-emerald-500/[0.05]"
                      : "border-white/8 bg-white/[0.02]",
                ].join(" ")}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={[
                      "flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-bold",
                      active
                        ? "bg-[#7357ff] text-white"
                        : complete
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-white/[0.05] text-white/35",
                    ].join(" ")}
                  >
                    {complete ? "OK" : number}
                  </div>
                  <div className={active ? "text-sm font-semibold text-white" : "text-sm text-white/40"}>
                    {label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-5">
        {step === 1 && (
          <form onSubmit={saveBrand}>
            <WizardTitle title="Brand" description="Create the advertiser-facing brand container." />
            <div className="grid gap-3 lg:grid-cols-2">
              <label className="grid gap-2 text-xs text-white/45">
                Brand name
                <input className={shell.input} required placeholder="FAVBET" value={brand.name} onChange={updateBrand("name")} />
              </label>
              <label className="grid gap-2 text-xs text-white/45">
                Vertical
                <input className={shell.input} required placeholder="iGaming" value={brand.vertical} onChange={updateBrand("vertical")} />
              </label>
              <label className="grid gap-2 text-xs text-white/45">
                Default internal partner
                <select className={shell.input} value={brand.partnerId} onChange={updateBrand("partnerId")}>
                  <option value="">No default partner</option>
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>{partner.name}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-xs text-white/45">
                Catalog visibility
                <select className={shell.input} value={brand.visibility} onChange={updateBrand("visibility")}>
                  <option value="VISIBLE">Visible</option>
                  <option value="HIDDEN">Hidden</option>
                  <option value="PRIVATE">Private</option>
                </select>
              </label>
            </div>
            <WizardActions busy={busy} next="Save brand and continue" />
          </form>
        )}

        {step === 2 && (
          <form onSubmit={saveMarket}>
            <WizardTitle
              title="Market / GEO"
              description={`Brand ${brand.name} is saved. Add the first GEO market.`}
            />
            <div className="grid gap-3 lg:grid-cols-2">
              <label className="grid gap-2 text-xs text-white/45">
                GEO
                <input
                  className={shell.input}
                  required
                  maxLength={12}
                  placeholder="PL"
                  value={market.geo}
                  onChange={(e) => setMarket((value) => ({ ...value, geo: e.target.value.toUpperCase() }))}
                />
              </label>
              <label className="grid gap-2 text-xs text-white/45">
                Market name
                <input className={shell.input} placeholder="FAVBET Poland" value={market.name} onChange={updateMarket("name")} />
              </label>
            </div>
            <WizardActions busy={busy} next="Save market and continue" />
          </form>
        )}

        {step === 3 && (
          <form onSubmit={saveFlowDraft}>
            <WizardTitle
              title="Flow"
              description={`Define the traffic flow for ${market.geo || "this market"}. Commercial values come next.`}
            />
            <div className="grid gap-3 lg:grid-cols-3">
              <label className="grid gap-2 text-xs text-white/45">
                Flow name
                <input className={shell.input} required placeholder="Facebook Slots" value={flow.name} onChange={updateFlow("name")} />
              </label>
              <label className="grid gap-2 text-xs text-white/45">
                Traffic source
                <input className={shell.input} required placeholder="Facebook" value={flow.trafficSource} onChange={updateFlow("trafficSource")} />
              </label>
              <label className="grid gap-2 text-xs text-white/45">
                Approach
                <input className={shell.input} placeholder="Slots" value={flow.approach} onChange={updateFlow("approach")} />
              </label>
              <label className="grid gap-2 text-xs text-white/45">
                Partner override
                <select className={shell.input} value={flow.partnerId} onChange={updateFlow("partnerId")}>
                  <option value="">Use brand default / none</option>
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>{partner.name}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-xs text-white/45">
                Starting tier
                <select className={shell.input} value={flow.tier} onChange={updateFlow("tier")}>
                  <option value="1">Tier 1</option>
                  <option value="2">Tier 2</option>
                  <option value="3">Tier 3</option>
                </select>
              </label>
              <label className="grid gap-2 text-xs text-white/45">
                Access mode
                <select className={shell.input} value={flow.accessMode} onChange={updateFlow("accessMode")}>
                  <option value="OPEN">Open</option>
                  <option value="APPROVAL_REQUIRED">Approval Required</option>
                  <option value="PRIVATE">Private</option>
                </select>
              </label>
            </div>
            <WizardActions busy={busy} next="Continue to commercial terms" />
          </form>
        )}

        {step === 4 && (
          <form onSubmit={saveCommercialTerms}>
            <WizardTitle
              title="Commercial terms"
              description="Publish version 1 of the commercial conditions for this flow."
            />
            <div className="grid gap-3 lg:grid-cols-4">
              <label className="grid gap-2 text-xs text-white/45">
                Affiliate CPA
                <input className={shell.input} inputMode="decimal" placeholder="80" value={terms.affiliateCpa} onChange={updateTerms("affiliateCpa")} />
              </label>
              <label className="grid gap-2 text-xs text-white/45">
                Advertiser CPA
                <input className={shell.input} inputMode="decimal" placeholder="105" value={terms.advertiserCpa} onChange={updateTerms("advertiserCpa")} />
              </label>
              <label className="grid gap-2 text-xs text-white/45">
                Gross margin
                <div className={`${shell.input} flex items-center text-sm font-semibold text-emerald-300`}>
                  {marginValue == null ? "-" : money(String(marginValue), terms.currency)}
                </div>
              </label>
              <label className="grid gap-2 text-xs text-white/45">
                Currency
                <input className={shell.input} placeholder="USD" value={terms.currency} onChange={updateTerms("currency")} />
              </label>
              <label className="grid gap-2 text-xs text-white/45">
                Test cap FTD
                <input className={shell.input} inputMode="numeric" placeholder="50" value={terms.capFtd} onChange={updateTerms("capFtd")} />
              </label>
              <label className="grid gap-2 text-xs text-white/45">
                Min deposit
                <input className={shell.input} inputMode="decimal" placeholder="10" value={terms.minDeposit} onChange={updateTerms("minDeposit")} />
              </label>
              <label className="grid gap-2 text-xs text-white/45">
                Baseline value
                <input className={shell.input} inputMode="decimal" placeholder="Optional" value={terms.baselineValue} onChange={updateTerms("baselineValue")} />
              </label>
              <label className="grid gap-2 text-xs text-white/45">
                Unique RD requirement
                <input className={shell.input} inputMode="decimal" placeholder="Optional" value={terms.uniqueRdRequirement} onChange={updateTerms("uniqueRdRequirement")} />
              </label>
              <label className="grid gap-2 text-xs text-white/45">
                Wager requirement
                <input className={shell.input} inputMode="decimal" placeholder="Optional" value={terms.wagerRequirement} onChange={updateTerms("wagerRequirement")} />
              </label>
              <label className="grid gap-2 text-xs text-white/45">
                Validation timing
                <input className={shell.input} placeholder="14 days test" value={terms.validationTiming} onChange={updateTerms("validationTiming")} />
              </label>
              <label className="grid gap-2 text-xs text-white/45">
                Fraud hold days
                <input className={shell.input} inputMode="numeric" placeholder="Optional" value={terms.fraudHoldDays} onChange={updateTerms("fraudHoldDays")} />
              </label>
              <label className="grid gap-2 text-xs text-white/45 lg:col-span-2">
                Baseline description
                <textarea className={`${shell.input} min-h-24 py-3`} placeholder="Quality baseline details" value={terms.baselineDescription} onChange={updateTerms("baselineDescription")} />
              </label>
              <label className="grid gap-2 text-xs text-white/45 lg:col-span-2">
                KPI fallback
                <textarea className={`${shell.input} min-h-24 py-3`} placeholder="Fallback acceptance logic" value={terms.kpiFallback} onChange={updateTerms("kpiFallback")} />
              </label>
            </div>
            <WizardActions busy={busy} next="Publish flow and review" />
          </form>
        )}

        {step === 5 && (
          <div>
            <WizardTitle title="Review" description="The offer structure has been saved to PostgreSQL." />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <ReviewCard label="Brand" value={`${brand.name} / ${brand.vertical}`} />
              <ReviewCard label="Market" value={`${market.geo}${market.name ? ` / ${market.name}` : ""}`} />
              <ReviewCard label="Flow" value={`${flow.name} / ${flow.trafficSource}${flow.approach ? ` / ${flow.approach}` : ""}`} />
              <ReviewCard
                label="Commercial"
                value={`${money(terms.affiliateCpa || null, terms.currency)} affiliate / ${money(terms.advertiserCpa || null, terms.currency)} advertiser`}
              />
            </div>
            <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] px-4 py-3 text-sm text-emerald-200/80">
              Brand, market, flow and terms v1 are live. You can add more GEOs, flows or new terms versions from the brand card.
            </div>
            <div className="mt-5 flex justify-end">
              <button className={shell.button} onClick={() => onDone(brandId)} disabled={!brandId || !marketId || !flowId}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function WizardTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-5">
      <div className="text-lg font-semibold">{title}</div>
      <div className="mt-1 text-sm text-white/40">{description}</div>
    </div>
  );
}

function WizardActions({ busy, next }: { busy: boolean; next: string }) {
  return (
    <div className="mt-5 flex justify-end">
      <button className={shell.button} disabled={busy}>
        {busy ? "Saving..." : next}
      </button>
    </div>
  );
}

function ReviewCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">{label}</div>
      <div className="mt-2 text-sm font-medium text-white/80">{value}</div>
    </div>
  );
}

function AddMarketForm({
  busy,
  onCancel,
  onSubmit,
}: {
  busy: boolean;
  onCancel: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [geo, setGeo] = useState("");
  const [name, setName] = useState("");

  return (
    <form
      className="mb-4 grid gap-3 rounded-2xl border border-white/8 bg-[#090b0f] p-4 md:grid-cols-[180px_1fr_auto]"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit({ geo, name: name || null });
      }}
    >
      <input className={shell.input} required maxLength={12} placeholder="GEO e.g. PL" value={geo} onChange={(e) => setGeo(e.target.value.toUpperCase())} />
      <input className={shell.input} placeholder="Market name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="flex gap-2">
        <button className={shell.button} disabled={busy}>Add GEO</button>
        <button type="button" className={shell.secondary} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function AddFlowForm({
  partners,
  defaultPartnerId,
  busy,
  onCancel,
  onSubmit,
}: {
  partners: Partner[];
  defaultPartnerId: string;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: "",
    trafficSource: "Facebook",
    approach: "",
    partnerId: defaultPartnerId,
    tier: "3",
    accessMode: "APPROVAL_REQUIRED",
    affiliateCpa: "",
    advertiserCpa: "",
    capFtd: "",
    minDeposit: "",
    currency: "USD",
  });

  function field(name: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((v) => ({ ...v, [name]: e.target.value }));
  }

  return (
    <form
      className="grid gap-3 xl:grid-cols-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit({
          ...form,
          partnerId: form.partnerId || null,
          tier: Number(form.tier),
          affiliateCpa: form.affiliateCpa || null,
          advertiserCpa: form.advertiserCpa || null,
          capFtd: form.capFtd ? Number(form.capFtd) : null,
          minDeposit: form.minDeposit || null,
        });
      }}
    >
      <input className={shell.input} required placeholder="Flow name" value={form.name} onChange={field("name")} />
      <input className={shell.input} required placeholder="Traffic source" value={form.trafficSource} onChange={field("trafficSource")} />
      <input className={shell.input} placeholder="Approach (Slots, Brand, Cross...)" value={form.approach} onChange={field("approach")} />
      <select className={shell.input} value={form.partnerId} onChange={field("partnerId")}>
        <option value="">Use no override</option>
        {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <select className={shell.input} value={form.tier} onChange={field("tier")}>
        <option value="1">Tier 1</option>
        <option value="2">Tier 2</option>
        <option value="3">Tier 3</option>
      </select>
      <select className={shell.input} value={form.accessMode} onChange={field("accessMode")}>
        <option value="OPEN">Open</option>
        <option value="APPROVAL_REQUIRED">Approval Required</option>
        <option value="PRIVATE">Private</option>
      </select>
      <input className={shell.input} inputMode="decimal" placeholder="Affiliate CPA" value={form.affiliateCpa} onChange={field("affiliateCpa")} />
      <input className={shell.input} inputMode="decimal" placeholder="Advertiser CPA" value={form.advertiserCpa} onChange={field("advertiserCpa")} />
      <input className={shell.input} inputMode="numeric" placeholder="Test cap FTD" value={form.capFtd} onChange={field("capFtd")} />
      <input className={shell.input} inputMode="decimal" placeholder="Min deposit" value={form.minDeposit} onChange={field("minDeposit")} />
      <input className={shell.input} placeholder="Currency" value={form.currency} onChange={field("currency")} />
      <div className="flex gap-2">
        <button className={shell.button} disabled={busy}>Create flow</button>
        <button type="button" className={shell.secondary} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function TrackingForm({
  flow,
  busy,
  onCancel,
  onSubmit,
}: {
  flow: Flow;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [targetUrl, setTargetUrl] = useState(flow.targetUrl ?? "");
  const [trackingTemplate, setTrackingTemplate] = useState(flow.trackingTemplate ?? "");

  return (
    <form
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit({
          targetUrl: targetUrl.trim() || null,
          trackingTemplate: trackingTemplate.trim() || null,
        });
      }}
    >
      <div>
        <div className="text-sm font-semibold">Tracking destination</div>
        <div className="mt-1 text-xs leading-5 text-white/35">
          Target URL is the advertiser landing URL. NEXUS adds click_id automatically and also supports
          placeholders such as {"{click_id}"}, {"{sub1}"}, {"{userId}"} and {"{flowId}"}.
        </div>
      </div>

      <label className="grid gap-2 text-xs text-white/45">
        Target URL
        <input
          className={shell.input}
          type="url"
          placeholder="https://advertiser.example/landing?cid={click_id}"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
        />
      </label>

      <label className="grid gap-2 text-xs text-white/45">
        Tracking template (optional, reserved for partner-specific mapping)
        <textarea
          className={`${shell.input} min-h-24 py-3`}
          placeholder="Optional internal template / mapping notes"
          value={trackingTemplate}
          onChange={(e) => setTrackingTemplate(e.target.value)}
        />
      </label>

      <div className="flex gap-2">
        <button className={shell.button} disabled={busy}>
          {busy ? "Saving..." : "Save tracking"}
        </button>
        <button type="button" className={shell.secondary} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function TermsForm({
  flow,
  busy,
  onCancel,
  onSubmit,
}: {
  flow: Flow;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const old = flow.latestTerms;
  const [form, setForm] = useState({
    advertiserCpa: old?.advertiserCpa ?? "",
    affiliateCpa: old?.affiliateCpa ?? "",
    currency: old?.currency ?? "USD",
    capFtd: old?.capFtd?.toString() ?? "",
    minDeposit: old?.minDeposit ?? "",
    baselineValue: old?.baselineValue ?? "",
    baselineDescription: old?.baselineDescription ?? "",
    uniqueRdRequirement: old?.uniqueRdRequirement ?? "",
    wagerRequirement: old?.wagerRequirement ?? "",
    validationTiming: old?.validationTiming ?? "",
    fraudHoldDays: old?.fraudHoldDays?.toString() ?? "",
    kpiFallback: old?.kpiFallback ?? "",
    notes: old?.notes ?? "",
  });

  function field(name: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((v) => ({ ...v, [name]: e.target.value }));
  }

  return (
    <form
      className="grid gap-3 xl:grid-cols-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit({
          ...form,
          advertiserCpa: form.advertiserCpa || null,
          affiliateCpa: form.affiliateCpa || null,
          capFtd: form.capFtd ? Number(form.capFtd) : null,
          minDeposit: form.minDeposit || null,
          baselineValue: form.baselineValue || null,
          uniqueRdRequirement: form.uniqueRdRequirement || null,
          wagerRequirement: form.wagerRequirement || null,
          fraudHoldDays: form.fraudHoldDays ? Number(form.fraudHoldDays) : null,
        });
      }}
    >
      <input className={shell.input} placeholder="Advertiser CPA" value={form.advertiserCpa} onChange={field("advertiserCpa")} />
      <input className={shell.input} placeholder="Affiliate CPA" value={form.affiliateCpa} onChange={field("affiliateCpa")} />
      <input className={shell.input} placeholder="Currency" value={form.currency} onChange={field("currency")} />
      <input className={shell.input} placeholder="Cap FTD" value={form.capFtd} onChange={field("capFtd")} />
      <input className={shell.input} placeholder="Min deposit" value={form.minDeposit} onChange={field("minDeposit")} />
      <input className={shell.input} placeholder="Baseline value" value={form.baselineValue} onChange={field("baselineValue")} />
      <input className={shell.input} placeholder="Unique RD requirement" value={form.uniqueRdRequirement} onChange={field("uniqueRdRequirement")} />
      <input className={shell.input} placeholder="Wager requirement" value={form.wagerRequirement} onChange={field("wagerRequirement")} />
      <input className={shell.input} placeholder="Validation timing" value={form.validationTiming} onChange={field("validationTiming")} />
      <input className={shell.input} placeholder="Fraud hold days" value={form.fraudHoldDays} onChange={field("fraudHoldDays")} />
      <textarea className={`${shell.input} min-h-24 py-3 xl:col-span-2`} placeholder="Baseline description" value={form.baselineDescription} onChange={field("baselineDescription")} />
      <textarea className={`${shell.input} min-h-24 py-3 xl:col-span-2`} placeholder="KPI fallback" value={form.kpiFallback} onChange={field("kpiFallback")} />
      <textarea className={`${shell.input} min-h-24 py-3 xl:col-span-2`} placeholder="Internal terms notes" value={form.notes} onChange={field("notes")} />
      <div className="flex items-end gap-2 xl:col-span-4">
        <button className={shell.button} disabled={busy}>Publish terms v{(old?.version ?? 0) + 1}</button>
        <button type="button" className={shell.secondary} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}