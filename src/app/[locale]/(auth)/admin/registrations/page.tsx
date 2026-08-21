import "server-only";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import RegistrationActions from "./RegistrationActions";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string; status?: string };

export default async function PendingRegistrationsPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: SearchParams;
}) {
  const session = await auth();
  const role = String((session?.user as any)?.role || "");
  if (!session?.user) redirect(`/${locale}/login?callbackUrl=/${locale}/admin/registrations`);
  if (!new Set(["OWNER", "ADMIN"]).has(role)) redirect(`/${locale}`);

  const q = (searchParams.q || "").trim();
  const status = (searchParams.status || "PENDING").toUpperCase();

  const [applications, managers] = await Promise.all([
    prisma.affiliateApplication.findMany({
      where: {
        ...(status === "ALL" ? {} : { status: status as any }),
        ...(q
          ? {
              user: {
                is: {
                  OR: [
                    { name: { contains: q, mode: "insensitive" } },
                    { email: { contains: q, mode: "insensitive" } },
                    { telegram: { contains: q, mode: "insensitive" } },
                  ],
                },
              },
            }
          : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true, telegram: true, createdAt: true } },
        reviewedBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { role: { in: ["MANAGER", "ADMIN", "OWNER"] }, status: "APPROVED" },
      select: { id: true, name: true, email: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <main className="min-h-screen bg-[#09090b] px-4 py-8 text-[#f7f7f8]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8b72ff]">Admin</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">Pending registrations</h1>
            <p className="mt-2 text-sm text-[#888891]">Real affiliate applications stored in the NEXUS development database.</p>
          </div>
          <Link href={`/${locale}/admin/users`} className="rounded-lg border border-white/[0.12] bg-[#18181d] px-3.5 py-2 text-sm text-[#d8d8de] hover:border-[#7657ff]/40">
            Users
          </Link>
        </div>

        <form className="mb-4 flex flex-wrap gap-2 rounded-xl border border-white/[0.09] bg-[#0d0d10] p-3">
          <input name="q" defaultValue={q} placeholder="Search name, email, Telegram…" className="min-w-64 flex-1 rounded-lg border border-white/[0.10] bg-[#111115] px-3 py-2 text-sm outline-none focus:border-[#7657ff]/50" />
          <select name="status" defaultValue={status} className="rounded-lg border border-white/[0.10] bg-[#111115] px-3 py-2 text-sm">
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="ALL">All</option>
          </select>
          <button className="rounded-lg bg-[#7657ff] px-4 py-2 text-sm font-semibold">Filter</button>
        </form>

        <div className="space-y-3">
          {applications.map((application) => (
            <article key={application.id} className="rounded-2xl border border-white/[0.09] bg-[#0d0d10] p-5">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{application.user.name || application.user.email}</h2>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.10em] ${
                      application.status === "PENDING"
                        ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
                        : application.status === "APPROVED"
                          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                          : "border-rose-400/20 bg-rose-400/10 text-rose-300"
                    }`}>
                      {application.status}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-[#888891]">{application.user.email} · {application.user.telegram || "No Telegram"}</div>
                  <div className="mt-1 text-xs text-[#66666f]">Submitted {application.createdAt.toLocaleString()}</div>
                </div>
                <div className="text-sm text-[#9999a2]">{application.company || "Individual affiliate"}</div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Info label="Traffic sources" value={application.trafficSources.join(" · ")} />
                <Info label="Main GEOs" value={application.mainGeos.join(" · ")} />
                <Info label="Verticals" value={application.verticalInterests.join(" · ")} />
                <Info label="Estimated volume" value={application.estimatedMonthlyVolume || "—"} />
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Info label="Experience" value={application.experience || "—"} />
                <Info label="About" value={application.about || "—"} />
              </div>

              {application.status === "PENDING" ? (
                <RegistrationActions applicationId={application.id} managers={managers} />
              ) : (
                <div className="mt-5 rounded-xl border border-white/[0.08] bg-[#111115] p-3 text-xs text-[#888891]">
                  Reviewed {application.reviewedAt?.toLocaleString() || "—"} by {application.reviewedBy?.name || application.reviewedBy?.email || "staff"}
                  {application.rejectionReason ? ` · Reason: ${application.rejectionReason}` : ""}
                </div>
              )}
            </article>
          ))}

          {!applications.length ? (
            <div className="rounded-2xl border border-dashed border-white/[0.10] bg-[#0d0d10] px-6 py-14 text-center">
              <div className="text-sm font-medium">No applications found</div>
              <div className="mt-1 text-xs text-[#777780]">Submit a new Apply to join form and it will appear here immediately.</div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#111115] p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#66666f]">{label}</div>
      <div className="mt-1.5 text-sm leading-relaxed text-[#d2d2d8]">{value}</div>
    </div>
  );
}
