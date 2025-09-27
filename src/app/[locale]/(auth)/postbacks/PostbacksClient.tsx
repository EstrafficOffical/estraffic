"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import NavToggle from "@/app/components/NavToggle";
import NavDrawer from "@/app/components/NavDrawer";

export default function PostbacksClient({ locale }: { locale: string }) {
  const pathname = usePathname(); // не обязательно, но ок
  const [menuOpen, setMenuOpen] = useState(false);

  // секрет берём с сервера (доступен только админу)
  const [secret, setSecret] = useState("<POSTBACK_SHARED_SECRET>");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/postbacks/secret", { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (alive && r.ok && j?.secret) setSecret(String(j.secret));
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, []);

  const devUrl = "http://localhost:3000/api/postbacks/ingest";
  const prodUrl = useMemo(() => {
    if (typeof window === "undefined") return "https://<домен>/api/postbacks/ingest";
    return `${window.location.origin}/api/postbacks/ingest`;
  }, []);

  const copy = async (txt: string) => {
    try {
      await navigator.clipboard.writeText(txt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  return (
    <section className="relative mx-auto max-w-6xl px-4 py-8">
      {/* шапка: твоя кнопка-звезда + название */}
      <div className="mb-6 flex items-center gap-2">
        <NavToggle onClick={() => setMenuOpen(true)} />
        <span className="font-semibold text-white">Estrella</span>
      </div>

      <h1 className="mb-4 text-3xl font-extrabold text-white">Документация по постбеку</h1>

      {/* Обзор */}
      <div className="mb-6 rounded-2xl border border-white/15 bg-white/5 p-4 text-white/85">
        Этот раздел описывает приём постбеков в Estrella. Используйте его, чтобы отправлять
        события (регистрация, депозит, продажа и т.д.) в систему. Эндпоинт идемпотентен по паре{" "}
        <code className="rounded bg-black/40 px-1">offerId</code> +{" "}
        <code className="rounded bg-black/40 px-1">txId</code>.
      </div>

      {/* Эндпоинты */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
          <div className="mb-2 text-sm text-white/70">URL (dev)</div>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={devUrl}
              className="w-full rounded-xl border border-white/15 bg-zinc-900 px-3 py-2 text-sm text-white outline-none"
            />
            <button
              onClick={() => copy(devUrl)}
              className="whitespace-nowrap rounded-xl border border-white/20 px-3 py-2 text-sm text-white/90 hover:bg-white/10"
            >
              Копировать
            </button>
          </div>
          <div className="mt-3 text-xs text-white/60">Метод: POST (JSON). GET допускается для отладки.</div>
        </div>

        <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
          <div className="mb-2 text-sm text-white/70">URL (prod)</div>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={prodUrl}
              className="w-full rounded-xl border border-white/15 bg-zinc-900 px-3 py-2 text-sm text-white outline-none"
            />
            <button
              onClick={() => copy(prodUrl)}
              className="whitespace-nowrap rounded-xl border border-white/20 px-3 py-2 text-sm text-white/90 hover:bg-white/10"
            >
              Копировать
            </button>
          </div>
          <div className="mt-3 text-xs text-white/60">Контент-тип: application/json</div>
        </div>
      </div>

      {/* Секрет */}
      <div className="mb-6 rounded-2xl border border-white/15 bg-white/5 p-4">
        <div className="mb-2 text-base font-semibold text-white/90">
          Общий секрет (<code>POSTBACK_SHARED_SECRET</code>)
        </div>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={secret}
            type="password"
            className="w-full rounded-xl border border-white/15 bg-zinc-900 px-3 py-2 text-sm text-white outline-none"
          />
          <button
            onClick={() => copy(secret)}
            className="whitespace-nowrap rounded-xl border border-white/20 px-3 py-2 text-sm text-white/90 hover:bg-white/10"
          >
            {copied ? "Скопировано" : "Копировать"}
          </button>
        </div>
        <div className="mt-3 text-xs text-amber-300/80">
          Не делитесь секретом публично. При смене секрета обновите интеграции партнёров.
        </div>
      </div>

      {/* Пример запроса */}
      <div className="mb-6 rounded-2xl border border-white/15 bg-white/5 p-4">
        <div className="mb-2 text-base font-semibold text-white/90">Пример запроса</div>
        <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white/90">
{`POST ${prodUrl}
Content-Type: application/json

{
  "secret": "<POSTBACK_SHARED_SECRET>",
  "offerId": "offer_123",
  "txId":   "ext_456",
  "type":   "DEP",          // REG | DEP | SALE | REBILL | LEAD
  "amount": 100.00,
  "currency": "USD",
  "subId": "source-1",
  "userId": null
}`}
        </pre>
      </div>

      {/* Drawer */}
      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} locale={locale} />
    </section>
  );
}
