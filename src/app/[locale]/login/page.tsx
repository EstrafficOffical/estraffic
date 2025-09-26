"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage({ params }: { params: { locale: string } }) {
  const locale = params.locale;
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const email = String(fd.get("email") || "").trim().toLowerCase();
      const password = String(fd.get("password") || "");

      if (!email || !password) {
        setError("Введите email и пароль");
        return;
      }

      // абсолютный callbackUrl — реже чудит в проде
      const callbackUrl = new URL(`/${locale}`, window.location.origin).toString();

      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      console.log("signIn result:", res);

      if (!res) {
        setError("Неизвестная ошибка. Попробуйте позже.");
        return;
      }
      if (res.error) {
        // next-auth даёт "CredentialsSignin" при невалидных данных
        setError(res.error === "CredentialsSignin" ? "Неверный email или пароль." : res.error);
        return;
      }
      // Успех
      router.push(res.url ?? `/${locale}`);
    } catch (err: any) {
      console.error(err);
      setError("Сбой сети или сервера. Повторите попытку.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-white/90 outline-none placeholder:text-white/40 focus:border-white/40 focus:shadow-[0_0_0_3px_rgba(255,255,255,.12)]";

  return (
    <div className="min-h-screen px-4 py-10 text-white/90">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-white/12 bg-white/5 p-6">
        <h1 className="mb-4 text-2xl font-extrabold">Вход в кабинет</h1>
        <form onSubmit={onSubmit} className="grid gap-4">
          <label className="block">
            <div className="mb-1 text-sm text-white/70">Эл. почта</div>
            <input name="email" type="email" autoComplete="email" className={inputCls} placeholder="you@email.com" required />
          </label>
          <label className="block">
            <div className="mb-1 text-sm text-white/70">Пароль</div>
            <input name="password" type="password" autoComplete="current-password" className={inputCls} placeholder="Ваш пароль" required />
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl border border-white/25 bg-white/10 px-5 py-3 font-semibold tracking-wide text-white/90 transition hover:bg-white/15 focus:shadow-[0_0_0_4px_rgba(255,255,255,.14)] disabled:opacity-60"
          >
            {submitting ? "Входим..." : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}
