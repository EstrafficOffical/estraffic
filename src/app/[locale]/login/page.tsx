"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage({ params }: { params: { locale: string } }) {
  const locale = params.locale;
  const router = useRouter();

  function Shell({ children }: { children: React.ReactNode }) {
    return (
      <div className="min-h-screen px-4 py-10 text-white/90">
        <div className="mx-auto w-full max-w-2xl">
          <div className="mb-6 flex items-center justify-center gap-3">
            <a
              href={`/${locale}/login`}
              className="rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold tracking-wide text-white/80 backdrop-blur hover:bg-white/15"
            >
              ВОЙТИ
            </a>
            <a
              href={`/${locale}/register`}
              className="rounded-xl border border-white/30 bg-white/5 px-6 py-3 text-sm font-semibold tracking-wide text-white/70 shadow-[0_0_24px_rgba(255,255,255,.12)] hover:bg-white/10"
            >
              РЕГИСТРАЦИЯ
            </a>
          </div>
          <div className="rounded-2xl border border-white/12 bg-white/5 p-6 shadow-[0_8px_40px_rgba(0,0,0,.45)]">
            {children}
          </div>
        </div>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "");
    const password = String(fd.get("password") || "");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: `/${locale}`,
    });

    if (res?.ok) router.push(res.url ?? `/${locale}`);
    else {
      const err = e.currentTarget.querySelector("#form-error") as HTMLParagraphElement | null;
      if (err) err.textContent = "Неверный email или пароль";
    }
  }

  const inputCls =
    "w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-white/90 outline-none placeholder:text-white/40 focus:border-white/40 focus:shadow-[0_0_0_3px_rgba(255,255,255,.12)]";

  return (
    <Shell>
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

        <p id="form-error" className="text-sm text-white/70" />

        <button
          type="submit"
          className="w-full rounded-xl border border-white/25 bg-white/10 px-5 py-3 font-semibold tracking-wide text-white/90 transition hover:bg-white/15 focus:shadow-[0_0_0_4px_rgba(255,255,255,.14)]"
        >
          Войти
        </button>

        <div className="pt-2 text-center text-sm text-white/60">
          Нет аккаунта?{" "}
          <a href={`/${locale}/register`} className="underline decoration-white/30 underline-offset-4 hover:text-white">
            Зарегистрироваться
          </a>
        </div>
      </form>
    </Shell>
  );
}
