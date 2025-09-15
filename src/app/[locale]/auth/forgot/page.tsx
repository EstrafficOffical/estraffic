"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import NavDrawer from "@/app/components/NavDrawer";

export default function ForgotPasswordPage() {
  const pathname = usePathname();
  const locale = (pathname?.split("/")?.[1] || "ru") as string;

  const [menuOpen, setMenuOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(
          data.resetUrl
            ? `✅ Ссылка (dev): ${data.resetUrl}`
            : "✅ Если такой email существует, на него отправлена ссылка для сброса"
        );
      } else {
        setMsg("⚠️ " + (data?.error ?? "Ошибка"));
      }
    } catch {
      setMsg("⚠️ Сеть недоступна");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="relative max-w-md mx-auto px-4 py-10 space-y-6">
      {/* Звезда + Estrella */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open navigation"
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 border border-white/40"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-black/80" aria-hidden>
            <path fill="currentColor" d="M12 2l2.6 6.9H22l-5.4 3.9 2.1 6.8L12 16.7 5.3 19.6 7.4 12.8 2 8.9h7.4L12 2z" />
          </svg>
        </button>
        <span className="font-semibold text-white">Estrella</span>
      </div>

      <h1 className="text-4xl font-extrabold">Forgot password</h1>

      <form
        onSubmit={onSubmit}
        className="rounded-2xl bg-white/8 border border-white/15 backdrop-blur-xl p-6 space-y-4"
      >
        <div>
          <label className="block text-sm mb-1 text-white/80">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl bg-zinc-900 text-white border border-white/15 px-3 py-2 outline-none focus:ring-2 focus:ring-white/20 placeholder:text-white/40"
          />
        </div>
        <button
          disabled={loading}
          className="w-full rounded-xl bg-white/15 hover:bg-white/20 border border-white/20 py-2"
        >
          {loading ? "Отправляем…" : "Отправить ссылку"}
        </button>
        {msg && <p className="text-sm text-white/80">{msg}</p>}
      </form>

      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </section>
  );
}
