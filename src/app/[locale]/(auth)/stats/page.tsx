"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import NavDrawer from "@/app/components/NavDrawer";

/* Водяная звезда */
function StarWatermark() {
  return (
    <svg className="pointer-events-none absolute right-[-6%] top-[12%] w-[35%]" viewBox="0 0 400 400" aria-hidden>
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path d="M200 20l-38 118H40l98 70-38 118 100-70 100 70-38-118 98-70H238z" fill="url(#g)" opacity={0.75} />
    </svg>
  );
}
const Divider = () => <div className="h-px w-full bg-white/10" />;

function Card({ title, actions, children }: { title?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/8 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.45)]">
      {(title || actions) && (
        <div className="px-4 sm:px-5 py-3 flex items-center justify-between">
          <div className="text-sm font-medium text-white/90">{title}</div>
          {actions}
        </div>
      )}
      <div className={`${title || actions ? "px-4 sm:px-5 pb-4 pt-2" : "p-4 sm:p-5"}`}>{children}</div>
    </div>
  );
}

/* Линейный график (SVG) */
function LineChart({ points }: { points: number[] }) {
  const w = 560, h = 160, p = 12;
  const d = useMemo(() => {
    if (!points.length) return "";
    const max = Math.max(...points), min = Math.min(...points);
    const span = Math.max(1, max - min);
    const stepX = (w - p * 2) / (points.length - 1 || 1);
    return points
      .map((v, i) => {
        const x = p + i * stepX;
        const y = p + (1 - (v - min) / span) * (h - p * 2);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }, [points]);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40">
      <defs>
        <linearGradient id="gl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke="url(#gl)" strokeWidth="2.5" />
    </svg>
  );
}

/* Пончик */
function Donut({ value, max = 100 }: { value: number; max?: number }) {
  const size = 132, stroke = 12, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-32 h-32">
      <circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,.15)" strokeWidth={stroke} fill="none" />
      <circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,.8)" strokeWidth={stroke} fill="none"
        strokeDasharray={`${c*pct} ${c - c*pct}`} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="fill-white/85 text-sm">
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}

type Row = { offer: string; clicks: number; regs: number; deposits: number };

export default function StatsPage() {
  /* Drawer */
  const [menuOpen, setMenuOpen] = useState(false);

  const pathname = usePathname();
  const locale = (pathname?.split("/")?.[1] || "ru") as string;
  const base = `/${locale}`;

  /* Дата/данные */
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [series, setSeries] = useState<number[]>([]);
  const [summary, setSummary] = useState({ clicks: 0, regs: 0, deposits: 0, goal: 500 });
  const [table, setTable] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [sumRes, serRes, tblRes] = await Promise.all([
          fetch(`/api/stats/summary?from=${from}&to=${to}`),
          fetch(`/api/stats/series?from=${from}&to=${to}`),
          fetch(`/api/stats/table?from=${from}&to=${to}`),
        ]);

        const sum = sumRes.ok ? await sumRes.json() : { clicks: 12340, conversions: 1207 };
        const ser = serRes.ok ? await serRes.json() : { points: [9, 4, 7, 8, 5, 9, 11, 7, 12, 13, 12, 14] };
        const tbl = tblRes.ok
          ? await tblRes.json()
          : {
              rows: Array.from({ length: 6 }).map((_, i) => ({
                offer: `Offer ${i + 1}`,
                clicks: 12000 + Math.round(Math.random() * 800),
                regs: 900 + Math.round(Math.random() * 400),
                deposits: 580,
              })),
            };

        setSummary({
          clicks: sum.clicks ?? 0,
          regs: sum.conversions ?? 0,
          deposits: (tbl.rows as Row[]).reduce((acc, r) => acc + r.deposits, 0),
          goal: 500,
        });
        setSeries(ser.points ?? []);
        setTable(tbl.rows ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [from, to]);

  return (
    <section className="relative max-w-7xl mx-auto px-4 lg:px-6 py-6 space-y-6">
      <StarWatermark />

      {/* HERO с кнопкой-⭐ для выдвижного меню */}
      <div className="relative pt-2">
        <div className="flex items-center gap-2 text-xl font-semibold mb-4">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Открыть меню"
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl
                       bg-white/20 text-zinc-900 border border-white/40
                       shadow-[0_2px_12px_rgba(0,0,0,0.25)] backdrop-blur-sm hover:bg-white/30 transition"
            title="Меню"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
              <path fill="currentColor" d="M12 2l2.6 6.9H22l-5.4 3.9 2.1 6.8L12 16.7 5.3 19.6 7.4 12.8 2 8.9h7.4L12 2z" />
            </svg>
          </button>
          <span className="font-semibold text-lg">Estrella</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Statistics</h1>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link href={`${base}/offers`} className="rounded-2xl px-4 py-2 text-sm font-medium bg-white/90 text-zinc-900">
            Все офферы
          </Link>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-xl border border-white/20 bg-white/10 text-white/90 text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-white/25"
            />
            <span className="text-white/40">—</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-xl border border-white/20 bg-white/10 text-white/90 text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-white/25"
            />
          </div>
        </div>
      </div>

      {/* График */}
      <Card>{loading ? <div className="h-40 animate-pulse rounded-xl bg-white/5" /> : <LineChart points={series} />}</Card>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="text-xs uppercase tracking-wider text-white/60 mb-1">Clicks</div>
          <div className="text-3xl font-semibold">{summary.clicks.toLocaleString()}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wider text-white/60 mb-1">Registrations</div>
          <div className="text-3xl font-semibold">{summary.regs.toLocaleString()}</div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-white/60 mb-1">Deposits</div>
              <div className="text-3xl font-semibold">{summary.deposits.toLocaleString()}</div>
            </div>
            <Donut value={Math.min(summary.deposits, summary.goal)} max={summary.goal} />
          </div>
        </Card>
      </div>

      {/* Столбики + цель */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Deposits">
          <div className="grid grid-cols-6 gap-2 items-end h-32">
            {[8, 12, 6, 10, 14, 16].map((v, i) => (
              <div key={i} className="rounded-md bg-white/70" style={{ height: `${v * 6}px` }} />
            ))}
          </div>
        </Card>

        <Card title="Goal">
          <div className="space-y-1">
            <div className="text-2xl font-semibold">{summary.goal}</div>
            <div className="text-white/50 text-sm">Monthly goal</div>
            <div className="mt-3 w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-white/80" style={{ width: `${Math.min(100, (summary.deposits / summary.goal) * 100)}%` }} />
            </div>
          </div>
        </Card>

        <Card title="Quick filters">
          <div className="flex flex-wrap gap-2">
            {["Today", "7d", "30d", "90d"].map((t) => (
              <button key={t} className="rounded-xl border border-white/20 px-3 py-1.5 text-sm text-white/85 hover:bg-white/10">
                {t}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Таблица */}
      <Card title="Performance by offer">
        <div className="overflow-x-auto">
          <table className="min-w-[620px] w-full text-sm">
            <thead className="text-white/60">
              <tr className="border-b border-white/10">
                <th className="text-left py-2 pr-3">Offer</th>
                <th className="text-right py-2 px-3">Clicks</th>
                <th className="text-right py-2 px-3">Registrations</th>
                <th className="text-right py-2 pl-3">Deposits</th>
              </tr>
            </thead>
            <tbody>
              {table.map((r, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-2 pr-3">{r.offer}</td>
                  <td className="py-2 px-3 text-right">{r.clicks.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right">{r.regs.toLocaleString()}</td>
                  <td className="py-2 pl-3 text-right">{r.deposits.toLocaleString()}</td>
                </tr>
              ))}
              {!table.length && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-white/60">
                    Нет данных за выбранный период
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Divider />

      {/* Drawer навигации */}
      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </section>
  );
}
