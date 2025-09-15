"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import NavDrawer from "./NavDrawer";

/* Иконки (микро-SVG) */
const Icon = {
  star: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2l2.6 6.9H22l-5.4 3.9 2.1 6.8L12 16.7 5.3 19.6 7.4 12.8 2 8.9h7.4L12 2z"
      />
    </svg>
  ),
  wallet: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
      <path
        fill="currentColor"
        d="M21 7H4a2 2 0 00-2 2v7a2 2 0 002 2h17a1 1 0 001-1V8a1 1 0 00-1-1zm-2 6h-4a1 1 0 010-2h4a1 1 0 010 2zM5 5h13v2H5z"
      />
    </svg>
  ),
  news: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
      <path
        fill="currentColor"
        d="M4 4h13v13H4zM19 7h2v10a2 2 0 01-2 2H6v-2h13z"
      />
    </svg>
  ),
};

/* Мягкая звезда-водяной знак */
function StarWatermark() {
  return (
    <svg
      className="pointer-events-none absolute right-[-6%] top-[16%] w-[38%]"
      viewBox="0 0 400 400"
      aria-hidden
    >
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path
        d="M200 20l-38 118H40l98 70-38 118 100-70 100 70-38-118 98-70H238z"
        fill="url(#g)"
        opacity={0.7}
      />
    </svg>
  );
}

const Divider = () => <div className="h-px w-full bg-white/10" />;

export default function DashboardHome() {
  const [menuOpen, setMenuOpen] = useState(false);

  // locale-aware base
  const pathname = usePathname();
  const locale = (pathname?.split("/")?.[1] || "ru") as string;
  const base = `/${locale}`;

  // период
  const [from, setFrom] = useState<string>(() =>
    new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10)
  );
  const [to, setTo] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );

  // данные
  const [kpi, setKpi] = useState<{
    revenue: number;
    clicks: number;
    conversions: number;
  }>({
    revenue: 0,
    clicks: 0,
    conversions: 0,
  });
  const [payouts, setPayouts] = useState<
    Array<{
      date: string;
      amount: number;
      currency: string;
      status: string;
      wallet: string;
    }>
  >([]);
  const [offers, setOffers] = useState<
    Array<{ title: string; payout: number; geo: string; status: string }>
  >([]);
  const [news, setNews] = useState<Array<{ title: string; date: string }>>([]);

  // устойчивый fetch
  useEffect(() => {
    (async () => {
      try {
        const [kpiRes, payRes, offRes, newsRes] = await Promise.all([
          fetch(`/api/stats/summary?from=${from}&to=${to}`),
          fetch("/api/payouts/recent"),
          fetch("/api/offers/top"),
          fetch("/api/news/list"),
        ]);

        setKpi(
          kpiRes.ok
            ? await kpiRes.json()
            : { revenue: 0, clicks: 0, conversions: 0 }
        );
        setPayouts(payRes.ok ? await payRes.json() : []);
        setOffers(offRes.ok ? await offRes.json() : []);
        setNews(newsRes.ok ? await newsRes.json() : []);
      } catch (e) {
        console.error("load error:", e);
        setKpi({ revenue: 0, clicks: 0, conversions: 0 });
        setPayouts([]);
        setOffers([]);
        setNews([]);
      }
    })();
  }, [from, to]);

  const EPC = kpi.clicks ? kpi.revenue / kpi.clicks : 0;
  const CR = kpi.clicks ? (kpi.conversions / kpi.clicks) * 100 : 0;

  return (
    <section className="relative max-w-7xl mx-auto px-4 space-y-10">
      <StarWatermark />

      {/* HERO */}
      <div className="relative pt-10 md:pt-14">
        {/* Кнопка-звезда = открывает меню */}
        <div className="flex items-center gap-2 text-xl font-semibold mb-6">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Открыть меню навигации"
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl
                       bg-white/20 text-zinc-900 border border-white/40
                       shadow-[0_2px_12px_rgba(0,0,0,0.25)] backdrop-blur-sm
                       hover:bg-white/30 transition"
            title="Меню"
          >
            <Icon.star />
          </button>
          <span className="font-semibold text-lg">Estrella</span>
        </div>

        <h1 className="text-6xl font-extrabold tracking-tight">
          Estrella Traffic
        </h1>
        <p className="mt-3 text-lg text-white/85 leading-snug max-w-3xl">
          Надёжный партнёр в управлении трафиком
        </p>
        <p className="mt-2 max-w-3xl text-sm text-white/65">
          Мы помогаем брендам расти и достигать аудиторию быстрее и эффективнее
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`${base}/offers`}
            className="rounded-2xl px-4 py-2 text-sm font-medium bg-white/90 text-zinc-900"
          >
            Все офферы
          </Link>
          <Link
            href={`${base}/payouts`}
            className="rounded-2xl px-4 py-2 text-sm font-medium border border-white/30 text-white/90"
          >
            Выплаты
          </Link>
          <Link
            href={`${base}/wallet`}
            className="rounded-2xl px-4 py-2 text-sm font-medium border border-white/30 text-white/90"
          >
            Кошельки
          </Link>
        </div>
      </div>

      {/* Фильтр дат */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-xs text-white/60 mb-1">От</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-xl border border-white/20 bg-white/10 text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>
        <div>
          <label className="block text-xs text-white/60 mb-1">До</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-xl border border-white/20 bg-white/10 text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>
      </div>

      <Divider />

      {/* KPI расширенные */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-white/60">
            Доход (период)
          </div>
          <div className="text-3xl font-semibold mt-1">
            ${kpi.revenue.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-white/60">
            Клики
          </div>
          <div className="text-3xl font-semibold mt-1">
            {kpi.clicks.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-white/60">
            Конверсии
          </div>
          <div className="text-3xl font-semibold mt-1">
            {kpi.conversions.toLocaleString()}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-white/60">
              EPC
            </div>
            <div className="text-2xl font-semibold mt-1">
              ${EPC.toFixed(3)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-white/60">
              CR
            </div>
            <div className="text-2xl font-semibold mt-1">
              {CR.toFixed(2)}%
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* Основные колонки */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Топ офферы */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-medium">
            <Icon.star /> Топ офферы
          </div>
          {offers.length ? (
            <ul className="space-y-2">
              {offers.map((o, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate pr-3">{o.title}</span>
                  <span className="text-white/70">
                    {o.geo || "—"} • ${o.payout}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-white/55">Нет данных</div>
          )}
          <Link
            href={`${base}/offers`}
            className="text-sm text-white/70 hover:text-white/90"
          >
            Смотреть все офферы →
          </Link>
        </div>

        {/* Последние выплаты */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-medium">
            <Icon.wallet /> Последние выплаты
          </div>
          {payouts.length ? (
            <ul className="space-y-2">
              {payouts.map((p, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-white/80">{p.date}</span>
                  <span className="text-white/80">
                    ${p.amount.toLocaleString()} {p.currency}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-white/55">Пока пусто</div>
          )}

          <div className="pt-2 flex flex-wrap gap-2">
            <Link
              href={`${base}/payouts`}
              className="rounded-xl border border-white/25 px-3 py-1.5 text-xs text-white/90 hover:bg-white/10"
            >
              Запросить выплату
            </Link>
            <Link
              href={`${base}/wallet`}
              className="rounded-xl border border-white/25 px-3 py-1.5 text-xs text-white/90 hover:bg-white/10"
            >
              Управлять кошельками
            </Link>
          </div>
        </div>

        {/* Новости + полезное */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-medium">
            <Icon.news /> Новости
          </div>
          {news.length ? (
            <ul className="space-y-2">
              {news.map((n, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate pr-3">{n.title}</span>
                  <span className="text-xs text-white/55">{n.date}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-white/55">Новостей нет</div>
          )}

          <div className="pt-2">
            <div className="text-xs uppercase tracking-wider text-white/60 mb-2">
              Полезное
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`${base}/settings`}
                className="rounded-xl border border-white/25 px-3 py-1.5 text-xs text-white/90 hover:bg-white/10"
              >
                Настройки
              </Link>
              <Link
                href={`${base}/offers`}
                className="rounded-xl border border-white/25 px-3 py-1.5 text-xs text-white/90 hover:bg-white/10"
              >
                Каталог офферов
              </Link>
              <Link
                href={`${base}/payouts`}
                className="rounded-xl border border-white/25 px-3 py-1.5 text-xs text-white/90 hover:bg-white/10"
              >
                История выплат
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Drawer навигации */}
      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </section>
  );
}
