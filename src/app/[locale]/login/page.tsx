"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

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

    // если есть callbackUrl в URL — используем его, иначе шлём на главную локали
    const callbackUrl = qs.get("callbackUrl") || `/${locale}`;

    // даём NextAuth самому сделать редирект
    await signIn("credentials", {
      email,
      password,
      redirect: true,
      callbackUrl,
    });

    // при успехе NextAuth сам редиректит
    // при ошибке вернёт на эту же страницу с ?error=..., отобразим её ниже
    setSubmitting(false);
  }

  // текст ошибки из URL (например, CredentialsSignin)
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

  const btnBase =
    "px-5 py-2.5 rounded-xl text-sm font-semibold transition focus:shadow-[0_0_0_4px_rgba(255,255,255,.14)]";
  const btnPrimary =
    "border border-rose-500/40 bg-rose-500/90 hover:bg-rose-500 text-white";
  const btnGhost =
    "border border-white/25 bg-white/10 hover:bg-white/15 text-white/90";

  return (
    <div className="min-h-screen px-4 py-10 text-white/90">
      <div className="mx-auto w-full max-w-2xl">
        {/* переключатели */}
        <div className="mb-6 flex gap-3">
          <a
            href={`/${locale}/login`}
            aria-current="page"
            className={`${btnGhost}`}
          >
            Войти
          </a>
          <a
            href={`/${locale}/register`}
            className={`${btnPrimary}`}
          >
            Регистрация
          </a>
        </div>

        <div className="rounded-2xl border border-white/12 bg-white/5 p-6 shadow-[0_8px_40px_rgba(0,0,0,.45)]">
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
              <p className="text-sm text-red-400">{mergedError}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className={`${btnGhost} w-full`}
            >
              {submitting ? "Входим…" : "Войти"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
