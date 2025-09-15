'use client';

import { Star, User } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative mx-auto mt-10 w-full max-w-6xl rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-800 p-8 text-white shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-slate-300">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
            <Star size={16} />
          </span>
          <span className="opacity-60">Estrella</span>
        </div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10">
          <User size={18} />
        </span>
      </div>

      <Star
        className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 opacity-25"
        size={220}
      />

      <div className="mt-10 max-w-2xl">
        <h1 className="text-5xl font-semibold tracking-tight">Estrella Traffic</h1>
        <p className="mt-6 text-lg leading-7 text-slate-300">
          Надёжный партнёр в управлении трафиком
        </p>
        <p className="mt-2 text-slate-400">
          Мы помогаем брендам расти и достичь аудиторию быстрее и эффективнее
        </p>

        <div className="mt-8 flex gap-3">
          <button className="rounded-2xl bg-white px-5 py-2 text-slate-900 shadow">
            Узнать больше
          </button>
          <button className="rounded-2xl border border-white/20 px-5 py-2 text-white">
            Связаться с нами
          </button>
        </div>
      </div>
    </section>
  );
}
