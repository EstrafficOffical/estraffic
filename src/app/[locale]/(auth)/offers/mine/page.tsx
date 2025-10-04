"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import NavDrawer from "@/app/components/NavDrawer";

type MyOffer = {
  id: string;
  title: string;
  cpa: number | null;
  geo: string;
  vertical: string;
  mode: "Auto" | "Manual";
  capDaily?: number | null;
  capMonthly?: number | null;
  minDeposit?: number | null;
  holdDays?: number | null;
  rules?: string | null;
  targetUrl?: string | null;
};

export default function MyOffersPage() {
  const pathname = usePathname();
  const locale = (pathname?.split("/")?.[1] || "ru") as string;

  const [menuOpen, setMenuOpen] = useState(false);
  const [rows, setRows] = useState<MyOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  // для персонального линка
  const [userId, setUserId] = useState<string | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  // поля для ссылки
  const [subId, setSubId] = useState("");
  const [link, setLink] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/offers/mine", { cache: "no-store" });
        const data = await res.json();
        if (alive) setRows(Array.isArray(data) ? data : data.items ?? []);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // тянем сессию, чтобы знать userId и вшивать его в линк
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setUserLoading(true);
        const r = await fetch("/api/auth/session", { cache: "no-store" });
        const j = (await r.json()) as any;
        if (!alive) return;
        const id = j?.user?.id as string | undefined;
        setUserId(id ?? null);
      } catch {
        setUserId(null);
      } finally {
        if (alive) setUserLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r => `${r.title} ${r.geo} ${r.vertical}`.toLowerCase().includes(s));
  }, [rows, q]);

  async function complete(offerId: string) {
    const r = await fetch("/api/offers/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offerId }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j?.ok) {
      setRows(s => s.filter(x => x.id !== offerId));
    } else {
      alert(j?.error ?? "Failed");
    }
  }

  function buildLink(offerId: string) {
    const base =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL || "";

    // основной чистый путь /r; если вдруг он выключен, поменяй на /api/r
    const u = new URL(`/r/${offerId}`, base);
    if (subId) u.searchParams.set("subid", subId);
    if (userId) u.searchParams.set("user", userId);
    setLink(u.toString());
  }

  function copyLink() {
    if (!link) return;
    try { navigator.clipboard?.writeText(link); } catch {}
  }

  const fmtMoney = (n?: number | null) =>
    n == null ? "—" : `$${Number(n).toFixed(2)}`;

  return (
    <section className="relative max-w-7xl mx-auto px-4 py-8 space-y-6 text-white/90">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open navigation"
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 border border-white/40"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-white/80" aria-hidden>
            <path fill="currentColor" d="M12 2l2.6 6.9H22l-5.4 3.9 2.1 6.8L12 16.7 5.3 19.6 7.4 12.8 2 8.9h7.4L12 2z" />
          </svg>
        </button>
        <span className="font-semibold text-white">Estrella</span>
      </div>

      <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">My offers</h1>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search my offers"
            className="w-full rounded-xl px-10 py-3 outline-none bg-zinc-900 text-white placeholder:text-white/50 border border-white/15 backdrop-blur-xl focus:ring-2 focus:ring-white/20"
          />
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/60">🔎</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white/5 border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="text-white/70">
            <tr className="text-left">
              <Th>Offer</Th>
              <Th>CPA</Th>
              <Th>GEO</Th>
              <Th>Vertical</Th>
              <Th>Mode</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-6 text-white/60">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-white/60">No approved offers yet</td></tr>
            ) : (
              filtered.map((r) => {
                const isOpen = expanded === r.id;
                return (
                  <FragmentRow
                    key={r.id}
                    row={r}
                    isOpen={isOpen}
                    onToggle={() => setExpanded(isOpen ? null : r.id)}
                    onComplete={() => complete(r.id)}
                    subId={subId}
                    setSubId={setSubId}
                    link={link}
                    onBuildLink={() => buildLink(r.id)}
                    onCopyLink={copyLink}
                    canBuild={!userLoading && !!userId}
                    userReadyMsg={userLoading ? "Loading user…" : userId ? "" : "No user id"}
                    fmtMoney={fmtMoney}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} locale={locale} />
    </section>
  );
}

function FragmentRow(props: {
  row: MyOffer;
  isOpen: boolean;
  onToggle: () => void;
  onComplete: () => void;
  subId: string;
  setSubId: (v: string) => void;
  link: string | null;
  onBuildLink: () => void;
  onCopyLink: () => void;
  canBuild: boolean;
  userReadyMsg: string;
  fmtMoney: (n?: number | null) => string;
}) {
  const r = props.row;
  return (
    <>
      <tr className="border-t border-white/10">
        <Td className="font-medium">
          <button
            onClick={props.onToggle}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 mr-2"
            title={props.isOpen ? "Hide details" : "Show details"}
          >
            {props.isOpen ? "−" : "+"}
          </button>
          {r.title}
        </Td>
        <Td>{r.cpa != null ? `$${Number(r.cpa).toFixed(2)}` : "—"}</Td>
        <Td>{r.geo}</Td>
        <Td>{r.vertical}</Td>
        <Td><Badge tone={r.mode === "Auto" ? "blue" : "default"}>{r.mode}</Badge></Td>
        <Td>
          <button
            onClick={props.onComplete}
            className="rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 hover:bg-white/15"
            title="Скрыть из «Мои офферы»"
          >
            Завершить
          </button>
        </Td>
      </tr>

      {props.isOpen && (
        <tr className="bg-white/3">
          <td colSpan={6} className="px-4 py-3 border-t border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Блок 1: GEO/Vertical + Cap */}
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-white/60 text-xs">GEO / Vertical</div>
                <div className="mt-1 font-medium">
                  {r.geo} • {r.vertical}
                </div>
                {(r.capDaily != null || r.capMonthly != null) && (
                  <div className="mt-3">
                    <div className="text-white/60 text-xs">Caps</div>
                    <div className="font-medium">
                      Daily: {r.capDaily ?? "—"}{r.capMonthly != null ? ` • Monthly: ${r.capMonthly}` : ""}
                    </div>
                  </div>
                )}
                {r.minDeposit != null && (
                  <div className="mt-3">
                    <div className="text-white/60 text-xs">Min. Deposit</div>
                    <div className="font-medium">{props.fmtMoney(r.minDeposit)}</div>
                  </div>
                )}
                {r.holdDays != null && (
                  <div className="mt-3">
                    <div className="text-white/60 text-xs">Hold (days)</div>
                    <div className="font-medium">{r.holdDays}</div>
                  </div>
                )}
              </div>

              {/* Блок 2: Target URL */}
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-white/60 text-xs">Target URL</div>
                <div className="mt-1 truncate text-sm">{r.targetUrl ?? "—"}</div>
              </div>

              {/* Блок 3: Tracking Link */}
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-white/60 text-xs mb-1">Tracking Link</div>
                <div className="flex gap-2">
                  <input
                    placeholder="subId (optional)"
                    value={props.subId}
                    onChange={(e) => props.setSubId(e.target.value)}
                    className="flex-1 rounded-lg border border-white/15 bg-zinc-900 px-3 py-2 text-sm outline-none"
                  />
                  <button
                    onClick={props.onBuildLink}
                    disabled={!props.canBuild}
                    className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-60"
                    title={props.userReadyMsg}
                  >
                    Build link
                  </button>
                  <button
                    onClick={props.onCopyLink}
                    disabled={!props.link}
                    className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-60"
                    title="Copy"
                  >
                    Copy
                  </button>
                </div>
                {props.link && (
                  <div className="mt-2 break-all rounded-lg border border-white/10 bg-black/30 p-2 text-xs">
                    {props.link}
                  </div>
                )}
              </div>

              {/* Блок 4: Rules (во всю ширину на мобильном) */}
              {r.rules && (
                <div className="md:col-span-3 rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="text-white/60 text-xs">Rules</div>
                  <div className="mt-1 whitespace-pre-wrap text-sm leading-6">{r.rules}</div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-semibold">{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className ?? ""}`}>{children}</td>;
}
function Badge({
  children, tone = "default",
}: { children: React.ReactNode; tone?: "default" | "green" | "blue" | "orange" }) {
  const map: Record<string, string> = {
    default: "bg-white/10 border-white/20 text-white/80",
    green: "bg-emerald-400/15 border-emerald-400/30 text-emerald-200",
    blue: "bg-sky-400/15 border-sky-400/30 text-sky-200",
    orange: "bg-amber-400/15 border-amber-400/30 text-amber-200",
  };
  return <span className={`inline-flex items-center rounded-lg px-2 py-1 text-xs border ${map[tone]}`}>{children}</span>;
}
