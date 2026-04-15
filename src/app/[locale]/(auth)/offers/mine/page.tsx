"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import NavDrawer from "@/app/components/NavDrawer";

type MyOffer = {
  id: string;
  title: string;
  tag?: string | null;
  tier: number;
  cpa: number | null;
  geo: string;
  vertical: string;
  mode: "Auto" | "Manual";
  cap?: number | null;
  minDeposit?: number | null;
  holdDays?: number | null;
  rules?: string | null;
  notes?: string | null;
  targetUrl?: string | null;
  kpi1?: any;
  kpi2?: any;
  kpi1Text?: string | null;
  kpi2Text?: string | null;
};

export default function MyOffersPage() {
  const pathname = usePathname();
  const locale = (pathname?.split("/")?.[1] || "ru") as string;

  const [menuOpen, setMenuOpen] = useState(false);
  const [rows, setRows] = useState<MyOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [subIdByOffer, setSubIdByOffer] = useState<Record<string, string>>({});
  const [linkByOffer, setLinkByOffer] = useState<Record<string, string | null>>({});
  const [buildingFor, setBuildingFor] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/offers/mine", { cache: "no-store" });
        const data = await res.json();
        if (!alive) return;
        setRows(Array.isArray(data) ? data : data.items ?? []);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      `${r.title} ${r.tag ?? ""} ${r.geo} ${r.vertical} ${r.kpi1Text ?? ""} ${r.kpi2Text ?? ""} ${r.rules ?? ""} ${r.notes ?? ""}`
        .toLowerCase()
        .includes(s)
    );
  }, [rows, q]);

  async function complete(offerId: string) {
    const r = await fetch("/api/offers/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offerId }),
    });

    const j = await r.json().catch(() => ({}));

    if (r.ok && j?.ok) {
      setRows((s) => s.filter((x) => x.id !== offerId));
      setLinkByOffer((prev) => {
        const next = { ...prev };
        delete next[offerId];
        return next;
      });
      setSubIdByOffer((prev) => {
        const next = { ...prev };
        delete next[offerId];
        return next;
      });
      if (expandedId === offerId) setExpandedId(null);
    } else {
      alert(j?.error ?? "Failed");
    }
  }

  async function buildLink(offerId: string) {
    try {
      setBuildingFor(offerId);

      const r = await fetch("/api/offers/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId,
          subId: subIdByOffer[offerId]?.trim() || null,
        }),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.link) {
        throw new Error(j?.error || "Failed to build link");
      }

      setLinkByOffer((prev) => ({ ...prev, [offerId]: j.link }));
    } catch (e: any) {
      alert(e?.message || "Failed to build link");
    } finally {
      setBuildingFor(null);
    }
  }

  async function copyLink(offerId: string) {
    const link = linkByOffer[offerId];
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
    } catch {
      alert("Не удалось скопировать ссылку");
    }
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  const fmtMoney = (n?: number | null) =>
    n == null ? "—" : `$${Number(n).toFixed(2)}`;

  const renderKpi = (textValue?: string | null, numValue?: any) => {
    if (textValue && String(textValue).trim()) return textValue;
    if (numValue !== null && numValue !== undefined && String(numValue) !== "") {
      return String(numValue);
    }
    return "—";
  };

  return (
    <section className="relative mx-auto max-w-7xl px-4 py-8 space-y-6 text-white/90">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open navigation"
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 border border-white/25 backdrop-blur-md"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white/90" aria-hidden>
            <path fill="currentColor" d="M12 2l2.6 6.9H22l-5.4 3.9 2.1 6.8L12 16.7 5.3 19.6 7.4 12.8 2 8.9h7.4L12 2z" />
          </svg>
        </button>
        <span className="font-semibold text-white text-lg">Estrella</span>
      </div>

      <div className="space-y-3">
        <h1 className="text-5xl font-extrabold tracking-tight">My offers</h1>
        <p className="max-w-3xl text-white/60 text-sm md:text-base">
          Здесь собраны все офферы, к которым у тебя уже есть доступ. Разворачивай карточку, смотри условия и сразу строй tracking link.
        </p>
      </div>

      <div className="relative">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search my offers by title, GEO, vertical, KPI, rules…"
          className="w-full rounded-3xl px-12 py-4 outline-none bg-white/5 text-white placeholder:text-white/40 border border-white/10 backdrop-blur-2xl focus:ring-2 focus:ring-white/15"
        />
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/50 text-lg">
          🔎
        </span>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white/60 backdrop-blur-xl">
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white/60 backdrop-blur-xl">
          No approved offers yet
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {filtered.map((r) => {
            const expanded = expandedId === r.id;
            const isBuilding = buildingFor === r.id;
            const currentLink = linkByOffer[r.id] ?? null;
            const currentSubId = subIdByOffer[r.id] ?? "";

            return (
              <article
                key={r.id}
                className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.06] shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur-2xl"
              >
                <div className="p-5 md:p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-2xl font-bold text-white">{r.title}</h2>
                          <StatusBadge tone="green">Approved</StatusBadge>
                          <StatusBadge tone="default">Tier {r.tier}</StatusBadge>
                          <StatusBadge tone={r.mode === "Auto" ? "blue" : "default"}>
                            {r.mode}
                          </StatusBadge>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/65">
                          <span>{r.geo}</span>
                          <span>•</span>
                          <span>{r.vertical}</span>
                          {r.tag ? (
                            <>
                              <span>•</span>
                              <span>#{r.tag}</span>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <div className="shrink-0">
                        <button
                          onClick={() => complete(r.id)}
                          className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15 transition"
                          title="Скрыть из «Мои офферы»"
                        >
                          Завершить
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      <MiniStat label="CPA / FTD" value={fmtMoney(r.cpa)} />
                      <MiniStat label="Cap" value={r.cap ?? "—"} />
                      <MiniStat label="Min deposit" value={fmtMoney(r.minDeposit)} />
                      <MiniStat label="Hold" value={r.holdDays != null ? `${r.holdDays} d` : "—"} />
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <InfoBox title="KPI 1" value={renderKpi(r.kpi1Text, r.kpi1)} />
                      <InfoBox title="KPI 2" value={renderKpi(r.kpi2Text, r.kpi2)} />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        onClick={() => toggleExpand(r.id)}
                        className="rounded-2xl border border-white/15 bg-white/8 px-4 py-2 text-sm text-white/90 hover:bg-white/12 transition"
                      >
                        {expanded ? "Скрыть детали" : "Подробнее"}
                      </button>

                      <span className="text-xs text-white/45">
                        Внутри: правила, заметки и генерация tracking link
                      </span>
                    </div>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-white/10 bg-black/10 px-5 pb-5 pt-5 md:px-6 md:pb-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <DetailCard
                        title="Основные условия"
                        rows={[
                          ["CPA / FTD", fmtMoney(r.cpa)],
                          ["Tier", `Tier ${r.tier}`],
                          ["Mode", r.mode],
                          ["Cap", r.cap ?? "—"],
                          ["Min deposit", fmtMoney(r.minDeposit)],
                          ["Hold days", r.holdDays != null ? `${r.holdDays}` : "—"],
                        ]}
                      />

                      <DetailCard
                        title="KPI / требования"
                        rows={[
                          ["KPI 1", renderKpi(r.kpi1Text, r.kpi1)],
                          ["KPI 2", renderKpi(r.kpi2Text, r.kpi2)],
                        ]}
                      />

                      <TextCard
                        title="Rules"
                        text={r.rules ?? "Пока не заполнено."}
                      />

                      <TextCard
                        title="Notes"
                        text={r.notes ?? "Пока не заполнено."}
                      />

                      <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <div className="text-sm font-semibold text-white">Tracking link</div>

                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
                          <input
                            placeholder="subId (optional)"
                            value={currentSubId}
                            onChange={(e) =>
                              setSubIdByOffer((prev) => ({
                                ...prev,
                                [r.id]: e.target.value,
                              }))
                            }
                            className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-white/15"
                          />

                          <button
                            onClick={() => buildLink(r.id)}
                            disabled={isBuilding}
                            className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white hover:bg-white/15 disabled:opacity-60"
                          >
                            {isBuilding ? "Building…" : "Build link"}
                          </button>

                          <button
                            onClick={() => copyLink(r.id)}
                            disabled={!currentLink}
                            className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white hover:bg-white/15 disabled:opacity-60"
                          >
                            Copy
                          </button>
                        </div>

                        {currentLink && (
                          <div className="mt-4 break-all rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/85">
                            {currentLink}
                          </div>
                        )}

                        <div className="mt-3 text-xs text-white/45">
                          Сгенерированная ссылка уже готова для запуска трафика.
                        </div>
                      </div>

                      <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <div className="text-sm font-semibold text-white">Target URL</div>
                        <div className="mt-3 break-all text-sm text-white/75">
                          {r.targetUrl ?? "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} locale={locale} />
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-white/45">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function InfoBox({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
      <div className="text-sm text-white/55">{title}</div>
      <div className="mt-1 text-sm leading-6 text-white/90">{value}</div>
    </div>
  );
}

function DetailCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, React.ReactNode]>;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="mt-3 space-y-2">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-start justify-between gap-3 border-b border-white/5 pb-2 last:border-b-0 last:pb-0"
          >
            <div className="text-sm text-white/50">{label}</div>
            <div className="text-right text-sm text-white/90">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TextCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/78">
        {text}
      </div>
    </div>
  );
}

function StatusBadge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "green" | "blue" | "orange";
}) {
  const map: Record<string, string> = {
    default: "bg-white/10 border-white/15 text-white/85",
    green: "bg-emerald-400/15 border-emerald-400/25 text-emerald-200",
    blue: "bg-sky-400/15 border-sky-400/25 text-sky-200",
    orange: "bg-amber-400/15 border-amber-400/25 text-amber-200",
  };

  return (
    <span className={`inline-flex items-center rounded-xl border px-3 py-1 text-xs font-medium ${map[tone]}`}>
      {children}
    </span>
  );
}