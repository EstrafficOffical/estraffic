"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

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

    await signIn("credentials", {
      email,
      password,
      redirect: true,
      callbackUrl,
    });

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
    "w-full rounded-xl border border-white/15 bg-zinc-900 px-3 py-2 text-white/90 outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/20";

  const tab =
    "px-5 py-2.5 rounded-xl text-sm font-semibold transition focus:shadow-[0_0_0_4px_rgba(255,255,255,.14)]";
  const tabActive =
    "border-2 border-rose-500/70 bg-rose-500/15 text-white shadow-[0_0_0_2px_rgba(255,0,90,.25),0_0_18px_rgba(255,0,90,.45)]";
  const tabGhost =
    "border border-white/20 bg-white/5 text-white/90 hover:bg-white/10";

  return (
    <main className="min-h-screen px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-2xl">
        {/* Табы */}
        <div className="mb-6 flex gap-3">
          <Link href={`/${locale}/login`} aria-current="page" className={`${tab} ${tabActive}`}>
            Войти
          </Link>
          <Link href={`/${locale}/register`} className={`${tab} ${tabGhost}`}>
            Регистрация
          </Link>
        </div>

        <section className="rounded-2xl border border-white/12 bg-white/5 p-6 shadow-[0_8px_40px_rgba(0,0,0,.45)]">
          <h1 className="mb-4 text-2xl font-extrabold">Вход в кабинет</h1>

          <form onSubmit={onSubmit} className="grid gap-4">
            <label className="block">
              <div className="mb-1 text-sm text-white/70">Эл. почта</div>
              <input
                name="email"
                type="email"
                autoComplete="email"
                className={inputCls}
                placeholder="you@email.com"
                required
              />
            </label>

            <label className="block">
              <div className="mb-1 text-sm text-white/70">Пароль</div>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                className={inputCls}
                placeholder="Ваш пароль"
                required
              />
            </label>

            {mergedError && (
              <p className="text-sm text-rose-300/90">{mergedError}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-white hover:bg-white/15 disabled:opacity-60"
            >
              {submitting ? "Входим…" : "Войти"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
