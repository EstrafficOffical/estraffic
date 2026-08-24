import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasRecentStepUp } from "@/lib/nexus-step-up";
import {
  NexusFinanceBucket,
  NexusFinanceEntryKind,
  NexusPayoutStatus,
} from "@prisma/client";

export const dynamic = "force-dynamic";

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function dateTime(value: Date | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function tone(status: NexusPayoutStatus) {
  if (status === NexusPayoutStatus.PAID) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (
    status === NexusPayoutStatus.REQUESTED ||
    status === NexusPayoutStatus.APPROVED
  ) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  }

  return "border-red-500/20 bg-red-500/10 text-red-300";
}

async function requireStaff(locale: string) {
  const session = await auth();
  const role = String((session?.user as any)?.role || "");
  const userId = String((session?.user as any)?.id || "");

  if (!session?.user || !userId || !["OWNER", "ADMIN"].includes(role)) {
    redirect(`/${locale}`);
  }

  return { session, userId, role };
}

async function getBucketTotal(bucket: NexusFinanceBucket) {
  const result = await prisma.nexusFinanceLedger.aggregate({
    where: {
      currency: "USD",
      bucket,
    },
    _sum: { amount: true },
  });

  return Number(result._sum.amount || 0);
}

export default async function AdminPayoutsPage(
  props: {
    params: Promise<{ locale: string }>;
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
  }
) {
  const searchParams = await props.searchParams;
  const { locale } = await props.params;
  const resolvedSearchParams = searchParams;

  await requireStaff(locale);

  const payouts = await prisma.nexusPayout.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const userIds = Array.from(new Set(payouts.map((payout) => payout.userId)));

  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          name: true,
          email: true,
          tier: true,
        },
      })
    : [];

  const userById = new Map(users.map((user) => [user.id, user]));

  const [reserved, paid] = await Promise.all([
    getBucketTotal(NexusFinanceBucket.RESERVED),
    getBucketTotal(NexusFinanceBucket.PAID),
  ]);

  const requested = payouts.filter(
    (payout) => payout.status === NexusPayoutStatus.REQUESTED,
  );
  const approved = payouts.filter(
    (payout) => payout.status === NexusPayoutStatus.APPROVED,
  );

  const requestedAmount = requested.reduce(
    (sum, payout) => sum + Number(payout.amount),
    0,
  );

  const approvedAmount = approved.reduce(
    (sum, payout) => sum + Number(payout.amount),
    0,
  );

  const state = Array.isArray(resolvedSearchParams?.payout)
    ? resolvedSearchParams?.payout[0]
    : resolvedSearchParams?.payout;

  const message =
    state === "approved"
      ? "Payout approved. Funds remain reserved until payment is marked as paid."
      : state === "paid"
        ? "Payout marked as paid. Reserved balance moved to Paid."
        : state === "rejected"
          ? "Payout rejected. Reserved funds were returned to Available."
          : state === "invalid"
            ? "The requested payout action is no longer valid."
            : state === "tx-required"
              ? "Enter a transaction hash or payment reference before marking paid."
              : state === "error"
                ? "Payout operation failed. Check the server log."
                : null;

  async function approvePayout(fd: FormData) {
    "use server";
    const securitySession = await auth();
    const securityUserId = String(
      (securitySession?.user as any)?.id || "",
    );
    const securityRole = String(
      (securitySession?.user as any)?.role || "",
    );

    if (
      !securityUserId ||
      !["OWNER", "ADMIN"].includes(securityRole)
    ) {
      redirect(`/${locale}`);
    }

    if (!(await hasRecentStepUp(securityUserId))) {
      redirect(
        `/${locale}/security/step-up?callbackUrl=${encodeURIComponent(
          `/${locale}/admin/payouts`,
        )}`,
      );
    }
const staff = await requireStaff(locale);
    const payoutId = String(fd.get("payoutId") || "");

    if (!payoutId) {
      redirect(`/${locale}/admin/payouts?payout=invalid`);
    }

    try {
      await prisma.$transaction(
        async (tx) => {
          const payout = await tx.nexusPayout.findUnique({
            where: { id: payoutId },
          });

          if (!payout) {
            throw new Error("PAYOUT_NOT_FOUND");
          }

          if (payout.status === NexusPayoutStatus.APPROVED) return;

          if (payout.status !== NexusPayoutStatus.REQUESTED) {
            throw new Error("PAYOUT_NOT_REQUESTED");
          }

          const updated = await tx.nexusPayout.updateMany({
            where: {
              id: payout.id,
              status: NexusPayoutStatus.REQUESTED,
            },
            data: {
              status: NexusPayoutStatus.APPROVED,
              approvedAt: new Date(),
              reviewedById: staff.userId,
            },
          });

          if (updated.count !== 1) {
            throw new Error("PAYOUT_STATE_CHANGED");
          }
          await tx.nexusSecurityEvent.create({
            data: {
              eventType: "PAYOUT_APPROVED",
              userId: staff.userId,
              metadata: {
                payoutId: payout.id,
                affiliateUserId: payout.userId,
                amount: Number(payout.amount),
                currency: payout.currency,
                previousStatus: NexusPayoutStatus.REQUESTED,
                nextStatus: NexusPayoutStatus.APPROVED,
              },
            },
          });
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      console.error("[NEXUS PAYOUT APPROVE ERROR]", error);
      redirect(`/${locale}/admin/payouts?payout=error`);
    }

    revalidatePath(`/${locale}/admin/payouts`);
    revalidatePath(`/${locale}/finance`);
    redirect(`/${locale}/admin/payouts?payout=approved`);
  }

  async function markPaid(fd: FormData) {
    "use server";
    const securitySession = await auth();
    const securityUserId = String(
      (securitySession?.user as any)?.id || "",
    );
    const securityRole = String(
      (securitySession?.user as any)?.role || "",
    );

    if (
      !securityUserId ||
      !["OWNER", "ADMIN"].includes(securityRole)
    ) {
      redirect(`/${locale}`);
    }

    if (!(await hasRecentStepUp(securityUserId))) {
      redirect(
        `/${locale}/security/step-up?callbackUrl=${encodeURIComponent(
          `/${locale}/admin/payouts`,
        )}`,
      );
    }
const staff = await requireStaff(locale);
    const payoutId = String(fd.get("payoutId") || "");
    const txHash = String(fd.get("txHash") || "").trim();

    if (!payoutId) {
      redirect(`/${locale}/admin/payouts?payout=invalid`);
    }

    if (txHash.length < 3 || txHash.length > 255) {
      redirect(`/${locale}/admin/payouts?payout=tx-required`);
    }

    try {
      await prisma.$transaction(
        async (tx) => {
          const payout = await tx.nexusPayout.findUnique({
            where: { id: payoutId },
          });

          if (!payout) {
            throw new Error("PAYOUT_NOT_FOUND");
          }

          if (payout.status === NexusPayoutStatus.PAID) return;

          if (payout.status !== NexusPayoutStatus.APPROVED) {
            throw new Error("PAYOUT_NOT_APPROVED");
          }

          const amount = Number(payout.amount);

          const reserved = await tx.nexusFinanceLedger.aggregate({
            where: {
              userId: payout.userId,
              currency: payout.currency,
              bucket: NexusFinanceBucket.RESERVED,
            },
            _sum: { amount: true },
          });

          if (Number(reserved._sum.amount || 0) + 0.000001 < amount) {
            throw new Error("INSUFFICIENT_RESERVED_BALANCE");
          }

          const updated = await tx.nexusPayout.updateMany({
            where: {
              id: payout.id,
              status: NexusPayoutStatus.APPROVED,
            },
            data: {
              status: NexusPayoutStatus.PAID,
              txHash,
              paidAt: new Date(),
              reviewedById: staff.userId,
            },
          });

          if (updated.count !== 1) {
            throw new Error("PAYOUT_STATE_CHANGED");
          }

          await tx.nexusFinanceLedger.create({
            data: {
              userId: payout.userId,
              currency: payout.currency,
              bucket: NexusFinanceBucket.RESERVED,
              kind: NexusFinanceEntryKind.PAYOUT_PAID_RESERVED_DEBIT,
              amount: -amount,
              payoutId: payout.id,
              idempotencyKey: `payout:${payout.id}:paid-reserved-debit`,
              description: "Paid payout removed from reserved balance",
              metadata: {
                txHash,
                reviewedById: staff.userId,
              },
            },
          });

          await tx.nexusFinanceLedger.create({
            data: {
              userId: payout.userId,
              currency: payout.currency,
              bucket: NexusFinanceBucket.PAID,
              kind: NexusFinanceEntryKind.PAYOUT_PAID_CREDIT,
              amount,
              payoutId: payout.id,
              idempotencyKey: `payout:${payout.id}:paid-credit`,
              description: "Completed affiliate payout",
              metadata: {
                txHash,
                reviewedById: staff.userId,
              },
            },
          });
          await tx.nexusSecurityEvent.create({
            data: {
              eventType: "PAYOUT_PAID",
              userId: staff.userId,
              metadata: {
                payoutId: payout.id,
                affiliateUserId: payout.userId,
                amount,
                currency: payout.currency,
                txHash,
                previousStatus: NexusPayoutStatus.APPROVED,
                nextStatus: NexusPayoutStatus.PAID,
              },
            },
          });
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      console.error("[NEXUS PAYOUT PAID ERROR]", error);
      redirect(`/${locale}/admin/payouts?payout=error`);
    }

    revalidatePath(`/${locale}/admin/payouts`);
    revalidatePath(`/${locale}/finance`);
    redirect(`/${locale}/admin/payouts?payout=paid`);
  }

  async function rejectPayout(fd: FormData) {
    "use server";
    const securitySession = await auth();
    const securityUserId = String(
      (securitySession?.user as any)?.id || "",
    );
    const securityRole = String(
      (securitySession?.user as any)?.role || "",
    );

    if (
      !securityUserId ||
      !["OWNER", "ADMIN"].includes(securityRole)
    ) {
      redirect(`/${locale}`);
    }

    if (!(await hasRecentStepUp(securityUserId))) {
      redirect(
        `/${locale}/security/step-up?callbackUrl=${encodeURIComponent(
          `/${locale}/admin/payouts`,
        )}`,
      );
    }
const staff = await requireStaff(locale);
    const payoutId = String(fd.get("payoutId") || "");

    if (!payoutId) {
      redirect(`/${locale}/admin/payouts?payout=invalid`);
    }

    try {
      await prisma.$transaction(
        async (tx) => {
          const payout = await tx.nexusPayout.findUnique({
            where: { id: payoutId },
          });

          if (!payout) {
            throw new Error("PAYOUT_NOT_FOUND");
          }

          if (payout.status === NexusPayoutStatus.REJECTED) return;

          if (
            payout.status !== NexusPayoutStatus.REQUESTED &&
            payout.status !== NexusPayoutStatus.APPROVED
          ) {
            throw new Error("PAYOUT_CANNOT_BE_REJECTED");
          }

          const amount = Number(payout.amount);

          const reserved = await tx.nexusFinanceLedger.aggregate({
            where: {
              userId: payout.userId,
              currency: payout.currency,
              bucket: NexusFinanceBucket.RESERVED,
            },
            _sum: { amount: true },
          });

          if (Number(reserved._sum.amount || 0) + 0.000001 < amount) {
            throw new Error("INSUFFICIENT_RESERVED_BALANCE");
          }

          const updated = await tx.nexusPayout.updateMany({
            where: {
              id: payout.id,
              status: {
                in: [
                  NexusPayoutStatus.REQUESTED,
                  NexusPayoutStatus.APPROVED,
                ],
              },
            },
            data: {
              status: NexusPayoutStatus.REJECTED,
              rejectedAt: new Date(),
              reviewedById: staff.userId,
            },
          });

          if (updated.count !== 1) {
            throw new Error("PAYOUT_STATE_CHANGED");
          }

          await tx.nexusFinanceLedger.create({
            data: {
              userId: payout.userId,
              currency: payout.currency,
              bucket: NexusFinanceBucket.RESERVED,
              kind: NexusFinanceEntryKind.PAYOUT_REJECT_RESERVED_DEBIT,
              amount: -amount,
              payoutId: payout.id,
              idempotencyKey: `payout:${payout.id}:reject-reserved-debit`,
              description: "Rejected payout released reserved balance",
              metadata: {
                reviewedById: staff.userId,
              },
            },
          });

          await tx.nexusFinanceLedger.create({
            data: {
              userId: payout.userId,
              currency: payout.currency,
              bucket: NexusFinanceBucket.AVAILABLE,
              kind: NexusFinanceEntryKind.PAYOUT_REJECT_AVAILABLE_CREDIT,
              amount,
              payoutId: payout.id,
              idempotencyKey: `payout:${payout.id}:reject-available-credit`,
              description: "Rejected payout returned funds to available balance",
              metadata: {
                reviewedById: staff.userId,
              },
            },
          });
          await tx.nexusSecurityEvent.create({
            data: {
              eventType: "PAYOUT_REJECTED",
              userId: staff.userId,
              metadata: {
                payoutId: payout.id,
                affiliateUserId: payout.userId,
                amount,
                currency: payout.currency,
                previousStatus: payout.status,
                nextStatus: NexusPayoutStatus.REJECTED,
              },
            },
          });
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      console.error("[NEXUS PAYOUT REJECT ERROR]", error);
      redirect(`/${locale}/admin/payouts?payout=error`);
    }

    revalidatePath(`/${locale}/admin/payouts`);
    revalidatePath(`/${locale}/finance`);
    redirect(`/${locale}/admin/payouts?payout=rejected`);
  }

  return (
    <div className="min-h-screen bg-[#08090d] px-5 py-8 text-white md:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-[1600px]">
        <header className="mb-7">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8068ff]">
            Administration
          </div>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em]">
            Payout Operations
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/42">
            Review affiliate payout requests and move ledger-backed reserved
            balances through approval, payment or rejection.
          </p>
        </header>

        {message ? (
          <div
            className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
              state === "approved" || state === "paid"
                ? "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300"
                : state === "rejected"
                  ? "border-amber-500/20 bg-amber-500/[0.07] text-amber-200"
                  : "border-red-500/20 bg-red-500/[0.07] text-red-200"
            }`}
          >
            {message}
          </div>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Kpi label="Requested" value={requested.length.toString()} hint={money(requestedAmount)} accent />
          <Kpi label="Approved" value={approved.length.toString()} hint={money(approvedAmount)} />
          <Kpi label="Reserved" value={money(reserved)} hint="Network ledger" />
          <Kpi label="Paid" value={money(paid)} hint="Network ledger" />
          <Kpi label="Total records" value={payouts.length.toString()} hint="Latest 100" />
        </section>

        <section className="mt-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14]">
          <div className="border-b border-white/[0.07] px-5 py-4">
            <div className="text-sm font-semibold">Payout queue</div>
            <div className="mt-1 text-xs text-white/35">
              Approving does not move funds. Marking paid moves Reserved → Paid.
              Rejecting returns Reserved → Available.
            </div>
          </div>

          {payouts.length === 0 ? (
            <div className="p-10 text-center text-sm text-white/30">
              No payout requests yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px] text-left text-xs">
                <thead className="border-b border-white/[0.06] bg-black/10 text-[9px] uppercase tracking-[0.13em] text-white/28">
                  <tr>
                    <th className="px-5 py-3">Requested</th>
                    <th>Affiliate</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Destination</th>
                    <th>TX / Reference</th>
                    <th className="pr-5 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.055]">
                  {payouts.map((payout) => {
                    const user = userById.get(payout.userId);

                    return (
                      <tr key={payout.id} className="align-top text-white/55">
                        <td className="px-5 py-4 whitespace-nowrap">
                          {dateTime(payout.requestedAt)}
                        </td>

                        <td className="py-4">
                          <div className="font-semibold text-white/82">
                            {user?.name || user?.email || payout.userId}
                          </div>
                          <div className="mt-1 text-[10px] text-white/27">
                            {user?.email || ""}
                            {user?.tier == null ? "" : ` · Tier ${user.tier}`}
                          </div>
                        </td>

                        <td className="py-4 font-semibold text-white/82">
                          {money(Number(payout.amount))}
                        </td>

                        <td className="py-4">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${tone(
                              payout.status,
                            )}`}
                          >
                            {payout.status}
                          </span>
                        </td>

                        <td className="max-w-[330px] py-4">
                          <div className="font-medium text-white/70">
                            {payout.destinationLabel || "CRYPTO"}
                          </div>
                          <div
                            className="mt-1 truncate font-mono text-[10px] text-white/28"
                            title={payout.destinationAddress}
                          >
                            {payout.destinationAddress}
                          </div>
                        </td>

                        <td className="max-w-[260px] py-4 font-mono text-[10px] text-white/33">
                          <div className="truncate" title={payout.txHash || ""}>
                            {payout.txHash || "—"}
                          </div>
                        </td>

                        <td className="py-4 pr-5">
                          <div className="flex justify-end gap-2">
                            {payout.status === NexusPayoutStatus.REQUESTED ? (
                              <>
                                <form action={approvePayout}>
                                  <input
                                    type="hidden"
                                    name="payoutId"
                                    value={payout.id}
                                  />
                                  <button className="h-9 rounded-lg bg-[#7657ff] px-3 text-[11px] font-semibold text-white transition hover:bg-[#846cff]">
                                    Approve
                                  </button>
                                </form>

                                <form action={rejectPayout}>
                                  <input
                                    type="hidden"
                                    name="payoutId"
                                    value={payout.id}
                                  />
                                  <button className="h-9 rounded-lg border border-red-500/20 px-3 text-[11px] font-semibold text-red-300 transition hover:bg-red-500/[0.06]">
                                    Reject
                                  </button>
                                </form>
                              </>
                            ) : null}

                            {payout.status === NexusPayoutStatus.APPROVED ? (
                              <>
                                <form
                                  action={markPaid}
                                  className="flex items-center gap-2"
                                >
                                  <input
                                    type="hidden"
                                    name="payoutId"
                                    value={payout.id}
                                  />
                                  <input
                                    name="txHash"
                                    required
                                    maxLength={255}
                                    placeholder="TX hash / payment ref"
                                    className="h-9 w-48 rounded-lg border border-white/[0.09] bg-black/20 px-3 text-[11px] text-white outline-none placeholder:text-white/22 focus:border-[#7657ff]/45"
                                  />
                                  <button className="h-9 rounded-lg bg-emerald-500/15 px-3 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/20">
                                    Mark paid
                                  </button>
                                </form>

                                <form action={rejectPayout}>
                                  <input
                                    type="hidden"
                                    name="payoutId"
                                    value={payout.id}
                                  />
                                  <button className="h-9 rounded-lg border border-red-500/20 px-3 text-[11px] font-semibold text-red-300 transition hover:bg-red-500/[0.06]">
                                    Reject
                                  </button>
                                </form>
                              </>
                            ) : null}

                            {payout.status === NexusPayoutStatus.PAID ? (
                              <span className="text-[10px] text-emerald-300/75">
                                Paid {dateTime(payout.paidAt)}
                              </span>
                            ) : null}

                            {payout.status === NexusPayoutStatus.REJECTED ? (
                              <span className="text-[10px] text-red-300/65">
                                Rejected {dateTime(payout.rejectedAt)}
                              </span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        accent
          ? "border-[#7657ff]/30 bg-[#7657ff]/[0.065]"
          : "border-white/[0.08] bg-[#0d0f14]"
      }`}
    >
      <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/32">
        {label}
      </div>
      <div className="mt-3 text-[22px] font-semibold tracking-[-0.03em] text-white">
        {value}
      </div>
      <div className="mt-2 text-[10px] text-white/24">{hint}</div>
    </div>
  );
}
