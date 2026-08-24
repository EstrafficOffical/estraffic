import Link from "next/link";

type Props = {
  locale: string;
  user: { name?: string | null; email?: string | null; tier: number; managerName?: string | null };
  metrics: {
    revenue: number;
    clicks: number;
    registrations: number;
    ftd: number;
    available: number;
    pendingPayouts: number;
    approvedOffers: number;
  };
  recentConversions: Array<{ id: string; type: string; amount: number; currency: string; createdAt: Date; offerTitle: string }>;
};

const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n || 0);
const num = (n: number) => new Intl.NumberFormat("en-US").format(n || 0);

export default function NexusDashboard({ locale, user, metrics, recentConversions }: Props) {
  const firstName = (user.name || user.email || "Partner").split(/[\s@]/)[0];
  const regToFtd = metrics.registrations > 0 ? (metrics.ftd / metrics.registrations) * 100 : null;

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-7 md:px-7 md:py-8">
      <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8068ff]">Tier {user.tier} affiliate</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.025em] text-white md:text-[38px]">Good morning, {firstName}.</h1>
          <p className="mt-2 text-sm text-white/42">Here is how your traffic is performing.</p>
        </div>
        <Link href={`/${locale}/offers`} className="inline-flex h-10 items-center justify-center rounded-lg border border-[#7657ff]/40 bg-[#7657ff] px-4 text-[13px] font-semibold text-white shadow-[0_10px_30px_rgba(118,87,255,.16)] transition hover:bg-[#8068ff]">Browse offers</Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Revenue" value={usd(metrics.revenue)} emphasis />
        <Metric label="FTD" value={num(metrics.ftd)} />
        <Metric label="Registrations" value={num(metrics.registrations)} />
        <Metric label="Clicks" value={num(metrics.clicks)} />
        <Metric label="Reg → FTD" value={regToFtd == null ? "N/A" : `${regToFtd == null ? "N/A" : `${regToFtd.toFixed(2)}%`}`} />
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-hidden rounded-xl border border-white/[0.075] bg-white/[0.02]">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
            <div><div className="text-sm font-semibold">Performance</div><div className="mt-1 text-xs text-white/38">Real metrics from your NEXUS development database.</div></div>
            <Link href={`/${locale}/stats`} className="text-xs font-medium text-[#8b73ff]">Open statistics →</Link>
          </div>
          <div className="grid min-h-[260px] place-items-center px-6 py-12 text-center">
            <div>
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-[#8068ff]">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 18l5-6 4 3 7-9"/><path d="M17 6h3v3"/></svg>
              </div>
              <div className="mt-4 text-sm font-medium text-white/75">Performance chart is ready for live traffic</div>
              <div className="mx-auto mt-2 max-w-md text-xs leading-5 text-white/34">Clicks and conversions will populate this workspace as tracking events reach the existing NEXUS backend.</div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <Panel title="Balance" subtitle="Validated funds and payout reservations.">
            <div className="space-y-4">
              <Value label="Available balance" value={usd(metrics.available)} />
              <div className="h-px bg-white/[0.07]" />
              <Value label="Pending payouts" value={usd(metrics.pendingPayouts)} muted />
            </div>
          </Panel>
          <Panel title="Your account" subtitle="Affiliate access and account management.">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-white/40">Tier</span><span>Tier {user.tier}</span></div>
              <div className="flex items-center justify-between"><span className="text-white/40">Approved offers</span><span>{metrics.approvedOffers}</span></div>
              <div className="flex items-center justify-between"><span className="text-white/40">Manager</span><span>{user.managerName || "Unassigned"}</span></div>
            </div>
          </Panel>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border border-white/[0.075] bg-white/[0.02]">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <div><div className="text-sm font-semibold">Recent conversions</div><div className="mt-1 text-xs text-white/38">Latest attributed events from your account.</div></div>
          <Link href={`/${locale}/stats`} className="text-xs font-medium text-[#8b73ff]">View all →</Link>
        </div>
        {recentConversions.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-white/35">No conversions recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[660px] text-sm">
              <thead><tr className="text-left text-[10px] uppercase tracking-[0.14em] text-white/32"><th className="px-5 py-3 font-medium">Event</th><th className="px-3 py-3 font-medium">Offer</th><th className="px-3 py-3 font-medium">Time</th><th className="px-5 py-3 text-right font-medium">Amount</th></tr></thead>
              <tbody className="divide-y divide-white/[0.06]">{recentConversions.map((c) => <tr key={c.id} className="hover:bg-white/[0.02]"><td className="px-5 py-3.5"><span className="rounded-md border border-[#7657ff]/25 bg-[#7657ff]/10 px-2 py-1 text-[10px] font-semibold text-[#927cff]">{c.type}</span></td><td className="px-3 py-3.5 text-white/72">{c.offerTitle}</td><td className="px-3 py-3.5 text-xs text-white/38">{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(c.createdAt)}</td><td className="px-5 py-3.5 text-right font-medium">{c.amount ? new Intl.NumberFormat("en-US", { style: "currency", currency: c.currency || "USD" }).format(c.amount) : "—"}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return <div className={`rounded-xl border p-4 ${emphasis ? "border-[#7657ff]/25 bg-[#7657ff]/[0.065]" : "border-white/[0.075] bg-white/[0.02]"}`}><div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/34">{label}</div><div className="mt-3 text-[25px] font-semibold tracking-[-0.03em] text-white">{value}</div><div className="mt-3 text-[11px] text-white/28">Live account data</div></div>;
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-xl border border-white/[0.075] bg-white/[0.02]"><div className="border-b border-white/[0.07] px-5 py-4"><div className="text-sm font-semibold">{title}</div><div className="mt-1 text-xs text-white/38">{subtitle}</div></div><div className="p-5">{children}</div></div>;
}

function Value({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return <div><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/32">{label}</div><div className={`mt-2 text-[27px] font-semibold tracking-[-0.03em] ${muted ? "text-white/55" : "text-white"}`}>{value}</div></div>;
}
