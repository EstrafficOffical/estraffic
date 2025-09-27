"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

// уже существующие компоненты
import NavToggle from "@/app/components/NavToggle";
import NavDrawer from "@/app/components/NavDrawer";

/** Мягкая «звёздочка» на фоне (водяной знак) */
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

export default function HomePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session } = useSession();
  const user = session?.user;
  const isAuthed = Boolean(user);
  const isAdmin = user?.role === "ADMIN";

  return (
    <main className="relative mx-auto max-w-7xl px-4 py-8 text-white">
      {/* шапка */}
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <NavToggle onClick={() => setMenuOpen(true)} />
          <span className="text-lg font-semibold">Estrella</span>
        </div>

        {/* правые кнопки шапки: гостям — Войти/Регистрация, юзерам — Профиль/Выйти */}
        <div className="hidden gap-2 sm:flex">
          {!isAuthed ? (
            <>
              <Link
                href={`/${locale}/login`}
                className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
              >
                Войти
              </Link>
              <Link
                href={`/${locale}/register`}
                className="rounded-xl border border-rose-500/40 bg-rose-500/90 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
              >
                Регистрация
              </Link>
            </>
          ) : (
            <>
              <Link
                href={`/${locale}/profile`}
                className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
              >
                Профиль
              </Link>
              <a
                href={`/api/auth/signout?callbackUrl=/${locale}`}
                className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
              >
                Выйти
              </a>
            </>
          )}
        </div>
      </header>

      {/* СЦЕНАРИЙ 1: ГОСТЬ — маркетинговая главная */}
      {!isAuthed && (
        <>
          {/* hero-блок */}
          <section className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/5 px-6 py-10 backdrop-blur-md">
            <HeroStar />

            <div className="relative z-10 max-w-2xl">
              <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
                Платформа для аффилиатов: клики, конверсии, выплаты — в одном месте
              </h1>
              <p className="mt-3 text-white/70">
                Отслеживайте трафик и доход, подавайте заявки на офферы и получайте
                выплаты. Чистый интерфейс, понятные метрики и быстрый саппорт.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/${locale}/register`}
                  className="rounded-xl border border-rose-500/40 bg-rose-500/90 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-500"
                >
                  Начать бесплатно
                </Link>
                <Link
                  href={`/${locale}/login`}
                  className="rounded-xl border border-white/15 bg-white/10 px-5 py-2.5 text-sm hover:bg-white/15"
                >
                  Войти
                </Link>
              </div>
            </div>
          </section>

          {/* ключевые преимущества */}
          <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-md">
              <div className="text-sm text-white/70">Офферы</div>
              <div className="mt-1 text-lg font-semibold">Доступ по запросу</div>
              <p className="mt-2 text-sm text-white/60">
                Выбирайте вертикали и гео, отправляйте заявку и работайте только с тем,
                что действительно вам подходит.
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-md">
              <div className="text-sm text-white/70">Аналитика</div>
              <div className="mt-1 text-lg font-semibold">Клики, конверсии, выручка</div>
              <p className="mt-2 text-sm text-white/60">
                Ежедневные серии, EPC и CR по источникам и офферам — всё наглядно и быстро.
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-md">
              <div className="text-sm text-white/70">Выплаты</div>
              <div className="mt-1 text-lg font-semibold">Кошельки и история</div>
              <p className="mt-2 text-sm text-white/60">
                Поддержка нескольких реквизитов, отметка primary и прозрачная история выплат.
              </p>
            </div>
          </section>

          {/* как это работает — 3 шага */}
          <section className="mt-8 rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur-md">
            <h2 className="text-xl font-semibold">Как это работает</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-sm font-medium">1. Регистрация</div>
                <p className="mt-1 text-sm text-white/60">
                  Создайте аккаунт и заполните профиль — это займёт пару минут.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-sm font-medium">2. Доступ к офферам</div>
                <p className="mt-1 text-sm text-white/60">
                  Отправьте запрос на нужные офферы и начните лить трафик.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-sm font-medium">3. Аналитика и выплаты</div>
                <p className="mt-1 text-sm text-white/60">
                  Следите за KPI в кабинете и получайте выплаты на удобные кошельки.
                </p>
              </div>
            </div>
          </section>

          {/* призыв внизу */}
          <section className="mt-8 flex items-center justify-between rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur-md">
            <div>
              <div className="text-lg font-semibold">Готовы начать?</div>
              <div className="text-sm text-white/70">
                Регистрация бесплатна. Закроем доступ к лишнему — покажем только нужное.
              </div>
            </div>
            <Link
              href={`/${locale}/register`}
              className="rounded-xl border border-rose-500/40 bg-rose-500/90 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-500"
            >
              Зарегистрироваться
            </Link>
          </section>
        </>
      )}

      {/* СЦЕНАРИЙ 2: ЗАЛОГИНЕН — домашняя */}
      {isAuthed && (
        <>
          {/* hero для юзера */}
          <section className="rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur-md">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="text-3xl font-extrabold">
                  Привет, {user?.name || user?.email} 👋
                </h1>
                <p className="mt-1 text-white/70">
                  Быстрый доступ к разделам и последним действиям.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/${locale}/offers`}
                  className="rounded-2xl border border-rose-500/40 bg-rose-500/90 px-5 py-2 font-semibold text-white hover:bg-rose-500"
                >
                  Перейти к офферам
                </Link>
                <Link
                  href={`/${locale}/profile`}
                  className="rounded-2xl border border-white/15 bg-white/10 px-5 py-2 font-semibold text-white/90 hover:bg-white/15"
                >
                  Профиль
                </Link>
                <a
                  href={`/api/auth/signout?callbackUrl=/${locale}`}
                  className="rounded-2xl border border-white/15 bg-white/10 px-5 py-2 font-semibold text-white/90 hover:bg-white/15"
                >
                  Выйти
                </a>
              </div>
            </div>
          </section>

          {/* быстрые карточки */}
          <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Link
              href={`/${locale}/offers`}
              className="rounded-2xl border border-white/15 bg-white/5 p-5 hover:bg-white/10"
            >
              <div className="text-sm text-white/70">Работа</div>
              <div className="mt-1 text-lg font-semibold">Каталог офферов</div>
              <p className="mt-2 text-sm text-white/60">
                Просматривайте доступные офферы и отправляйте запросы.
              </p>
            </Link>

            <Link
              href={`/${locale}/profile`}
              className="rounded-2xl border border-white/15 bg-white/5 p-5 hover:bg-white/10"
            >
              <div className="text-sm text-white/70">Аккаунт</div>
              <div className="mt-1 text-lg font-semibold">Профиль и кошельки</div>
              <p className="mt-2 text-sm text-white/60">
                Обновляйте имя, Telegram и реквизиты для выплат.
              </p>
            </Link>

            <Link
              href={`/${locale}/offers`}
              className="rounded-2xl border border-white/15 bg-white/5 p-5 hover:bg-white/10"
            >
              <div className="text-sm text-white/70">Заявки</div>
              <div className="mt-1 text-lg font-semibold">Мои запросы на офферы</div>
              <p className="mt-2 text-sm text-white/60">
                Статусы заявок: PENDING / APPROVED / REJECTED.
              </p>
            </Link>
          </section>

          {/* админские карточки */}
          {isAdmin && (
            <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Link
                href={`/${locale}/admin/requests`}
                className="rounded-2xl border border-white/15 bg-white/5 p-5 hover:bg-white/10"
              >
                <div className="text-sm text-white/70">Админ</div>
                <div className="mt-1 text-lg font-semibold">Заявки на офферы</div>
                <p className="mt-2 text-sm text-white/60">
                  Просматривайте запросы пользователей и выдавайте доступ.
                </p>
              </Link>

              <Link
                href={`/${locale}/admin/users`}
                className="rounded-2xl border border-white/15 bg-white/5 p-5 hover:bg-white/10"
              >
                <div className="text-sm text-white/70">Админ</div>
                <div className="mt-1 text-lg font-semibold">Пользователи</div>
                <p className="mt-2 text-sm text-white/60">
                  Список пользователей, роли и статусы.
                </p>
              </Link>
            </section>
          )}
        </>
      )}

      {/* Drawer для кнопки меню */}
      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} locale={locale} />
    </main>
  );
}
