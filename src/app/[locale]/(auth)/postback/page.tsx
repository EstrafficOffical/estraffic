'use client'

import React, { useEffect, useState, type FC } from "react";

export default function Page() {
  const [origin, setOrigin] = useState("");
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const baseDev = origin.includes("localhost") ? origin : "http://localhost:3000";
  const baseProd = origin.includes("localhost") ? "https://<домен>" : origin || "https://<домен>";
  const [secret, setSecret] = useState("<POSTBACK_SHARED_SECRET>");
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/postbacks/secret", { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (r.ok && (j as any)?.secret) setSecret(String((j as any).secret));
      } catch { /* ignore */ }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 text-white/90">
      <Header />
      <Card title="Обзор">
        <p className="text-white/80">
          Этот раздел описывает приём постбеков в Estrella. Используйте его, чтобы
          отправлять события (регистрация, депозит, продажа и т.д.) в систему.
          Эндпоинт идемпотентен по паре <code className="mx-1 rounded bg-white/10 px-1 py-0.5">(offerId, txId)</code>.
        </p>
      </Card>
      <Card title="Эндпоинт">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="mb-2 text-white/80">URL (dev)</h4>
            <CodeInline>{baseDev}/api/postbacks/ingest</CodeInline>
          </div>
          <div>
            <h4 className="mb-2 text-white/80">URL (prod)</h4>
            <CodeInline>{baseProd}/api/postbacks/ingest</CodeInline>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <InfoPill>Метод: <strong>POST</strong> (JSON) · допускается GET для отладки</InfoPill>
          <InfoPill>Контент‑тип: <strong>application/json</strong></InfoPill>
        </div>
      </Card>
      <SecretCard secret={secret} />
      <Card title="Параметры тела запроса (JSON)">
        <ParamTable />
      </Card>
      <Examples baseDev={baseDev} baseProd={baseProd} />
      <Card title="Коды ответов и ошибки">
        <ul className="list-disc space-y-2 pl-6 text-white/80">
          <li><b>200 OK</b> — событие принято (или уже было принято ранее по тому же <code className="mx-1 rounded bg-white/10 px-1 py-0.5">offer_id+tx_id</code>).</li>
          <li><b>400 Bad Request</b> — некорректный JSON или отсутствуют <code className="mx-1 rounded bg-white/10 px-1 py-0.5">offer_id/tx_id</code>.</li>
          <li><b>401 Unauthorized</b> — неверный <code className="mx-1 rounded bg-white/10 px-1 py-0.5">secret</code> (или подпись, если включена HMAC‑проверка).</li>
          <li><b>429 Too Many Requests</b> — лимит запросов превышен (если включён rate‑limit).</li>
          <li><b>5xx</b> — внутренняя ошибка; повторите запрос позже.</li>
        </ul>
      </Card>
      <Card title="Идемпотентность (без повторов)">
        <p className="text-white/80">
          Повторная отправка события с теми же <code className="mx-1 rounded bg-white/10 px-1 py-0.5">offer_id</code> и <code className="mx-1 rounded bg-white/10 px-1 py-0.5">tx_id</code>
          не создаёт дубликатов — используется <span className="rounded bg-white/10 px-1 py-0.5">upsert</span> по уникальному индексу.
          Возвращается <b>200 OK</b>.
        </p>
      </Card>
      <Card title="Безопасность">
        <ul className="list-disc space-y-2 pl-6 text-white/80">
          <li>Всегда передавайте <code className="mx-1 rounded bg-white/10 px-1 py-0.5">secret</code> в теле запроса.</li>
          <li>Рекомендуется включить HMAC‑подпись: заголовок <code className="mx-1 rounded bg-white/10 px-1 py-0.5">X-Signature</code> = <code className="mx-1 rounded bg-white/10 px-1 py-0.5">hex(hmac_sha256(rawBody, secret))</code>.</li>
          <li>Для догенерации <code className="mx-1 rounded bg-white/10 px-1 py-0.5">userId</code> по клику используйте <code className="mx-1 rounded bg-white/10 px-1 py-0.5">subId</code> (или <code className="mx-1 rounded bg-white/10 px-1 py-0.5">clickId</code>) совпадающий с тем, что передавали в <code className="mx-1 rounded bg-white/10 px-1 py-0.5">/api/t</code>.</li>
        </ul>
      </Card>
    </div>
  );
}

const Header: FC = () => (
  <div className="rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur-md shadow-[0_8px_40px_rgba(0,0,0,0.45)]">
    <h1 className="text-2xl font-semibold">Документация по постбекам</h1>
    <p className="mt-1 text-white/70">Эндпоинт для приёма событий (REG/DEP/SALE/...). Скопируйте примеры ниже и выполните тест.</p>
  </div>
);

const Card: FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur-md shadow-[0_8px_40px_rgba(0,0,0,0.45)]">
    <h2 className="mb-3 text-lg font-semibold">{title}</h2>
    <div>{children}</div>
  </section>
);

const CodeInline: FC<{ children: React.ReactNode }> = ({ children }) => (
  <code className="rounded bg-white/10 px-1 py-0.5 text-white/90">{children}</code>
);

const InfoPill: FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white/80">
    {children}
  </div>
);

function maskSecret(s: string) {
  if (!s || s === "<POSTBACK_SHARED_SECRET>") return "<POSTBACK_SHARED_SECRET>";
  if (s.length <= 6) return "••" + s.slice(-2);
  return s.replace(/.(?=.{4})/g, "•");
}

const SecretCard: FC<{ secret: string }> = ({ secret }) => {
  return (
    <Card title="Общий секрет (POSTBACK_SHARED_SECRET)">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-white/80">
          Передавайте этот секрет в каждом запросе (поле <CodeInline>secret</CodeInline>). Значение скрыто — используйте кнопку копирования.
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 font-mono text-sm">{maskSecret(secret)}</div>
          <CopyButton label="Копировать" copyText={secret} />
        </div>
      </div>
      <p className="mt-2 text-xs text-white/60">⚠️ Не делитесь секретом публично. При смене секрета обновите интеграции партнёров.</p>
    </Card>
  );
};

const ParamTable: FC = () => (
  <div className="overflow-x-auto">
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-white/5 text-left text-white/80">
          <th className="px-3 py-2">Поле</th>
          <th className="px-3 py-2">Тип</th>
          <th className="px-3 py-2">Обяз.</th>
          <th className="px-3 py-2">Описание</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/10">
        {[
          { k: "secret", t: "string", req: true, d: "Общий секрет, должен совпадать с POSTBACK_SHARED_SECRET" },
          { k: "offer_id", t: "string", req: true, d: "ID оффера" },
          { k: "tx_id", t: "string", req: true, d: "Уникальный ID события на стороне источника" },
          { k: "event", t: "string", req: false, d: "Тип события: REG | DEP | SALE | LEAD | ..." },
          { k: "amount", t: "number", req: false, d: "Сумма (для денежных событий)" },
          { k: "currency", t: "string", req: false, d: "Валюта (ISO код), например USD" },
          { k: "subId", t: "string", req: false, d: "Идентификатор источника/канала. Нужен, чтобы найти связанный клик и userId" },
          { k: "clickId", t: "string", req: false, d: "Альтернатива subId: ID клика" },
          { k: "timestamp", t: "number", req: false, d: "UNIX‑время отправки (рекомендуется для HMAC и анти‑replay)" },
        ].map((row) => (
          <tr key={row.k} className="text-white/80">
            <td className="px-3 py-2 font-mono">{row.k}</td>
            <td className="px-3 py-2">{row.t}</td>
            <td className="px-3 py-2">{row.req ? "Да" : "Нет"}</td>
            <td className="px-3 py-2">{row.d}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Examples: FC<{ baseDev: string; baseProd: string }> = ({ baseDev, baseProd }) => {
  const curlREG = (base: string) => `curl -X POST "${base}/api/postbacks/ingest" \
  -H "Content-Type: application/json" \
  -d '{"secret":"<POSTBACK_SHARED_SECRET>","offer_id":"of_demo_stats","tx_id":"TX-2001","event":"REG","subId":"fb"}'`;
  const curlDEP = (base: string) => `curl -X POST "${base}/api/postbacks/ingest" \
  -H "Content-Type: application/json" \
  -d '{"secret":"<POSTBACK_SHARED_SECRET>","offer_id":"of_demo_stats","tx_id":"TX-2002","event":"DEP","amount":25.5,"currency":"USD","subId":"fb"}'`;
  const psREG = (base: string) => `$secret = "<POSTBACK_SHARED_SECRET>"
Invoke-RestMethod -Method Post -Uri "${base}/api/postbacks/ingest" -ContentType "application/json" -Body (@{
  secret   = $secret
  offer_id = "of_demo_stats"
  tx_id    = "TX-2001"
  event    = "REG"
  subId    = "fb"
} | ConvertTo-Json)`;
  const psDEP = (base: string) => `$secret = "<POSTBACK_SHARED_SECRET>"
Invoke-RestMethod -Method Post -Uri "${base}/api/postbacks/ingest" -ContentType "application/json" -Body (@{
  secret   = $secret
  offer_id = "of_demo_stats"
  tx_id    = "TX-2002"
  event    = "DEP"
  amount   = 25.5
  currency = "USD"
  subId    = "fb"
} | ConvertTo-Json)`;

  return (
    <Card title="Примеры (curl / PowerShell)">
      <p className="mb-3 text-white/70">Скопируйте любой пример, замените <CodeInline>&lt;POSTBACK_SHARED_SECRET&gt;</CodeInline> на ваш секрет и выполните. Ожидается ответ <b>{`{ ok: true }`}</b>.</p>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <h4 className="text-white/80">Dev (localhost)</h4>
          <CodeBlock code={curlREG(baseDev)} lang="bash" />
          <CodeBlock code={curlDEP(baseDev)} lang="bash" />
          <CodeBlock code={psREG(baseDev)} lang="powershell" />
          <CodeBlock code={psDEP(baseDev)} lang="powershell" />
        </div>
        <div className="space-y-3">
          <h4 className="text-white/80">Prod (домен)</h4>
          <CodeBlock code={curlREG(baseProd)} lang="bash" />
          <CodeBlock code={curlDEP(baseProd)} lang="bash" />
          <CodeBlock code={psREG(baseProd)} lang="powershell" />
          <CodeBlock code={psDEP(baseProd)} lang="powershell" />
        </div>
      </div>
    </Card>
  );
};

function classNames(...a: Array<string | false | null | undefined>) { return a.filter(Boolean).join(" "); }

const CodeBlock: FC<{ code: string; lang?: string }> = ({ code, lang }) => (
  <div className="relative">
    <pre className={classNames("rounded-2xl border border-white/15 bg-black/60 p-4 overflow-x-auto text-sm", lang === "powershell" ? "" : "")}><code>{code}</code></pre>
    <div className="absolute right-2 top-2">
      <CopyButton copyText={code} />
    </div>
  </div>
);

const CopyButton: FC<{ copyText: string; label?: string }> = ({ copyText, label = "Copy" }) => {
  const [state, setState] = useState<"idle" | "ok" | "err">("idle");
  return (
    <button
      onClick={async () => {
        try { await navigator.clipboard.writeText(copyText); setState("ok"); setTimeout(() => setState("idle"), 1200); }
        catch { setState("err"); setTimeout(() => setState("idle"), 1200); }
      }}
      className="rounded-xl border border-white/15 bg-white/5 px-3 py-1 text-sm text-white/80 hover:bg-white/10"
      title="Копировать"
    >
      {state === "idle" && (label || "Копировать")}
      {state === "ok" && "Скопировано"}
      {state === "err" && "Ошибка"}
    </button>
  );
};
