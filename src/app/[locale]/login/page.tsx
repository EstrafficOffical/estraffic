"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const fd = new FormData(e.currentTarget);
      const email = String(fd.get("email") || "").trim();
      const password = String(fd.get("password") || "");

      const res = await signIn("credentials", {
        email,
        password,
        redirect: false, // сами обработаем
        callbackUrl: `/${locale}/admin/requests`,
      });

      if (!res) {
        setError("Неизвестная ошибка. Попробуйте позже.");
        return;
      }
      if (res.error) {
        setError("Неверный email или пароль.");
        return;
      }

      router.push(res.url ?? `/${locale}`);
    } catch {
      setError("Ошибка сети. Попробуйте позже.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-white/90 outline-none " +
    "placeholder:text-white/40 focus:border-white/40 focus:shadow-[0_0_0_3px_rgba(255,255,255,.12)]";

  const tabBase =
    "rounded-xl px-5 py-2 text-sm font-semibold tracking-wide transition select-none";
  const tabGray =
    "border border-white/25 bg-white/10 hover:bg-white/15 text-white/85";
  const tabRed =
    "border border-rose-500/40 bg-rose-500/90 hover:bg-rose-500 text-white shadow-[0_0_24px_rgba(244,63,94,.25)]";

  return (
    <main className="min-h-screen px-4 py-10 text-white/90">
      <div className="mx-auto w-full max-w-2xl">
        {/* переключатель табов */}
        <div className="mb-6 flex items-center gap-3">
          {/* неактивный серый — ведёт на регистрация */}
          <Link
            href={`/${locale}/register`}
            className={`${tabBase} ${tabGray}`}
          >
            Регистрация
          </Link>

          {/* активный красный — текущая страница */}
          <Link
            href={`/${locale}/login`}
            aria-current="page"
            className={`${tabBase} ${tabRed}`}
          >
            Войти
          </Link>
        </div>

        {/* карточка формы */}
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

            {error && (
              <p className="text-sm text-rose-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 w-full rounded-xl border border-white/25 bg-white/10 px-5 py-3 font-semibold tracking-wide text-white/90 transition hover:bg-white/15 focus:shadow-[0_0_0_4px_rgba(255,255,255,.14)] disabled:opacity-60"
            >
              {submitting ? "Входим…" : "Войти"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
