import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import StaffAccessActions from "./StaffAccessActions";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string; status?: string };

export default async function UsersPage(
  props: { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const {
    locale
  } = params;

  const session = await auth();
  const role = String((session?.user as any)?.role || "");
  if (!session?.user || !["OWNER", "ADMIN", "MANAGER"].includes(role)) redirect(`/${locale}`);
  const q = (searchParams.q || "").trim();
  const status = (searchParams.status || "ALL").toUpperCase();
  const users = await prisma.user.findMany({
    where: { role: "USER", ...(status === "ALL" ? {} : { status: status as any }), ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { telegram: { contains: q, mode: "insensitive" } }] } : {}) },
    include: { assignedManager: { select: { id: true, name: true, email: true } }, application: { select: { mainGeos: true, trafficSources: true } }, _count: { select: { offerAccesses: true } } },
    orderBy: { createdAt: "desc" },
  });

  return <div className="px-5 py-7 md:px-8 md:py-9"><div className="mx-auto max-w-[1500px]">
    <div className="mb-6"><div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8068ff]">Administration</div><h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em]">Users</h1><p className="mt-2 text-sm text-white/45">Approved and pending affiliate accounts backed by PostgreSQL.</p></div>
    <form className="mb-4 flex gap-2 rounded-xl border border-white/[0.08] bg-[#0d0d10] p-3"><input name="q" defaultValue={q} placeholder="Search name, email, Telegram…" className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-[#111115] px-3 py-2 text-sm outline-none focus:border-[#7657ff]/40"/><select name="status" defaultValue={status} className="rounded-lg border border-white/[0.08] bg-[#111115] px-3 py-2 text-sm"><option value="ALL">All statuses</option><option value="APPROVED">Approved</option><option value="PENDING">Pending</option><option value="SUSPENDED">Suspended</option><option value="BANNED">Banned</option></select><button className="rounded-lg bg-[#7657ff] px-4 py-2 text-sm font-semibold">Filter</button></form>
    <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#0d0d10]"><table className="min-w-[1100px] w-full text-left text-sm"><thead className="border-b border-white/[0.07] text-[10px] uppercase tracking-[0.13em] text-white/35"><tr><th className="px-4 py-3">Affiliate</th><th className="px-4 py-3">Tier</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Manager</th><th className="px-4 py-3">Traffic</th><th className="px-4 py-3">Flows</th><th className="px-4 py-3">Registered</th><th className="px-4 py-3">Staff access</th></tr></thead><tbody className="divide-y divide-white/[0.06]">{users.map(u => <tr key={u.id} className="text-white/70"><td className="px-4 py-4"><div className="font-medium text-white/90">{u.name || "Unnamed affiliate"}</div><div className="mt-1 text-xs text-white/35">{u.email}{u.telegram ? ` · ${u.telegram}` : ""}</div></td><td className="px-4 py-4">Tier {u.tier}</td><td className="px-4 py-4"><Status value={u.status}/></td><td className="px-4 py-4">{u.assignedManager?.name || u.assignedManager?.email || "Unassigned"}</td><td className="px-4 py-4 text-xs text-white/45">{[...(u.application?.trafficSources || []), ...(u.application?.mainGeos || [])].slice(0,4).join(" · ") || "—"}</td><td className="px-4 py-4">{u._count.offerAccesses}</td><td className="px-4 py-4 text-xs text-white/45">{u.createdAt.toLocaleDateString()}</td><td className="px-4 py-4">{role === "OWNER" ? <StaffAccessActions userId={u.id} /> : <span className="text-xs text-white/30">OWNER only</span>}</td></tr>)}{!users.length && <tr><td colSpan={8} className="px-6 py-14 text-center text-white/35">No affiliates found</td></tr>}</tbody></table></div>
  </div></div>;
}
function Status({ value }: { value: string }) { const cls = value === "APPROVED" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : value === "PENDING" ? "border-amber-400/20 bg-amber-400/10 text-amber-300" : "border-rose-400/20 bg-rose-400/10 text-rose-300"; return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${cls}`}>{value}</span>; }
