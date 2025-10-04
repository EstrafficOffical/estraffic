'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import NavDrawer from '@/app/components/NavDrawer';

type Summary = {
  clicks: number;
  conversions: number; // оставляем, но не показываем в KPI
  revenue: number;
  epc: number;
  cr: number; // доля (0..1)
};

type ByOfferRow = {
  offerId: string;
  title: string;
  tag?: string | null;
  clicks: number;
  conversions: number;
  revenue: number;
  epc: number;
  cr: number;
};

type BySourceRow = {
  source: string | null; // subId
  clicks: number;
  conversions: number;
  revenue: number;
  epc: number;
  cr: number;
};

type ByEventRow = {
  type: 'REG' | 'DEP' | 'REBILL' | 'SALE' | 'LEAD' | string;
  conversions: number;
  revenue: number;
};

type SeriesPoint = { day: string; clicks: number; conversions: number; revenue: number };

export default function StatsPage() {
  const pathname = usePathname();
  const locale = (pathname?.split('/')?.[1] || 'ru') as string;
  const [menuOpen, setMenuOpen] = useState(false);

  // период
  const [from, setFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // роль
  const [isAdmin, setIsAdmin] = useState(false);

  // данные
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [byOffer, setByOffer] = useState<ByOfferRow[]>([]);
  const [bySource, setBySource] = useState<BySourceRow[]>([]);
  const [byEvent, setByEvent] = useState<ByEventRow[]>([]);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  // узнаём роль (ADMIN?)
  useEffect(() => {
    (async () => {
      const s = await fetch('/api/auth/session', { cache: 'no-store' })
        .then(r => r.json())
        .catch(() => ({} as any));
      setIsAdmin(((s?.user as any)?.role === 'ADMIN'));
    })();
  }, []);

  // грузим статистику
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const qs = new URLSearchParams({
          from: new Date(from + 'T00:00:00Z').toISOString(),
          to: new Date(to + 'T23:59:59Z').toISOString(),
        }).toString();

        const [sRes, oRes, srcRes, eRes, tRes] = await Promise.all([
          fetch(`/api/stats/summary?${qs}`, { cache: 'no-store' }),
          fetch(`/api/stats/by-offer?${qs}`, { cache: 'no-store' }),
          fetch(`/api/stats/by-source?${qs}`, { cache: 'no-store' }),
          fetch(`/api/stats/by-event?${qs}`, { cache: 'no-store' }),
          fetch(`/api/stats/timeseries?${qs}`, { cache: 'no-store' }),
        ]);

        const sJson = await sRes.json().catch(() => null);
        const oJson = await oRes.json().catch(() => null);
        const srcJson = await srcRes.json().catch(() => null);
        const eJson = await eRes.json().catch(() => null);
        const tJson = await tRes.json().catch(() => null);

        if (!alive) return;

        setSummary(
          sRes.ok && sJson && typeof sJson === 'object'
            ? (sJson as Summary)
            : { clicks: 0, conversions: 0, revenue: 0, epc: 0, cr: 0 },
        );
        setByOffer(oRes.ok ? (Array.isArray(oJson?.items) ? oJson.items : (Array.isArray(oJson) ? oJson : [])) : []);
        setBySource(srcRes.ok ? (Array.isArray(srcJson?.items) ? srcJson.items : (Array.isArray(srcJson) ? srcJson : [])) : []);
        setByEvent(eRes.ok ? (Array.isArray(eJson?.items) ? eJson.items : (Array.isArray(eJson) ? eJson : [])) : []);
        setSeries(tRes.ok ? (Array.isArray(tJson?.series) ? tJson.series : (Array.isArray(tJson) ? tJson : [])) : []);
      } catch {
        if (alive) setError('Не удалось загрузить статистику');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [from, to]);

  const fmtMoney = (n: number) =>
    `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // извлекаем REG/DEP из byEvent
  const regCount = useMemo(
    () => (byEvent.find(e => e.type === 'REG')?.conversions ?? 0),
    [byEvent],
  );
  const depCount = useMemo(
    () => (byEvent.find(e => e.type === 'DEP')?.conversions ?? 0),
    [byEvent],
  );

  // KPI: для пользователя — Clicks, REG, DEP, CR; для админа добавляем Revenue/EPC
  const kpis = useMemo(() => {
    const s = summary || { clicks: 0, revenue: 0, epc: 0, cr: 0 };
    const items: { title: string; value: string }[] = [];

    if (isAdmin) {
      items.push({ title: 'Доход', value: fmtMoney(s.revenue ?? 0) });
      items.push({ title: 'EPC', value: fmtMoney(s.epc ?? 0) });
    }

    items.push(
      { title: 'Клики', value: (s.clicks ?? 0).toLocaleString() },
      { title: 'REG', value: regCount.toLocaleString() },
      { title: 'DEP', value: depCount.toLocaleString() },
      { title: 'CR', value: `${(((s.cr ?? 0) * 100) || 0).toFixed(2)}%` },
    );

    return items;
  }, [summary, regCount, depCount, isAdmin]);

  return (
    <section className="relative mx-auto max-w-7xl space-y-8 px-4 py-8 text-white/90">
      {/* шапка */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open navigation"
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 border border-white/40"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-white/80" aria-hidden>
            <path fill="currentColor" d="M12 2l2.6 6.9H22l-5.4 3.9 2.1 6.8L12 16.7 5.3 19.6 7.4 12.8 2 8.9h7.4L12 2z" />
          </svg>
        </button>
        <span className="font-semibold text-white">Estrella</span>
      </div>

      <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">Statistics</h1>

      {/* фильтры */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/15 bg-white/5 p-3">
          <label className="mb-1 block text-sm text-white/70">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-zinc-900 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-white/20"
          />
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/5 p-3">
          <label className="mb-1 block text-sm text-white/70">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-zinc-900 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-white/20"
          />
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/5 p-3">
          <label className="mb-1 block text-sm text-white/70">Status</label>
          <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white/70">
            {loading ? 'Загрузка…' : 'Готово'}
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-5 md:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.title} className="rounded-2xl border border-white/12 bg-white/5 px-4 py-3 backdrop-blur-md">
            <div className="text-sm text-white/75">{k.title}</div>
            <div className="mt-1 text-2xl font-semibold">{k.value}</div>
          </div>
        ))}
      </div>

      {/* By Offer */}
      <section className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-xl font-semibold">By Offer</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5 text-white/70">
              <tr className="text-left">
                <Th>Offer</Th><Th>Clicks</Th><Th>Conv</Th><Th>Revenue</Th><Th>EPC</Th><Th>CR</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr><td colSpan={6} className="p-6 text-white/60">Загрузка…</td></tr>
              ) : byOffer.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-white/60">Пусто</td></tr>
              ) : (
                byOffer.map((r) => (
                  <tr key={r.offerId}>
                    <Td>
                      <div className="flex flex-col">
                        <span className="font-medium">{r.title}</span>
                        <span className="text-xs text-white/50">{r.offerId}{r.tag ? ` · #${r.tag}` : ''}</span>
                      </div>
                    </Td>
                    <Td>{r.clicks}</Td>
                    <Td>{r.conversions}</Td>
                    <Td>{fmtMoney(r.revenue)}</Td>
                    <Td>{fmtMoney(r.epc)}</Td>
                    <Td>{((r.cr ?? 0) * 100).toFixed(2)}%</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* By Source */}
      <section className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-xl font-semibold">By Source (subId)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5 text-white/70">
              <tr className="text-left">
                <Th>Source</Th><Th>Clicks</Th><Th>Conv</Th><Th>Revenue</Th><Th>EPC</Th><Th>CR</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr><td colSpan={6} className="p-6 text-white/60">Загрузка…</td></tr>
              ) : bySource.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-white/60">Пусто</td></tr>
              ) : (
                bySource.map((r, i) => (
                  <tr key={(r.source ?? '') + i}>
                    <Td className="font-mono">{r.source ?? '—'}</Td>
                    <Td>{r.clicks}</Td>
                    <Td>{r.conversions}</Td>
                    <Td>{fmtMoney(r.revenue)}</Td>
                    <Td>{fmtMoney(r.epc)}</Td>
                    <Td>{((r.cr ?? 0) * 100).toFixed(2)}%</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* By Event (содержит REG/DEP детально) */}
      <section className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-xl font-semibold">By Event</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5 text-white/70">
              <tr className="text-left">
                <Th>Type</Th><Th>Conversions</Th><Th>Revenue</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr><td colSpan={3} className="p-6 text-white/60">Загрузка…</td></tr>
              ) : byEvent.length === 0 ? (
                <tr><td colSpan={3} className="p-6 text-white/60">Пусто</td></tr>
              ) : (
                byEvent.map((r) => (
                  <tr key={r.type}>
                    <Td><Badge>{r.type}</Badge></Td>
                    <Td>{r.conversions}</Td>
                    <Td>{fmtMoney(r.revenue)}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Timeseries */}
      <section className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-xl font-semibold">Timeseries (day)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5 text-white/70">
              <tr className="text-left">
                <Th>Day</Th><Th>Clicks</Th><Th>Conv</Th><Th>Revenue</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr><td colSpan={4} className="p-6 text-white/60">Загрузка…</td></tr>
              ) : series.length === 0 ? (
                <tr><td colSpan={4} className="p-6 text-white/60">Пусто</td></tr>
              ) : (
                series.map((p) => (
                  <tr key={p.day}>
                    <Td>{p.day}</Td>
                    <Td>{p.clicks}</Td>
                    <Td>{p.conversions}</Td>
                    <Td>{fmtMoney(p.revenue)}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-rose-100">{error}</div>
      )}

      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} locale={locale} />
    </section>
  );
}

/* ——— утилиты UI ——— */
function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-semibold">{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className ?? ''}`}>{children}</td>;
}
function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-xs">{children}</span>;
}
