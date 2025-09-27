"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

function NeonTabs({ locale, active }: { locale: string; active: "login" | "register" }) {
  const base =
    "uppercase font-extrabold tracking-wide rounded-2xl px-8 py-3 select-none border-2 bg-transparent transition-colors";
  const roseActive =
    "text-white border-rose-500/90 shadow-[0_0_0_2px_rgba(255,0,90,.35),0_0_24px_rgba(255,0,90,.55),inset_0_0_12px_rgba(255,0,90,.2)] hover:bg-rose-500/10";
  const roseIdle =
    "text-white border-rose-500/70 shadow-[0_0_0_2px_rgba(255,0,90,.25),0_0_18px_rgba(255,0,90,.45)] hover:bg-rose-500/10";
  const grayActive =
    "text-white border-slate-300/90 shadow-[0_0_0_2px_rgba(148,163,184,.35),0_0_24px_rgba(148,163,184,.55),inset_0_0_12px_rgba(148,163,184,.2)] hover:bg-white/10";
  const grayIdle =
    "text-white/90 border-slate-300/70 shadow-[0_0_0_2px_rgba(148,163,184,.25),0_0_18px_rgba(148,163,184,.45)] hover:bg-white/10";

  return (
    <div className="mb-8 flex gap-4">
      <Link
        href={`/${locale}/login`}
        aria-current={active === "login" ? "page" : undefined}
        className={`${base} ${active === "login" ? roseActive : roseIdle}`}
      >
        Войти
      </Link>
      <Link
        href={`/${locale}/register`}
        aria-current={active === "register" ? "page" : undefined}
        className={`${base} ${active === "register" ? grayActive : grayIdle}`}
      >
        Регистрация
      </Link>
    </div>
  );
}

export default function LoginPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const qs = useSearchParams();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "");
    const password = String(fd.get("password") || "");
    const callbackUrl = qs.get("callbackUrl") || `/${locale}`;

    await signIn("credentials", { email, password, redirect: true, callbackUrl });
    setSubmitting(false);
  }

  const urlError = qs.get("error");
  const mergedError =
    error ||
    (urlError === "CredentialsSignin"
      ? "Неверный email или пароль."
      : urlError
      ? "Ошибка входа. Попробуйте ещё раз."
      : null);

  const inputCls =
    "w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-white/90 outline-none placeholder:text-white/40 focus:border-white/40 focus:shadow-[0_0_0_3px_rgba(255,255,255,.12)]";
  const cardCls =
    "rounded-2xl border border-white/12 bg-white/5 p-6 shadow-[0_8px_40px_rgba(0,0,0,.45)]";
  const btnCls =
    "w-full rounded-xl border border-white/25 bg-white/10 hover:bg-white/15 px-4 py-2 font-semibold text-white/90 disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <div className="min-h-screen px-4 py-10 text-white/90">
      <div className="mx-auto w-full max-w-2xl">
        <NeonTabs locale={locale} active="login" />

        <div className={cardCls}>
          <h1 className="mb-4 text-2xl font-extrabold">Вход в кабинет</h1>

          <form onSubmit={onSubmit} className="grid gap-4">
            <label className="block">
              <div className="mb-1 text-sm text-white/70">Эл. почта</div>
              <input name="email" type="email" autoComplete="email" className={inputCls} required />
            </label>

            <label className="block">
              <div className="mb-1 text-sm text-white/70">Пароль</div>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                className={inputCls}
                required
              />
            </label>

            {mergedError && <p className="text-sm text-red-400">{mergedError}</p>}

            <button type="submit" disabled={submitting} className={btnCls}>
              {submitting ? "Входим…" : "Войти"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
