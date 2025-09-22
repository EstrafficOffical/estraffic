"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NavDrawer from "@/app/components/NavDrawer";

// Пропсы, которые получаем с серверной страницы
type Props = {
  locale: string;
  sessionUser: ({
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
    status?: string | null;
  }) | null;
};

export default function DashboardHome({ locale, sessionUser }: Props) {
  // для выдвижного меню (та же логика, что на Statistics)
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isAuthed = Boolean(sessionUser?.id);

  return (
    <section className="relative mx-auto max-w-7xl space-y-8 px-4 py-8">
      {/* Шапка как на Statistics: квадрат со ⭐ + Estrella + кнопка-меню */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open navigation"
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 border border-white/40"
          title="Меню"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-white/80" aria-hidden>
            <path
              fill="currentColor"
              d="M12 2l2.6 6.9H22l-5.4 3.9 2.1 6.8L12 16.7 5.3 19.6 7.4 12.8 2 8.9h7.4L12 2z"
            />
          </svg>
        </button>
        <span className="font-semibold text-white">Estrella</span>
      </div>

      {/* Состояние: гость */}
      {!isAuthed && <GuestHero locale={locale} />}

      {/* Состояние: пользователь */}
      {isAuthed && <UserQuickPanel locale={locale} userName={sessionUser?.name ?? "friend"} />}

      {/* Drawer должен быть на странице, чтобы кнопка работала */}
      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} locale={locale} />
    </section>
  );
}

/* ---------- Вью для гостей ---------- */

function GuestHero({ locale }: { locale: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur-md">
      <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">Партнёрская платформа Estrella</h1>
      <p className="mt-3 max-w-3xl text-white/75">
        Отслеживайте клики, конверсии и выплаты в одном месте. Подключайте источники, работайте с офферами, получайте выплаты
        — просто и быстро.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        {/* Кнопка входа через встроенную страницу NextAuth */}
        <a
          href={`/api/auth/signin?callbackUrl=/${locale}`}
          className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-white hover:bg-white/15"
        >
          Войти
        </a>
        {/* Если у тебя есть отдельная регистрация — поменяй ссылку ниже; иначе можно оставить вход */}
        <a
          href={`/api/auth/signin?callbackUrl=/${locale}`}
          className="rounded-xl border border-white/20 px-4 py-2 text-white/90 hover:bg-white/10"
        >
          Зарегистрироваться
        </a>
      </div>

      {/* Краткие шаги «как начать» */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StepCard n={1} title="Создайте аккаунт">
          Войдите через Google или email/пароль.
        </StepCard>
        <StepCard n={2} title="Заполните профиль">
          Имя, Telegram и реквизиты для выплат.
        </StepCard>
        <StepCard n={3} title="Запросите доступ к офферам">
          Менеджер подтвердит и откроет нужные офферы.
        </StepCard>
      </div>
    </div>
  );
}

function StepCard({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
      <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/10 text-sm">
        {n}
      </div>
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-sm text-white/70">{children}</div>
    </div>
  );
}

/* ---------- Вью для авторизованного ---------- */

function UserQuickPanel({ locale, userName }: { locale: string; userName: string }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/15 bg-white/5 p-6">
        <h2 className="text-2xl font-semibold">Привет, {userName} 👋</h2>
        <p className="mt-1 text-white/70">
          Быстрый доступ к основным разделам. Все остальное — в меню (звезда вверху).
        </p>
      </div>

      {/* Быстрые действия */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <QuickLink href={`/${locale}/offers`} title="Offers" desc="Каталог офферов" />
        <QuickLink href={`/${locale}/statistics`} title="Statistics" desc="Клики и конверсии" />
        <QuickLink href={`/${locale}/finance`} title="Finance" desc="Реквизиты и выплаты" />
        <QuickLink href={`/${locale}/profile`} title="Profile" desc="Данные аккаунта" />
      </div>

      {/* Подсказки следующего шага */}
      <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
        <h3 className="text-lg font-semibold">Что дальше?</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-white/75">
          <li>Запросите доступ к интересующим офферам на странице Offers.</li>
          <li>Убедитесь, что профиль заполнен и добавлены реквизиты для выплат.</li>
          <li>Подключите постбеки — раздел «Postbacks» в документации.</li>
        </ul>
      </div>
    </div>
  );
}

function QuickLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-white/15 bg-white/5 p-4 hover:bg-white/10 transition"
    >
      <div className="text-lg font-semibold">{title}</div>
      <div className="mt-1 text-sm text-white/70">{desc}</div>
    </Link>
  );
}
