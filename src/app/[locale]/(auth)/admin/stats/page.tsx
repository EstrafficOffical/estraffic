import "server-only";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export default async function ControlCenter({ params: { locale } }: { params: { locale: string } }) {
  const session = await auth();
  const role = String((session?.user as any)?.role || "");
  if (!session?.user || !["OWNER", "ADMIN"].includes(role)) redirect(`/${locale}`);

  const [pendingRegistrations, affiliates, staff, offers, clicks, conversions, revenueAgg, pendingRequests, recentApps, recentUsers] = await Promise.all([
    prisma.affiliateApplication.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { role: "USER", status: "APPROVED" } }),
    prisma.user.count({ where: { role: { in: ["MANAGER", "ADMIN", "OWNER"] }, status: "APPROVED" } }),
    prisma.offer.count({ where: { status: "ACTIVE" } }),
    prisma.click.count(),
    prisma.conversion.count(),
    prisma.conversion.aggregate({ _sum: { amount: true } }),
    prisma.offerRequest.count({ where: { status: "PENDING" } }),
    prisma.affiliateApplication.findMany({ take: 4, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true, email: true } } } }),
    prisma.user.findMany({ take: 5, orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, role: true, status: true, tier: true } }),
  ]);
  const revenue = Number(revenueAgg._sum.amount ?? 0);

  return (
    <div className="px-5 py-7 md:px-8 md:py-9">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8068ff]">Administration</div><h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em]">Control Center</h1><p className="mt-2 text-sm text-white/45">Live operational overview from the NEXUS development database.</p></div>
          <div className="flex gap-2"><Link href={`/${locale}/admin/registrations`} className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/70">Review registrations</Link><Link href={`/${locale}/admin/users`} className="rounded-lg bg-[#7657ff] px-4 py-2 text-sm font-semibold">Open users</Link></div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Kpi label="Network revenue" value={money(revenue)} accent />
          <Kpi label="Conversions" value={String(conversions)} />
          <Kpi label="Clicks" value={String(clicks)} />
          <Kpi label="Active affiliates" value={String(affiliates)} />
          <Kpi label="Active offers" value={String(offers)} />
          <Kpi label="Staff" value={String(staff)} />
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
          <section className="rounded-2xl border border-white/[0.08] bg-[#0d0d10]">
            <div className="border-b border-white/[0.07] p-5"><div className="text-sm font-semibold">Requires attention</div><div className="mt-1 text-xs text-white/40">Current operational queues.</div></div>
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <Attention label="Pending registrations" value={pendingRegistrations} href={`/${locale}/admin/registrations`} />
              <Attention label="Access requests" value={pendingRequests} href={`/${locale}/admin/requests`} />
            </div>
          </section>
          <section className="rounded-2xl border border-white/[0.08] bg-[#0d0d10]">
            <div className="border-b border-white/[0.07] p-5"><div className="text-sm font-semibold">Database health</div><div className="mt-1 text-xs text-white/40">Live records currently powering NEXUS.</div></div>
            <div className="grid grid-cols-2 gap-3 p-5"><Mini label="Users" value={affiliates + staff} /><Mini label="Offers" value={offers} /><Mini label="Clicks" value={clicks} /><Mini label="Conversions" value={conversions} /></div>
          </section>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <section className="rounded-2xl border border-white/[0.08] bg-[#0d0d10]">
            <div className="flex items-center justify-between border-b border-white/[0.07] p-5"><div><div className="text-sm font-semibold">Recent registrations</div><div className="mt-1 text-xs text-white/40">Latest affiliate applications.</div></div><Link className="text-xs text-[#8a72ff]" href={`/${locale}/admin/registrations`}>View all →</Link></div>
            <div className="divide-y divide-white/[0.06]">{recentApps.map(a => <div key={a.id} className="flex items-center justify-between gap-4 p-4"><div><div className="text-sm text-white/85">{a.user.name || a.user.email}</div><div className="mt-1 text-xs text-white/35">{a.user.email}</div></div><span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold text-amber-300">{a.status}</span></div>)}{!recentApps.length && <Empty text="No applications yet" />}</div>
          </section>
          <section className="rounded-2xl border border-white/[0.08] bg-[#0d0d10]">
            <div className="flex items-center justify-between border-b border-white/[0.07] p-5"><div><div className="text-sm font-semibold">Recent accounts</div><div className="mt-1 text-xs text-white/40">Newest accounts in the workspace.</div></div><Link className="text-xs text-[#8a72ff]" href={`/${locale}/admin/users`}>View users →</Link></div>
            <div className="divide-y divide-white/[0.06]">{recentUsers.map(u => <div key={u.id} className="flex items-center justify-between gap-4 p-4"><div><div className="text-sm text-white/85">{u.name || u.email}</div><div className="mt-1 text-xs text-white/35">{u.email}</div></div><div className="text-right"><div className="text-[10px] font-semibold text-[#8a72ff]">{u.role}</div><div className="mt-1 text-[10px] text-white/35">{u.role === "USER" ? `Tier ${u.tier}` : u.status}</div></div></div>)}</div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) { return <div className={`rounded-xl border p-4 ${accent ? "border-[#7657ff]/35 bg-[#7657ff]/[0.07]" : "border-white/[0.08] bg-[#0d0d10]"}`}><div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/38">{label}</div><div className="mt-3 text-2xl font-semibold tracking-[-0.03em]">{value}</div></div>; }
function Mini({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"><div className="text-xs text-white/40">{label}</div><div className="mt-2 text-xl font-semibold">{value.toLocaleString()}</div></div>; }
function Attention({ label, value, href }: { label: string; value: number; href: string }) { return <Link href={href} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 transition hover:border-[#7657ff]/30"><div className="flex items-center justify-between"><span className="text-sm text-white/70">{label}</span><span className={`rounded-full px-2 py-1 text-xs font-semibold ${value ? "bg-amber-400/10 text-amber-300" : "bg-emerald-400/10 text-emerald-300"}`}>{value}</span></div></Link>; }
function Empty({ text }: { text: string }) { return <div className="p-8 text-center text-sm text-white/35">{text}</div>; }
