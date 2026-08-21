import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  EmptyState,
  MetricCard,
  PageHeader,
  Panel,
  PanelHeader,
  Pill,
} from "@/app/components/NexusPageKit";

export const dynamic = "force-dynamic";

const WalletSchema = z.object({
  address: z.string().trim().min(8).max(200),
});

const PayoutSchema = z.object({
  amount: z.coerce.number().positive().max(1_000_000),
});

function guessLabel(addr: string) {
  const a = addr.trim();

  if (/^T[1-9A-HJ-NP-Za-km-z]{20,}$/.test(a)) return "TRC20";
  if (/^0x[a-fA-F0-9]{40}$/.test(a)) return "ERC20";
  if (/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,}$/i.test(a)) return "BTC";

  return "CRYPTO";
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function dateTime(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

async function ledgerBalances(userId: string) {
  const grouped = await prisma.nexusFinanceLedger.groupBy({
    by: ["bucket"],
    where: {
      userId,
      currency: "USD",
    },
    _sum: {
      amount: true,
    },
  });

  const map = new Map(
    grouped.map((row) => [row.bucket, Number(row._sum.amount || 0)]),
  );

  return {
    pending: map.get("PENDING") || 0,
    available: map.get("AVAILABLE") || 0,
    reserved: map.get("RESERVED") || 0,
    paid: map.get("PAID") || 0,
  };
}

async function reservePayout({
  userId,
  amount,
  walletId,
}: {
  userId: string;
  amount: number;
  walletId: string;
}) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const wallet = await tx.wallet.findFirst({
            where: {
              id: walletId,
              userId,
            },
          });

          if (!wallet) {
            throw new Error("WALLET_NOT_FOUND");
          }

          const availableRows = await tx.nexusFinanceLedger.aggregate({
            where: {
              userId,
              currency: "USD",
              bucket: "AVAILABLE",
            },
            _sum: {
              amount: true,
            },
          });

          const available = Number(availableRows._sum.amount || 0);

          if (available + 0.000001 < amount) {
            throw new Error("INSUFFICIENT_AVAILABLE_BALANCE");
          }

          const payout = await tx.nexusPayout.create({
            data: {
              userId,
              walletId: wallet.id,
              amount,
              currency: "USD",
              status: "REQUESTED",
              destinationLabel: wallet.label,
              destinationAddress: wallet.address,
            },
          });

          await tx.nexusFinanceLedger.create({
            data: {
              userId,
              currency: "USD",
              bucket: "AVAILABLE",
              kind: "PAYOUT_RESERVE_AVAILABLE_DEBIT",
              amount: -amount,
              payoutId: payout.id,
              idempotencyKey: `payout:${payout.id}:reserve-available-debit`,
              description: "Reserved available balance for payout request",
              metadata: {
                walletId: wallet.id,
                destinationLabel: wallet.label,
              },
            },
          });

          await tx.nexusFinanceLedger.create({
            data: {
              userId,
              currency: "USD",
              bucket: "RESERVED",
              kind: "PAYOUT_RESERVE_CREDIT",
              amount,
              payoutId: payout.id,
              idempotencyKey: `payout:${payout.id}:reserve-credit`,
              description: "Reserved balance for payout request",
              metadata: {
                walletId: wallet.id,
                destinationLabel: wallet.label,
              },
            },
          });

          return payout;
        },
        {
          isolationLevel: "Serializable",
        },
      );
    } catch (error: any) {
      if (error?.code === "P2034" && attempt < 3) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("PAYOUT_RESERVATION_RETRY_EXHAUSTED");
}

export default async function FinancePage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  const userId = String((session.user as any).id || "");

  if (!userId) {
    redirect(`/${locale}/login`);
  }

  const [balances, wallets, payouts, earnings] = await Promise.all([
    ledgerBalances(userId),

    prisma.wallet.findMany({
      where: { userId },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    }),

    prisma.nexusPayout.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),

    prisma.nexusEarning.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  const primaryWallet =
    wallets.find((wallet) => wallet.isPrimary) || wallets[0] || null;

  const totalEarned = balances.pending + balances.available + balances.reserved + balances.paid;

  const financeState = Array.isArray(searchParams?.finance)
    ? searchParams?.finance[0]
    : searchParams?.finance;

  const message =
    financeState === "requested"
      ? "Payout request created. Funds are now reserved until staff review."
      : financeState === "wallet-added"
        ? "Payout wallet added."
        : financeState === "wallet-primary"
          ? "Primary payout wallet updated."
          : financeState === "wallet-deleted"
            ? "Payout wallet deleted."
            : financeState === "insufficient"
              ? "Requested amount is higher than your available balance."
              : financeState === "wallet-required"
                ? "Add a payout wallet before requesting a payout."
                : financeState === "invalid-amount"
                  ? "Enter a valid payout amount."
                  : financeState === "error"
                    ? "Finance action failed. Please try again."
                    : null;

  async function addWallet(fd: FormData) {
    "use server";

    const current = await auth();
    const uid = String((current?.user as any)?.id || "");

    if (!uid) redirect(`/${locale}/login`);

    const parsed = WalletSchema.safeParse({
      address: String(fd.get("address") || ""),
    });

    if (!parsed.success) {
      redirect(`/${locale}/finance?finance=error`);
    }

    const address = parsed.data.address;

    await prisma.$transaction(async (tx) => {
      const existing = await tx.wallet.findFirst({
        where: {
          userId: uid,
          address,
        },
      });

      if (existing) return;

      const count = await tx.wallet.count({
        where: { userId: uid },
      });

      await tx.wallet.create({
        data: {
          userId: uid,
          address,
          label: guessLabel(address),
          verified: false,
          isPrimary: count === 0,
        },
      });
    });

    revalidatePath(`/${locale}/finance`);
    redirect(`/${locale}/finance?finance=wallet-added`);
  }

  async function setPrimary(fd: FormData) {
    "use server";

    const current = await auth();
    const uid = String((current?.user as any)?.id || "");
    const id = String(fd.get("id") || "");

    if (!uid) redirect(`/${locale}/login`);
    if (!id) redirect(`/${locale}/finance?finance=error`);

    await prisma.$transaction(async (tx) => {
      const target = await tx.wallet.findFirst({
        where: {
          id,
          userId: uid,
        },
      });

      if (!target) {
        throw new Error("WALLET_NOT_FOUND");
      }

      await tx.wallet.updateMany({
        where: { userId: uid },
        data: { isPrimary: false },
      });

      await tx.wallet.update({
        where: { id: target.id },
        data: { isPrimary: true },
      });
    });

    revalidatePath(`/${locale}/finance`);
    redirect(`/${locale}/finance?finance=wallet-primary`);
  }

  async function deleteWallet(fd: FormData) {
    "use server";

    const current = await auth();
    const uid = String((current?.user as any)?.id || "");
    const id = String(fd.get("id") || "");

    if (!uid) redirect(`/${locale}/login`);
    if (!id) redirect(`/${locale}/finance?finance=error`);

    await prisma.$transaction(async (tx) => {
      await tx.wallet.deleteMany({
        where: {
          id,
          userId: uid,
        },
      });

      const primary = await tx.wallet.findFirst({
        where: {
          userId: uid,
          isPrimary: true,
        },
      });

      if (!primary) {
        const first = await tx.wallet.findFirst({
          where: { userId: uid },
          orderBy: { createdAt: "asc" },
        });

        if (first) {
          await tx.wallet.update({
            where: { id: first.id },
            data: { isPrimary: true },
          });
        }
      }
    });

    revalidatePath(`/${locale}/finance`);
    redirect(`/${locale}/finance?finance=wallet-deleted`);
  }

  async function requestPayout(fd: FormData) {
    "use server";

    const current = await auth();
    const uid = String((current?.user as any)?.id || "");

    if (!uid) redirect(`/${locale}/login`);

    const parsed = PayoutSchema.safeParse({
      amount: fd.get("amount"),
    });

    if (!parsed.success) {
      redirect(`/${locale}/finance?finance=invalid-amount`);
    }

    const wallet = await prisma.wallet.findFirst({
      where: {
        userId: uid,
        isPrimary: true,
      },
      orderBy: { createdAt: "asc" },
    });

    if (!wallet) {
      redirect(`/${locale}/finance?finance=wallet-required`);
    }

    const amount = Math.round(parsed.data.amount * 100) / 100;

    try {
      await reservePayout({
        userId: uid,
        amount,
        walletId: wallet.id,
      });
    } catch (error: any) {
      if (error?.message === "INSUFFICIENT_AVAILABLE_BALANCE") {
        redirect(`/${locale}/finance?finance=insufficient`);
      }

      console.error("[NEXUS PAYOUT REQUEST ERROR]", error);
      redirect(`/${locale}/finance?finance=error`);
    }

    revalidatePath(`/${locale}/finance`);
    redirect(`/${locale}/finance?finance=requested`);
  }

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Finance"
        title="Finance"
        subtitle="Live NEXUS earnings, balances, payout destinations and payout history."
      />

      <div className="space-y-5 p-5 md:p-8">
        {message ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              financeState === "requested" ||
              financeState === "wallet-added" ||
              financeState === "wallet-primary" ||
              financeState === "wallet-deleted"
                ? "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300"
                : "border-amber-500/20 bg-amber-500/[0.07] text-amber-200"
            }`}
          >
            {message}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Available"
            value={money(balances.available)}
            hint="Ready to request"
            emphasis
          />
          <MetricCard
            label="Pending"
            value={money(balances.pending)}
            hint="Awaiting release"
          />
          <MetricCard
            label="Reserved"
            value={money(balances.reserved)}
            hint="Requested payouts"
          />
          <MetricCard
            label="Paid"
            value={money(balances.paid)}
            hint="Completed payouts"
          />
          <MetricCard
            label="Total earned"
            value={money(totalEarned)}
            hint="Ledger-backed lifetime value"
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[.78fr_1.22fr]">
          <Panel>
            <PanelHeader
              title="Request payout"
              description="Funds move from Available to Reserved immediately after a successful request."
            />

            <div className="space-y-4 p-5">
              <div className="rounded-xl border border-white/[0.07] bg-black/10 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">
                  Available balance
                </div>
                <div className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">
                  {money(balances.available)}
                </div>
              </div>

              {primaryWallet ? (
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white/70">
                      {primaryWallet.label}
                    </span>
                    <Pill tone="accent">Primary</Pill>
                    {primaryWallet.verified ? (
                      <Pill tone="success">Verified</Pill>
                    ) : (
                      <Pill>Unverified</Pill>
                    )}
                  </div>

                  <div className="mt-2 truncate font-mono text-[11px] text-white/32">
                    {primaryWallet.address}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.05] p-4 text-xs leading-5 text-amber-200/75">
                  Add a payout wallet below before requesting a payout.
                </div>
              )}

              <form action={requestPayout} className="space-y-3">
                <label className="block">
                  <div className="mb-1.5 text-xs font-medium text-white/48">
                    Amount (USD)
                  </div>
                  <input
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={Math.max(balances.available, 0)}
                    placeholder="100.00"
                    disabled={!primaryWallet || balances.available <= 0}
                    className="h-11 w-full rounded-xl border border-white/[0.09] bg-black/20 px-3.5 text-sm text-white outline-none placeholder:text-white/22 focus:border-[#7657ff]/50 disabled:cursor-not-allowed disabled:opacity-40"
                    required
                  />
                </label>

                <button
                  disabled={!primaryWallet || balances.available <= 0}
                  className="flex h-11 w-full items-center justify-center rounded-xl bg-[#7657ff] px-4 text-sm font-semibold text-white transition hover:bg-[#846cff] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Request payout
                </button>
              </form>

              <div className="text-[10px] leading-5 text-white/24">
                The destination address is snapshotted into the payout request.
                Changing or deleting the wallet later does not change an existing request.
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Payout wallets"
              description="The first wallet becomes primary automatically."
              action={
                <form action={addWallet} className="flex gap-2">
                  <input
                    name="address"
                    required
                    placeholder="TRC20 / ERC20 / BTC address"
                    className="h-9 w-64 rounded-lg border border-white/[0.08] bg-black/20 px-3 text-xs text-white outline-none placeholder:text-white/25"
                  />
                  <button className="rounded-lg bg-[#7657ff] px-3 text-xs font-semibold text-white">
                    Add wallet
                  </button>
                </form>
              }
            />

            {wallets.length === 0 ? (
              <EmptyState
                title="No payout wallets"
                description="Add a destination wallet before requesting a payout."
              />
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {wallets.map((wallet) => (
                  <div
                    key={wallet.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white/82">
                          {wallet.label}
                        </span>
                        {wallet.isPrimary ? (
                          <Pill tone="accent">Primary</Pill>
                        ) : null}
                        {wallet.verified ? (
                          <Pill tone="success">Verified</Pill>
                        ) : (
                          <Pill>Unverified</Pill>
                        )}
                      </div>

                      <div className="mt-1 max-w-[680px] truncate font-mono text-[11px] text-white/32">
                        {wallet.address}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {!wallet.isPrimary ? (
                        <form action={setPrimary}>
                          <input type="hidden" name="id" value={wallet.id} />
                          <button className="rounded-lg border border-white/[0.09] px-3 py-2 text-[11px] text-white/55 transition hover:text-white">
                            Set primary
                          </button>
                        </form>
                      ) : null}

                      <form action={deleteWallet}>
                        <input type="hidden" name="id" value={wallet.id} />
                        <button className="rounded-lg border border-red-500/20 px-3 py-2 text-[11px] text-red-400/75 transition hover:bg-red-500/[0.05]">
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <Panel>
          <PanelHeader
            title="Earnings"
            description="Approved conversion payouts and their current finance lifecycle state."
          />

          {earnings.length === 0 ? (
            <EmptyState
              title="No NEXUS earnings yet"
              description="Approved payable conversions will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="border-b border-white/[0.07] bg-black/10 text-[9px] uppercase tracking-[0.13em] text-white/28">
                  <tr>
                    <th className="px-5 py-3">Created</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Release</th>
                    <th>Conversion</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.06]">
                  {earnings.map((earning) => (
                    <tr key={earning.id} className="text-white/52">
                      <td className="px-5 py-3">
                        {dateTime(earning.createdAt)}
                      </td>
                      <td className="font-medium text-white/76">
                        {money(Number(earning.amount))}
                      </td>
                      <td>
                        <Pill
                          tone={
                            earning.status === "AVAILABLE"
                              ? "success"
                              : earning.status === "PENDING"
                                ? "warning"
                                : "default"
                          }
                        >
                          {earning.status}
                        </Pill>
                      </td>
                      <td>
                        {earning.availableAt
                          ? dateTime(earning.availableAt)
                          : earning.releaseAt
                            ? dateTime(earning.releaseAt)
                            : "—"}
                      </td>
                      <td className="font-mono text-[10px] text-white/28">
                        {earning.nexusConversionId}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="Payout history"
            description="Requests use immutable destination snapshots and ledger-backed reserved balances."
          />

          {payouts.length === 0 ? (
            <EmptyState title="No payout requests yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-xs">
                <thead className="border-b border-white/[0.07] bg-black/10 text-[9px] uppercase tracking-[0.13em] text-white/28">
                  <tr>
                    <th className="px-5 py-3">Requested</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Destination</th>
                    <th>Transaction</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.06]">
                  {payouts.map((payout) => (
                    <tr key={payout.id} className="text-white/52">
                      <td className="px-5 py-3">
                        {dateTime(payout.requestedAt)}
                      </td>
                      <td className="font-medium text-white/76">
                        {money(Number(payout.amount))}
                      </td>
                      <td>
                        <Pill
                          tone={
                            payout.status === "PAID"
                              ? "success"
                              : payout.status === "REQUESTED" ||
                                  payout.status === "APPROVED"
                                ? "warning"
                                : "default"
                          }
                        >
                          {payout.status}
                        </Pill>
                      </td>
                      <td>
                        <div className="font-medium text-white/66">
                          {payout.destinationLabel || "CRYPTO"}
                        </div>
                        <div className="mt-1 max-w-[360px] truncate font-mono text-[10px] text-white/27">
                          {payout.destinationAddress}
                        </div>
                      </td>
                      <td className="font-mono text-[10px] text-white/28">
                        {payout.txHash || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
