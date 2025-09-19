"use client";

import { useState } from "react";
import Link from "next/link";
import NavDrawer from "@/app/components/NavDrawer"; // <-- фикс пути

/** Мягкая звезда-водяной знак */
function StarWatermark({ hidden = false }: { hidden?: boolean }) {
  if (hidden) return null;
  return (
    <svg
      className="pointer-events-none absolute right-[-6%] top-[10%] w-[34%]"
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
        opacity={0.75}
      />
    </svg>
  );
}

/** Универсальная карточка */
function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/15 bg-white/8 backdrop-blur-lg shadow-[0_8px_40px_rgba(0,0,0,0.45)] ${className}`}
    >
      {title ? (
        <div className="px-5 pt-4 text-sm font-medium text-white/90">{title}</div>
      ) : null}
      <div className={`${title ? "px-5 pb-5 pt-3" : "p-5"}`}>{children}</div>
    </div>
  );
}

/** Простой тумблер */
function Toggle({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full border border-white/20 transition ${
        checked ? "bg-white/80" : "bg-white/15"
      }`}
      title={label}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-zinc-900 transition ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function ProfilePage() {
  // демо-состояния
  const [name, setName] = useState("John Doe");
  const [email, setEmail] = useState("johndoe@example.com");
  const [tz, setTz] = useState("UTC+03:00");
  const [twoFa, setTwoFa] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(false);
  const [primaryWalletOn, setPrimaryWalletOn] = useState(true);

  // drawer состояния
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <section className="relative max-w-5xl mx-auto px-4 py-8 md:py-10 space-y-8">
      <StarWatermark hidden={false} />

      {/* Верхняя панель */}
      <div className="relative rounded-2xl border border-white/15 bg-white/8 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            {/* Кнопка-звезда — открывает меню */}
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Открыть меню"
              title="Меню"
              className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-white/20 text-zinc-900 border border-white/40 shadow-[0_2px_12px_rgba(0,0,0,0.25)] backdrop-blur-sm hover:bg-white/30 transition"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
                <path
                  fill="currentColor"
                  d="M12 2l2.6 6.9H22l-5.4 3.9 2.1 6.8L12 16.7 5.3 19.6 7.4 12.8 2 8.9h7.4L12 2z"
                />
              </svg>
            </button>
            Estrella
          </div>

          {/* Иконка профиля справа */}
          <Link
            href="#"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 border border-white/30 hover:bg-white/30 transition"
            title="Аккаунт"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
              <path
                fill="currentColor"
                d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4.2 0-8 2.1-8 5v1h16v-1c0-2.9-3.8-5-8-5z"
              />
            </svg>
          </Link>
        </div>

        {/* Аватар по центру с кнопкой камеры */}
        <div className="relative flex justify-center pb-6">
          <div className="relative h-28 w-28 rounded-full border border-white/30 bg-white/30 text-zinc-900 shadow-md flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-12 h-12 opacity-70" aria-hidden>
              <path
                fill="currentColor"
                d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4.2 0-8 2.1-8 5v1h16v-1c0-2.9-3.8-5-8-5z"
              />
            </svg>
            <button
              type="button"
              className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 h-8 w-8 rounded-full bg-white text-zinc-900 border border-white/60 flex items-center justify-center shadow"
              title="Загрузить фото"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
                <path
                  fill="currentColor"
                  d="M5 7h3l2-2h4l2 2h3a1 1 0 011 1v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8a1 1 0 011-1zm7 3a3 3 0 100 6 3 3 0 000-6z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Сетка карточек 2х2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic */}
        <Card title="Basic">
          <div className="space-y-3">
            <label className="block">
              <span className="block text-xs text-white/60 mb-1">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/10 text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/25"
              />
            </label>
            <label className="block">
              <span className="block text-xs text-white/60 mb-1">Email</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/10 text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/25"
              />
            </label>
          </div>
        </Card>

        {/* Financial */}
        <Card title="Financial">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">Wallets</span>
              <span className="text-sm text-white/70">0x1234…5578</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">Primary</span>
              <Toggle checked={primaryWalletOn} onChange={setPrimaryWalletOn} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">Timezone</span>
              <span className="text-sm text-white/80">{tz}</span>
            </div>
          </div>
        </Card>

        {/* Preferences */}
        <Card title="Preferences">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">Email notifications</span>
              <Toggle checked={emailNotif} onChange={setEmailNotif} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">Push notifications</span>
              <Toggle checked={pushNotif} onChange={setPushNotif} />
            </div>

            <label className="block">
              <span className="block text-xs text-white/60 mb-1">Timezone</span>
              <select
                value={tz}
                onChange={(e) => setTz(e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/10 text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/25"
              >
                <option className="bg-zinc-900" value="UTC+00:00">
                  UTC+00:00
                </option>
                <option className="bg-zinc-900" value="UTC+02:00">
                  UTC+02:00
                </option>
                <option className="bg-zinc-900" value="UTC+03:00">
                  UTC+03:00
                </option>
                <option className="bg-zinc-900" value="UTC+05:00">
                  UTC+05:00
                </option>
              </select>
            </label>
          </div>
        </Card>

        {/* Security */}
        <Card title="Security">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">Two-factor authentication</span>
              <Toggle checked={twoFa} onChange={setTwoFa} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">Change password</span>
              <button className="rounded-xl border border-white/25 px-3 py-1.5 text-xs text-white/90 hover:bg-white/10">
                Change
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Нижние карточки */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Payout history">
          <Link
            href="../payouts"
            className="inline-flex rounded-xl border border-white/25 px-3 py-1.5 text-sm text-white/90 hover:bg-white/10"
          >
            Open payouts
          </Link>
        </Card>

        <Card title="Integrations">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">API keys</span>
              <button className="rounded-xl border border-white/25 px-3 py-1.5 text-xs text-white/90 hover:bg-white/10">
                Reveal…
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">Referrals</span>
              <button className="rounded-xl border border-white/25 px-3 py-1.5 text-xs text-white/90 hover:bg-white/10">
                Manage
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Контакты менеджера */}
      <div className="flex justify-center">
        <Link
          href="../settings"
          className="rounded-xl border border-white/25 px-4 py-2 text-sm text-white/90 hover:bg-white/10"
        >
          Contact manager
        </Link>
      </div>

      {/* Выдвижное меню */}
      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </section>
  );
}
