'use client';

import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function LoginForm({ locale }: { locale: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputCls =
    'w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-white/90 outline-none placeholder:text-white/40 focus:border-white/40 focus:shadow-[0_0_0_3px_rgba(255,255,255,.12)]';

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email') || '');
    const password = String(fd.get('password') || '');

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,                // сами обрабатываем результат
      callbackUrl: `/${locale}`,
    });

    setSubmitting(false);

    if (res?.error) {
      setError('Неверный email или пароль.');
      return;
    }
    router.push(res?.url ?? `/${locale}`);
  }

  return (
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

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl border border-white/25 bg-white/10 px-5 py-3 font-semibold tracking-wide text-white/90 transition hover:bg-white/15 disabled:opacity-60 focus:shadow-[0_0_0_4px_rgba(255,255,255,.14)]"
      >
        {submitting ? 'Входим…' : 'Войти'}
      </button>
    </form>
  );
}
