import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { verifyApplicationStatusToken } from "@/lib/nexus-application-status";

export const dynamic = "force-dynamic";

function maskEmail(value: string) {
  const [local, domain] = value.split("@");

  if (!local || !domain) return "Submitted account";

  const visible =
    local.length <= 2
      ? local.slice(0, 1)
      : local.slice(0, 2);

  return `${visible}${"*".repeat(
    Math.max(3, Math.min(local.length - visible.length, 8)),
  )}@${domain}`;
}

export default async function ApplicationStatusPage(
  props: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ token?: string }>;
  },
) {
  const { locale } = await props.params;
  const { token = "" } = await props.searchParams;

  const payload = token
    ? verifyApplicationStatusToken(token)
    : null;

  const application = payload
    ? await prisma.affiliateApplication.findFirst({
        where: {
          id: payload.applicationId,
          userId: payload.userId,
        },
        select: {
          status: true,
          rejectionReason: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      })
    : null;

  if (!payload || !application) {
    return (
      <main className="min-h-screen bg-[#09090b] px-4 py-12 text-[#f7f7f8]">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(118,87,255,.16),transparent_38%)]" />
        <div className="relative mx-auto max-w-xl">
          <Link
            href={`/${locale}`}
            className="text-xs font-semibold tracking-[0.22em] text-[#b8aaff]"
          >
            NEXUS ALLIANCE
          </Link>

          <section className="mt-8 rounded-2xl border border-white/[0.10] bg-[#0d0d10]/95 p-7 shadow-[0_24px_80px_rgba(0,0,0,.45)]">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.10] bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
              Status link unavailable
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em]">
              Application status
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-[#9999a2]">
              This status link is invalid or has expired. Sign in with the
              credentials used for your application to generate a fresh
              secure status link.
            </p>

            <div className="mt-7 flex flex-col gap-2 sm:flex-row">
              <Link
                href={`/${locale}/login`}
                className="rounded-lg bg-[#7657ff] px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#866cff]"
              >
                Affiliate login
              </Link>

              <Link
                href={`/${locale}`}
                className="rounded-lg border border-white/[0.12] bg-[#18181d] px-4 py-2.5 text-center text-sm font-medium text-[#f7f7f8] hover:border-[#7657ff]/40"
              >
                Back to NEXUS
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const status = String(application.status);
  const isRejected = status === "REJECTED";
  const isApproved = status === "APPROVED";

  const badgeClass = isRejected
    ? "border-rose-400/20 bg-rose-400/10 text-rose-300"
    : isApproved
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : "border-amber-400/20 bg-amber-400/10 text-amber-300";

  const dotClass = isRejected
    ? "bg-rose-300"
    : isApproved
      ? "bg-emerald-300"
      : "bg-amber-300";

  const badge = isRejected
    ? "Application rejected"
    : isApproved
      ? "Application approved"
      : "Pending review";

  const heading = isRejected
    ? "Application not approved"
    : isApproved
      ? "Welcome to NEXUS"
      : "Application received";

  const description = isRejected
    ? "Your NEXUS ALLIANCE application was reviewed and was not approved for platform access."
    : isApproved
      ? "Your NEXUS ALLIANCE application has been approved. You can now sign in to your affiliate workspace."
      : "Your NEXUS ALLIANCE application is stored and waiting for review. Platform access remains locked until a staff member approves the account.";

  return (
    <main className="min-h-screen bg-[#09090b] px-4 py-12 text-[#f7f7f8]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(118,87,255,.16),transparent_38%)]" />
      <div className="relative mx-auto max-w-xl">
        <Link
          href={`/${locale}`}
          className="text-xs font-semibold tracking-[0.22em] text-[#b8aaff]"
        >
          NEXUS ALLIANCE
        </Link>

        <section className="mt-8 rounded-2xl border border-white/[0.10] bg-[#0d0d10]/95 p-7 shadow-[0_24px_80px_rgba(0,0,0,.45)]">
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] ${badgeClass}`}
          >
            <span className={`size-1.5 rounded-full ${dotClass}`} />
            {badge}
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em]">
            {heading}
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-[#9999a2]">
            {description}
          </p>

          <div className="mt-6 rounded-xl border border-white/[0.08] bg-[#111115] p-4">
            <div className="flex items-center justify-between gap-4 py-2 text-sm">
              <span className="text-[#777780]">Status</span>
              <span
                className={
                  isRejected
                    ? "font-medium text-rose-300"
                    : isApproved
                      ? "font-medium text-emerald-300"
                      : "font-medium text-amber-300"
                }
              >
                {badge}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-white/[0.07] py-2 text-sm">
              <span className="text-[#777780]">Account email</span>
              <span className="truncate text-[#d7d7dd]">
                {maskEmail(application.user.email)}
              </span>
            </div>
          </div>

          {isRejected && application.rejectionReason ? (
            <div className="mt-5 rounded-xl border border-rose-400/15 bg-rose-400/[0.06] p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-300/70">
                Review note
              </div>
              <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-rose-100/70">
                {application.rejectionReason}
              </p>
            </div>
          ) : null}

          <p className="mt-5 text-xs leading-relaxed text-[#777780]">
            {isRejected
              ? "If you believe additional information may change the review outcome, contact the NEXUS partnerships team."
              : isApproved
                ? "Use the email and password from your application to access the workspace."
                : "Once approved, you can sign in with the email and password used in the application. If we need more information, the partnerships team will contact you via Telegram or email."}
          </p>

          <div className="mt-7 flex flex-col gap-2 sm:flex-row">
            {isApproved ? (
              <Link
                href={`/${locale}/login`}
                className="rounded-lg bg-[#7657ff] px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#866cff]"
              >
                Sign in to NEXUS
              </Link>
            ) : (
              <Link
                href={`/${locale}`}
                className="rounded-lg bg-[#7657ff] px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#866cff]"
              >
                Back to NEXUS
              </Link>
            )}

            <a
              href="mailto:partners@nexusalliance.io"
              className="rounded-lg border border-white/[0.12] bg-[#18181d] px-4 py-2.5 text-center text-sm font-medium text-[#f7f7f8] hover:border-[#7657ff]/40"
            >
              Contact NEXUS
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}