"use client";

import Badge from "./OfferBadge";

export type OfferRow = {
  id: string;
  name: string;
  tag?: string;
  cpa: number;
  geo: string;
  vertical: string;
  kpi1: number;
  kpi2: number;
  mode: "Auto" | "Manual";
};

export default function OffersTable({ rows, loading }: { rows: OfferRow[]; loading?: boolean }) {
  const toneForTag = (t?: string) => {
    if (!t) return "default" as const;
    const x = t.toLowerCase();
    if (x.includes("exclusive")) return "pink" as const;
    if (x.includes("high"))      return "blue" as const;
    if (x.includes("trend"))     return "orange" as const;
    if (x.includes("white"))     return "green" as const;
    if (x.includes("auto"))      return "blue" as const;
    return "default" as const;
  };

  return (
    <div className="rounded-2xl bg-white/8 border border-white/15 backdrop-blur-xl overflow-hidden">
      {/* шапка таблицы */}
      <div className="grid grid-cols-12 px-4 py-3 text-sm text-white/60">
        <div className="col-span-4">Offer</div>
        <div className="col-span-2">CPA</div>
        <div className="col-span-1">GEO</div>
        <div className="col-span-2">Vertical</div>
        <div className="col-span-1">KPI</div>
        <div className="col-span-1">KPI</div>
        <div className="col-span-1 text-right pr-1">Mode</div>
      </div>

      <div className="divide-y divide-white/10">
        {loading && <div className="px-4 py-6 text-white/50">Loading…</div>}
        {!loading && rows.length === 0 && <div className="px-4 py-6 text-white/50">No offers yet</div>}

        {rows.map((r) => (
          <div key={r.id} className="grid grid-cols-12 px-4 py-3 hover:bg-white/5">
            <div className="col-span-4 flex flex-col gap-1">
              <div className="font-semibold">{r.name}</div>
              {r.tag && (
                <div className="text-xs text-white/75">
                  <Badge tone={toneForTag(r.tag)}>{r.tag}</Badge>
                </div>
              )}
            </div>

            <div className="col-span-2 flex items-center">
              {r.cpa ? <Badge tone="blue">${r.cpa.toFixed(2)}</Badge> : <Badge>—</Badge>}
            </div>

            <div className="col-span-1 flex items-center">{r.geo}</div>
            <div className="col-span-2 flex items-center truncate" title={r.vertical}>{r.vertical}</div>
            <div className="col-span-1 flex items-center">${r.kpi1.toFixed(2)}</div>
            <div className="col-span-1 flex items-center">{r.kpi2.toFixed(2)}</div>

            <div className="col-span-1 flex items-center justify-end pr-1">
              <Badge tone={r.mode === "Auto" ? "blue" : "default"}>{r.mode}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
