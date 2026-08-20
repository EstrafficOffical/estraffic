// src/app/[locale]/page.tsx
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AuthedHomeHeader from "@/app/components/AuthedHomeHeader";
import NexusLanding from "@/app/components/NexusLanding";

export const dynamic = "force-dynamic"; // важно для учёта сессии на Vercel

function HeroStar() {
  return (
    <svg
      className="pointer-events-none absolute right-[-10%] top-[-10%] w-[40%] opacity-80"
      viewBox="0 0 400 400"
      aria-hidden
    >
      <defs>
        <linearGradient id="est-star" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <path
        d="M200 20l-38 118H40l98 70-38 118 100-70 100 70-38-118 98-70H238z"
        fill="url(#est-star)"
      />
    </svg>
  );
}

function fmtMoney(n: number | null | undefined, currency = "USD") {
  const v = Number(n || 0);
  try {
    return new Intl.NumberFormat("ru-RU", { style: "currency", currency }).format(v);
  } catch {
    return `$${v.toFixed(2)}`;
  }
}

function fmtInt(n: number | null | undefined) {
  return new Intl.NumberFormat("ru-RU").format(n || 0);
}

export default async function HomePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const session = await auth();

  // ───────────────────────────────────────────────────────
  // ГОСТЬ: NEXUS ALLIANCE marketing landing
  // ───────────────────────────────────────────────────────
  if (!session) {
    return <NexusLanding locale={locale} />;
  }

  // ───────────────────────────────────────────────────────
  // АВТОРИЗОВАННЫЙ: реальные данные пользователя
  // ───────────────────────────────────────────────────────
  const userId = session.user.id;

  // границы периодов (UTC)
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start7 = new Date(now);
  start7.setUTCDate(start7.getUTCDate() - 7);
  const start30 = new Date(now);
  start30.setUTCDate(start30.getUTCDate() - 30);

  const [
    clicksToday,
    convsToday,
    revenueTodayAgg,
    revenue7Agg,
    revenue30Agg,
    latestPayout,
    topOffersGroup,
    recentOffers,
  ] = await Promise.all([
    prisma.click.count({ where: { userId, createdAt: { gte: startOfToday } } }),
    prisma.conversion.count({ where: { userId, createdAt: { gte: startOfToday } } }),
    prisma.conversion.aggregate({
      where: { userId, createdAt: { gte: startOfToday } },
      _sum: { amount: true },
    }),
    prisma.conversion.aggregate({
      where: { userId, createdAt: { gte: start7 } },
      _sum: { amount: true },
    }),
    prisma.conversion.aggregate({
      where: { userId, createdAt: { gte: start30 } },
      _sum: { amount: true },
    }),
    prisma.payout.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.conversion.groupBy({
      by: ["offerId"],
      where: { userId, createdAt: { gte: start30 } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    }),
    prisma.offer.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, title: true, vertical: true, geo: true },
    }),
  ]);

  const offerIds = topOffersGroup.map((g) => g.offerId);
  const offerMap = offerIds.length
    ? Object.fromEntries(
        (
          await prisma.offer.findMany({
            where: { id: { in: offerIds } },
            select: { id: true, title: true, vertical: true, geo: true },
          })
        ).map((o) => [o.id, o])
      )
    : {};

  const revenueToday = Number(revenueTodayAgg._sum.amount || 0);
  const revenue7 = Number(revenue7Agg._sum.amount || 0);
  const revenue30 = Number(revenue30Agg._sum.amount || 0);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 text-white/90">
      {/* выдвижное меню / хедер для залогиненных */}
      <AuthedHomeHeader
        locale={locale}
        displayName={session.user.name || (session.user.email ?? "Пользователь")}
      />

      {/* приветствие */}
      <section className="rounded-2xl border border-white/12 bg-white/5 p-6 shadow-[0_8px_40px_rgba(0,0,0,.45)]">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-extrabold">
              Привет, {session.user.name || session.user.email} 👋
            </h1>
            <p className="mt-1 text-white/70">Ваш быстрый обзор за сегодня и последние офферы.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/${locale}/offers`}
              className="rounded-2xl border-2 border-rose-500/80 px-5 py-2 font-semibold text-white shadow-[0_0_0_2px_rgba(255,0,90,.25),0_0_18px_rgba(255,0,90,.45)] hover:bg-rose-500/10"
            >
              Каталог офферов
            </Link>
            <Link
              href={`/${locale}/profile`}
              className="rounded-2xl border-2 border-slate-300/70 px-5 py-2 font-semibold text-white/90 shadow-[0_0_0_2px_rgba(148,163,184,.25),0_0_18px_rgba(148,163,184,.45)] hover:bg-white/10"
            >
              Профиль
            </Link>
          </div>
        </div>
      </section>

      {/* метрики сегодня / 7 / 30 */}
      <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-white/12 bg-white/5 p-5">
          <div className="text-xs uppercase tracking-wide text-white/60">Доход сегодня</div>
          <div className="mt-1 text-2xl font-extrabold">{fmtMoney(revenueToday)}</div>
        </div>
        <div className="rounded-2xl border border-white/12 bg-white/5 p-5">
          <div className="text-xs uppercase tracking-wide text-white/60">Клики сегодня</div>
          <div className="mt-1 text-2xl font-extrabold">{fmtInt(clicksToday)}</div>
        </div>
        <div className="rounded-2xl border border-white/12 bg-white/5 p-5">
          <div className="text-xs uppercase tracking-wide text-white/60">Конверсии сегодня</div>
          <div className="mt-1 text-2xl font-extrabold">{fmtInt(convsToday)}</div>
        </div>
        <div className="rounded-2xl border border-white/12 bg-white/5 p-5">
          <div className="text-xs uppercase tracking-wide text-white/60">Доход 7/30</div>
          <div className="mt-1 text-lg font-semibold">
            {fmtMoney(revenue7)} <span className="text-white/50">/</span> {fmtMoney(revenue30)}
          </div>
        </div>
      </section>

      {/* топ-офферы и финансы */}
      <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Топ по доходу */}
        <div className="rounded-2xl border border-white/12 bg-white/5 p-5">
          <div className="text-sm text-white/70">Топ офферы (доход, 30 дней)</div>
          <ul className="mt-3 space-y-2">
            {topOffersGroup.length === 0 && (
              <li className="text-sm text-white/60">Пока нет конверсий за период.</li>
            )}
            {topOffersGroup.map((g) => {
              const o = offerMap[g.offerId];
              const title = o?.title || g.offerId;
              const meta = [o?.vertical, o?.geo].filter(Boolean).join(" • ");
              return (
                <li
                  key={g.offerId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{title}</div>
                    {meta && <div className="truncate text-xs text-white/60">{meta}</div>}
                  </div>
                  <div className="shrink-0 font-semibold">
                    {fmtMoney(Number(g._sum.amount || 0))}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Новые офферы */}
        <div className="rounded-2xl border border-white/12 bg-white/5 p-5">
          <div className="text-sm text-white/70">Новые офферы</div>
          <ul className="mt-3 space-y-2">
            {recentOffers.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{o.title}</div>
                  <div className="truncate text-xs text-white/60">
                    {[o.vertical, o.geo].filter(Boolean).join(" • ")}
                  </div>
                </div>
                <Link
                  href={`/${locale}/offers`}
                  className="rounded-xl border border-rose-500/40 bg-rose-500/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
                >
                  Открыть
                </Link>
              </li>
            ))}
            {recentOffers.length === 0 && <li className="text-sm text-white/60">Пока пусто.</li>}
          </ul>
        </div>

        {/* Финансы */}
        <div className="rounded-2xl border border-white/12 bg-white/5 p-5">
          <div className="text-sm text-white/70">Финансы</div>
          <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-xs text-white/60">Последняя выплата</div>
            {latestPayout ? (
              <>
                <div className="mt-1 text-xl font-extrabold">
                  {fmtMoney(Number(latestPayout.amount), latestPayout.currency || "USD")}
                </div>
                <div className="text-xs text-white/60">
                  {new Date(latestPayout.createdAt).toLocaleDateString("ru-RU")} •{" "}
                  {latestPayout.status}
                </div>
              </>
            ) : (
              <div className="text-sm text-white/60">Ещё не было выплат.</div>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <Link
              href={`/${locale}/profile`}
              className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
            >
              Реквизиты
            </Link>
            <Link
              href={`/${locale}/offers`}
              className="rounded-xl border border-rose-500/40 bg-rose-500/90 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
            >
              К офферам
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
