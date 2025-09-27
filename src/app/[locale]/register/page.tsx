"use client";

import { useState } from "react";
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

export default function RegisterPage({ params }: { params: { locale: string } }) {
  const { locale } = params;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [telegram, setTelegram] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, telegram }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409) setError("Пользователь с таким email уже существует");
        else setError(data?.error || "Ошибка сервера");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-white/90 outline-none placeholder:text-white/40 focus:border-white/40 focus:shadow-[0_0_0_3px_rgba(255,255,255,.12)]";
  const cardCls =
    "rounded-2xl border border-white/12 bg-white/5 p-6 shadow-[0_8px_40px_rgba(0,0,0,.45)]";
  const btnPrimary =
    "w-full rounded-xl border border-rose-500/40 bg-rose-500/90 px-4 py-2 font-semibold text-white hover:bg-rose-500 disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <div className="min-h-screen px-4 py-10 text-white/90">
      <div className="mx-auto w-full max-w-2xl">
        <NeonTabs locale={locale} active="register" />

        <div className={cardCls}>
          <h1 className="mb-4 text-2xl font-extrabold">Регистрация</h1>

          {submitted ? (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-emerald-200">
              Заявка подана. Мы свяжемся с вами в течение 1 дня.
            </div>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-4">
              <label className="block">
                <div className="mb-1 text-sm text-white/70">Имя</div>
                <input
                  type="text"
                  className={inputCls}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>
              <label className="block">
                <div className="mb-1 text-sm text-white/70">Email</div>
                <input
                  type="email"
                  autoComplete="email"
                  className={inputCls}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <label className="block">
                <div className="mb-1 text-sm text-white/70">Пароль</div>
                <input
                  type="password"
                  autoComplete="new-password"
                  className={inputCls}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </label>
              <label className="block">
                <div className="mb-1 text-sm text-white/70">Telegram (необязательно)</div>
                <input
                  type="text"
                  className={inputCls}
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                />
              </label>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button type="submit" disabled={loading} className={btnPrimary}>
                {loading ? "Отправляем…" : "Регистрация"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
