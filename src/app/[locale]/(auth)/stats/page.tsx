"use client";

import { useEffect, useMemo, useState } from "react";

type Summary = {
  from: string | Date; to: string | Date;
  clicks: number; conversions: number; revenue: number; epc: number; cr: number;
};
type Point = { day: string; clicks: number; conversions: number; revenue: number };

type ByOfferItem = { offerId: string; title: string; tag: string | null;
  clicks: number; conversions: number; revenue: number; epc: number; cr: number; };
type ByEventItem = { type: string; conversions: number; revenue: number };
type BySourceItem = { source: string; clicks: number; conversions: number; revenue: number; epc: number; cr: number };

export default function StatsPage() {
  const [range, setRange] = useState<"7" | "30">("7");
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [series, setSeries] = useState<Point[]>([]);

  const [byOffer, setByOffer] = useState<ByOfferItem[]>([]);
  const [byEvent, setByEvent] = useState<ByEventItem[]>([]);
  const [bySource, setBySource] = useState<BySourceItem[]>([]);

  const { fromISO, toISO } = useMemo(() => {
    const to = new Date();
    const days = range === "7" ? 7 : 30;
    const from = new Date(to.getTime() - days * 24 * 3600 * 1000);
    return { fromISO: from.toISOString(), toISO: to.toISOString() };
  }, [range]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [s1, s2, s3, s4, s5] = await Promise.all([
          fetch(`/api/stats/summary?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}`).then(r => r.json()),
          fetch(`/api/stats/timeseries?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}`).then(r => r.json()),
          fetch(`/api/stats/by-offer?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}`).then(r => r.json()),
          fetch(`/api/stats/by-event?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}`).then(r => r.json()),
          fetch(`/api/stats/by-source?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}&limit=50`).then(r => r.json()),
        ]);
        if (!alive) return;
        setSummary(s1);
        setSeries(s2.series || []);
        setByOffer(s3.items || []);
        setByEvent(s4.items || []);
        setBySource(s5.items || []);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [fromISO, toISO]);

  return (
    <div className="p-4 text-white space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Статистика</h1>
        <div className="flex gap-2">
          <Btn onClick={() => setRange("7")} active={range==="7"}>7 дней</Btn>
          <Btn onClick={() => setRange("30")} active={range==="30"}>30 дней</Btn>
        </div>
      </div>

      {/* Карточки */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Metric title="Клики" value={summary?.clicks ?? 0} loading={loading} />
        <Metric title="Конверсии" value={summary?.conversions ?? 0} loading={loading} />
        <Metric title="Доход" value={(summary?.revenue ?? 0).toFixed(2)} loading={loading} />
        <Metric title="EPC" value={(summary?.epc ?? 0).toFixed(4)} loading={loading} />
        <Metric title="CR" value={`${(((summary?.cr ?? 0) * 100)).toFixed(2)}%`} loading={loading} />
      </div>

      {/* Ряд по дням (простая таблица) */}
      <Section title="Динамика по дням">
        <Table
          header={["День","Клики","Конверсии","Доход"]}
          rows={series.map(p => [p.day, p.clicks, p.conversions, p.revenue.toFixed(2)])}
          loading={loading}
        />
      </Section>

      {/* Разрезы */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Топ офферов">
          <Table
            header={["Оффер","Клики","Конверсии","Доход","EPC","CR"]}
            rows={byOffer.map(o => [
              o.title || o.offerId,
              o.clicks,
              o.conversions,
              o.revenue.toFixed(2),
              o.epc.toFixed(4),
              `${(o.cr*100).toFixed(2)}%`,
            ])}
            loading={loading}
          />
        </Section>

        <Section title="Типы событий">
          <Table
            header={["Событие","Конверсии","Доход"]}
            rows={byEvent.map(e => [e.type, e.conversions, e.revenue.toFixed(2)])}
            loading={loading}
          />
        </Section>
      </div>

      <Section title="Источники (sub1)">
        <Table
          header={["Источник","Клики","Конверсии","Доход","EPC","CR"]}
          rows={bySource.map(s => [
            s.source,
            s.clicks,
            s.conversions,
            s.revenue.toFixed(2),
            s.epc.toFixed(4),
            `${(s.cr*100).toFixed(2)}%`,
          ])}
          loading={loading}
        />
      </Section>
    </div>
  );
}

function Btn({ active, children, ...props }: any) {
  return (
    <button
      {...props}
      className={`rounded-xl border px-3 py-1.5 ${active ? "border-white/60 bg-white/10" : "border-white/20 hover:bg-white/10"}`}
    >
      {children}
    </button>
  );
}

function Metric({ title, value, loading }: { title: string; value: any; loading: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 p-4 bg-white/5">
      <div className="text-xs text-white/60 mb-1">{title}</div>
      <div className="text-lg font-semibold">{loading ? "…" : value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-medium text-white/90 mb-2">{title}</div>
      {children}
    </div>
  );
}

function Table({
  header,
  rows,
  loading,
}: {
  header: string[];
  rows: (string | number)[][];
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-white/5">
          <tr>{header.map(h => <th key={h} className="text-left px-3 py-2">{h}</th>)}</tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td className="px-3 py-6 text-center text-white/60" colSpan={header.length}>Загрузка…</td></tr>
          ) : rows.length === 0 ? (
            <tr><td className="px-3 py-6 text-center text-white/60" colSpan={header.length}>Нет данных</td></tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i} className="border-t border-white/10">
                {r.map((c, j) => <td key={j} className="px-3 py-2">{c}</td>)}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
