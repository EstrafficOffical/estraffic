// src/app/[locale]/(auth)/reset/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useParams } from "next/navigation";

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <label className="block space-y-1">
      <span className="text-xs text-white/70">{label}</span>
      <input
        {...rest}
        className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none
                   focus:ring-2 focus:ring-white/25"
      />
    </label>
  );
}

export default function ResetPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "ru";

  const sp = useSearchParams();
  const token = sp.get("token");     // режим сброса по токену из письма
  const prefillEmail = sp.get("email") ?? "";

  const isTokenFlow = Boolean(token);

  // формы
  const [email, setEmail] = useState(prefillEmail);
  const [pass1, setPass1] = useState("");
  const [pass2, setPass2] = useState("");

  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setErr(null);
    setMsg(null);
  }, [token]);

  async function submitByToken() {
    if (pass1.length < 8) return setErr("Пароль должен быть не короче 8 символов.");
    if (pass1 !== pass2) return setErr("Пароли не совпадают.");
    setPending(true); setErr(null); setMsg(null);
    try {
      const r = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password: pass1 }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.ok === false) throw new Error(j?.error || "Не удалось сменить пароль");
      setMsg("Пароль успешно обновлён. Теперь можно войти.");
    } catch (e: any) {
      setErr(e.message || "Ошибка сервера");
    } finally {
      setPending(false);
    }
  }

  async function submitDevDirect() {
    if (!email) return setErr("Укажи email.");
    if (pass1.length < 8) return setErr("Пароль должен быть не короче 8 символов.");
    if (pass1 !== pass2) return setErr("Пароли не совпадают.");
    setPending(true); setErr(null); setMsg(null);
    try {
      // DEV-вариант: твой ранее добавленный эндпоинт
      const r = await fetch("/api/dev/set-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password: pass1 }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.ok === false) throw new Error(j?.error || "Не удалось обновить пароль");
      setMsg("Пароль обновлён (dev). Теперь можно войти.");
    } catch (e: any) {
      setErr(e.message || "Ошибка сервера");
    } finally {
      setPending(false);
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTokenFlow) await submitByToken();
    else await submitDevDirect();
  };

  return (
    <section className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-white/8 backdrop-blur-xl p-6
                      shadow-[0_8px_40px_rgba(0,0,0,0.45)] text-white">
        <h1 className="text-xl font-semibold mb-1">
          {isTokenFlow ? "Сброс пароля" : "Смена пароля (dev)"}
        </h1>
        <p className="text-sm text-white/70 mb-5">
          {isTokenFlow
            ? "Введите новый пароль для вашего аккаунта."
            : "В dev-режиме можно задать пароль по email напрямую."}
        </p>

        <form onSubmit={onSubmit} className="space-y-3">
          {!isTokenFlow && (
            <Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          )}

          <Field label="Новый пароль" type="password" value={pass1} onChange={e => setPass1(e.target.value)} />
          <Field label="Повторите пароль" type="password" value={pass2} onChange={e => setPass2(e.target.value)} />

          {err && <div className="text-red-300 text-sm">{err}</div>}
          {msg && <div className="text-emerald-300 text-sm">{msg}</div>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl border border-white/25 bg-white/10 hover:bg-white/20 transition
                       px-4 py-2 disabled:opacity-60"
          >
            {pending ? "Сохраняю…" : isTokenFlow ? "Обновить пароль" : "Обновить (dev)"}
          </button>

          <div className="text-center text-sm mt-3">
            <Link
              href="/api/auth/signin"
              className="text-white/80 hover:underline"
            >
              Войти
            </Link>
            <span className="mx-2 text-white/30">•</span>
            <Link
              href={`/${locale}`}
              className="text-white/80 hover:underline"
            >
              На главную
            </Link>
          </div>
        </form>

        {!isTokenFlow && (
          <div className="mt-5 text-xs text-white/50">
            <b>Примечание:</b> эта форма использует <code>/api/dev/set-password</code>.  
            В продакшене замени на свой эндпоинт восстановления по почте/токену.
          </div>
        )}
      </div>
    </section>
  );
}
