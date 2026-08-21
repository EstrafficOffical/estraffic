import Link from "next/link";

export default function ApplicationStatusPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { email?: string };
}) {
  const email = (searchParams.email || "").trim();

  return (
    <main className="min-h-screen bg-[#09090b] px-4 py-12 text-[#f7f7f8]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(118,87,255,.16),transparent_38%)]" />
      <div className="relative mx-auto max-w-xl">
        <Link href={`/${locale}`} className="text-xs font-semibold tracking-[0.22em] text-[#b8aaff]">
          NEXUS ALLIANCE
        </Link>
        <section className="mt-8 rounded-2xl border border-white/[0.10] bg-[#0d0d10]/95 p-7 shadow-[0_24px_80px_rgba(0,0,0,.45)]">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-300">
            <span className="size-1.5 rounded-full bg-amber-300" /> Pending review
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em]">Application received</h1>
          <p className="mt-3 text-sm leading-relaxed text-[#9999a2]">
            Your NEXUS ALLIANCE application has been stored and is waiting for review. Platform access remains locked until a staff member approves the account.
          </p>

          <div className="mt-6 rounded-xl border border-white/[0.08] bg-[#111115] p-4">
            <div className="flex items-center justify-between gap-4 py-2 text-sm">
              <span className="text-[#777780]">Status</span>
              <span className="font-medium text-amber-300">Pending review</span>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-white/[0.07] py-2 text-sm">
              <span className="text-[#777780]">Account email</span>
              <span className="truncate text-[#d7d7dd]">{email || "Submitted account"}</span>
            </div>
          </div>

          <p className="mt-5 text-xs leading-relaxed text-[#777780]">
            Once approved, you can sign in with the email and password used in the application. If we need more information, the partnerships team will contact you via Telegram or email.
          </p>

          <div className="mt-7 flex flex-col gap-2 sm:flex-row">
            <Link href={`/${locale}`} className="rounded-lg bg-[#7657ff] px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#866cff]">
              Back to NEXUS
            </Link>
            <a href="mailto:partners@nexusalliance.io" className="rounded-lg border border-white/[0.12] bg-[#18181d] px-4 py-2.5 text-center text-sm font-medium text-[#f7f7f8] hover:border-[#7657ff]/40">
              Contact NEXUS
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
