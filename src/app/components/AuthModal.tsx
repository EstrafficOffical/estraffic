"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { signIn } from "next-auth/react";
import { usePathname } from "next/navigation";

export default function AuthModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const pathname = usePathname();
  const callbackUrl = useMemo(() => pathname || "/", [pathname]);

  // контейнер для портала
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  async function doSignup(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Signup failed");

      setMsg("✅ Аккаунт создан, авторизуем…");
      await signIn("credentials", { redirect: true, email, password, callbackUrl });
    } catch (e: any) {
      setMsg("⚠️ " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function doSignin(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const resp = await signIn("credentials", {
        redirect: true,
        email,
        password,
        callbackUrl,
      });
      // next-auth сам редиректнёт; onClose на всякий случай
      onClose();
    } catch (e: any) {
      setMsg("⚠️ " + e.message);
    } finally {
      setLoading(false);
    }
  }

  const modal = (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-[60] ${open ? "" : "pointer-events-none"}`}
    >
      {/* затемнение */}
      <div
        onClick={onClose}
        className={`absolute inset-0 transition ${open ? "opacity-100" : "opacity-0"} bg-black/60 backdrop-blur-sm`}
      />
      {/* карточка */}
      <div
        className={`absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2
        rounded-2xl border border-white/15 bg-white/8 backdrop-blur-xl p-6 text-white shadow-[0_8px_40px_rgba(0,0,0,0.45)]
        transition ${open ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Добро пожаловать</h3>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/20 px-2 py-1 text-sm text-white/80 hover:bg-white/10"
          >
            Esc
          </button>
        </div>

        {/* табы */}
        <div className="mb-4 grid grid-cols-2 rounded-xl border border-white/15 bg-white/5 p-1">
          <button
            onClick={() => setTab("signin")}
            className={`rounded-lg py-2 text-sm ${tab === "signin" ? "bg-white/15" : "hover:bg-white/10"}`}
          >
            Вход
          </button>
          <button
            onClick={() => setTab("signup")}
            className={`rounded-lg py-2 text-sm ${tab === "signup" ? "bg-white/15" : "hover:bg-white/10"}`}
          >
            Регистрация
          </button>
        </div>

        {/* OAuth */}
        <div className="space-y-2">
          <button
            onClick={() => signIn("google", { callbackUrl })}
            className="w-full rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 py-2"
          >
            Войти через Google
          </button>
          <button
            onClick={() => signIn("apple", { callbackUrl })}
            className="w-full rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 py-2"
          >
            Войти через Apple
          </button>
        </div>

        <div className="my-4 h-px bg-white/10" />

        {/* формы */}
        {tab === "signup" ? (
          <form className="space-y-3" onSubmit={doSignup}>
            <Input label="Имя" value={name} onChange={setName} />
            <Input label="Email" type="email" value={email} onChange={setEmail} />
            <Input label="Пароль" type="password" value={password} onChange={setPassword} />
            <button
              disabled={loading}
              className="w-full rounded-xl bg-white/15 hover:bg-white/20 border border-white/20 py-2"
            >
              {loading ? "Создаём…" : "Создать аккаунт"}
            </button>
          </form>
        ) : (
          <form className="space-y-3" onSubmit={doSignin}>
            <Input label="Email" type="email" value={email} onChange={setEmail} />
            <Input label="Пароль" type="password" value={password} onChange={setPassword} />
            <button
              disabled={loading}
              className="w-full rounded-xl bg-white/15 hover:bg-white/20 border border-white/20 py-2"
            >
              {loading ? "Входим…" : "Войти"}
            </button>

            {/* «Забыли пароль?» под кнопкой входа */}
            <p className="text-xs text-white/60 mt-2">
              <a href="/en/auth/forgot" className="underline underline-offset-4 hover:text-white/80">
                Забыли пароль?
              </a>
            </p>
          </form>
        )}

        {msg && <p className="mt-3 text-sm text-white/80">{msg}</p>}
      </div>
    </div>
  );

  // Рендер через портал — модалка всегда поверх и по центру
  return mounted ? createPortal(modal, document.body) : null;
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm mb-1 text-white/80">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-zinc-900 text-white border border-white/15 px-3 py-2 outline-none
                   focus:ring-2 focus:ring-white/20 placeholder:text-white/40"
      />
    </div>
  );
}
