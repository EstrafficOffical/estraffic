"use client";

import { useEffect, useMemo, useState } from "react";

type ApprovedFlow = {
  accessId: string;
  approvedAt: string | null;
  brand: string;
  vertical: string;
  geo: string;
  flowId: string;
  flowName: string;
  trafficSource: string;
  approach: string | null;
  tier: number;
  targetUrl: string | null;
  trackingTemplate: string | null;
  terms: {
    version: number | null;
    affiliateCpa: string | null;
    currency: string;
    capFtd: number | null;
    minDeposit: string | null;
    validationTiming: string | null;
    fraudHoldDays: number | null;
  };
};

type Payload = {
  flows: ApprovedFlow[];
};

const card = "rounded-2xl border border-white/10 bg-[#0d0f14]";
const input =
  "h-11 rounded-xl border border-white/10 bg-[#090b10] px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#7357ff]/60";

function money(value: string | null, currency = "USD") {
  if (!value) return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(number);
}

export default function MyOffersPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    const response = await fetch("/api/nexus/affiliate/my-offers", {
      cache: "no-store",
    });
    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(json?.error || "Failed to load My Offers");
      setLoading(false);
      return;
    }

    setData(json);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return data?.flows ?? [];

    return (data?.flows ?? []).filter((flow) =>
      [
        flow.brand,
        flow.vertical,
        flow.geo,
        flow.flowName,
        flow.trafficSource,
        flow.approach ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [data, search]);

  return (
    <div className="min-h-screen bg-[#08090d] text-white">
      <div className="mx-auto w-full max-w-[1500px] px-6 py-10 lg:px-10">
        <div className="mb-8">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#8068ff]">
            Affiliate
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.04em]">My Offers</h1>
          <p className="mt-3 text-sm text-white/45">
            Approved NEXUS flows with the commercial terms version frozen at approval time.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-500/25 bg-red-500/[0.08] px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mb-6 grid gap-3 md:grid-cols-3">
          <Metric label="Approved flows" value={String(data?.flows.length ?? 0)} />
          <Metric
            label="Tracking ready"
            value={String((data?.flows ?? []).filter((flow) => flow.targetUrl || flow.trackingTemplate).length)}
          />
          <Metric label="Catalog source" value="Live DB" />
        </div>

        <div className={`${card} mb-5 p-4`}>
          <input
            className={`${input} w-full`}
            placeholder="Search approved brand, GEO, flow..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {loading ? (
          <div className={`${card} flex min-h-72 items-center justify-center text-sm text-white/40`}>
            Loading approved flows...
          </div>
        ) : filtered.length === 0 ? (
          <div className={`${card} flex min-h-72 flex-col items-center justify-center px-6 text-center`}>
            <div className="text-lg font-semibold">No approved offers yet</div>
            <div className="mt-2 max-w-lg text-sm leading-6 text-white/40">
              Request access from Offers. Once staff approves the request, the flow appears here automatically.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((flow) => (
              <article key={flow.accessId} className={`${card} overflow-hidden`}>
                <div className="grid gap-5 border-b border-white/8 p-5 xl:grid-cols-[1.2fr_1fr_auto] xl:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold">{flow.brand}</h2>
                      <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                        {flow.geo}
                      </span>
                      <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                        Tier {flow.tier}
                      </span>
                    </div>
                    <div className="mt-2 text-sm font-medium text-white/75">{flow.flowName}</div>
                    <div className="mt-1 text-xs text-white/35">
                      {flow.trafficSource}
                      {flow.approach ? ` / ${flow.approach}` : ""}
                      {" / "}
                      {flow.vertical}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
                      Approved commercial snapshot
                    </div>
                    <div className="mt-2 text-sm text-white/60">
                      Terms version {flow.terms.version ? `v${flow.terms.version}` : "-"}
                    </div>
                    <div className="mt-1 text-xs text-white/30">
                      Approved {flow.approvedAt ? new Date(flow.approvedAt).toLocaleString() : "-"}
                    </div>
                  </div>

                  <span className="inline-flex rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                    Approved
                  </span>
                </div>

                <div className="grid gap-px bg-white/[0.06] sm:grid-cols-2 xl:grid-cols-5">
                  <OfferMetric
                    label="Affiliate CPA"
                    value={money(flow.terms.affiliateCpa, flow.terms.currency)}
                  />
                  <OfferMetric
                    label="Cap FTD"
                    value={flow.terms.capFtd == null ? "-" : String(flow.terms.capFtd)}
                  />
                  <OfferMetric
                    label="Min deposit"
                    value={money(flow.terms.minDeposit, flow.terms.currency)}
                  />
                  <OfferMetric
                    label="Validation"
                    value={flow.terms.validationTiming || "-"}
                  />
                  <OfferMetric
                    label="Fraud hold"
                    value={flow.terms.fraudHoldDays == null ? "-" : `${flow.terms.fraudHoldDays} days`}
                  />
                </div>

                <div className="border-t border-white/8 px-5 py-4">
                  {flow.targetUrl || flow.trackingTemplate ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">Tracking configuration available</div>
                        <div className="mt-1 text-xs text-white/35">
                          Link generation will be wired to the NEXUS click-tracking endpoint in the next tracking step.
                        </div>
                      </div>
                      <span className="rounded-full border border-[#7357ff]/25 bg-[#7357ff]/10 px-3 py-1.5 text-xs font-semibold text-[#a291ff]">
                        Tracking ready
                      </span>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm font-semibold text-white/65">Tracking target not configured yet</div>
                      <div className="mt-1 text-xs text-white/30">
                        Staff can configure target URL / tracking template for this flow later.
                      </div>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${card} p-5`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">{label}</div>
      <div className="mt-3 text-3xl font-semibold">{value}</div>
    </div>
  );
}

function OfferMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0b0d12] px-4 py-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">{label}</div>
      <div className="mt-2 text-sm font-semibold text-white/80">{value}</div>
    </div>
  );
}