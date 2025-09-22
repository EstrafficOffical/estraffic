import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { Wallet, Payout } from "@prisma/client";
import HeaderClient from "./HeaderClient"; // ⭐ как на Statistics

const WalletSchema = z.object({
  label: z.string().min(2).max(32),
  address: z.string().min(4).max(200),
});

export default async function Page({ params: { locale } }: { params: { locale: string } }) {
  const session = await auth();
  if (!session?.user) return null;
  const userId = (session.user as { id: string }).id;

  // агрегаты и выборки
  const revenueAggP = prisma.conversion.aggregate({
    where: { userId, amount: { not: null } },
    _sum: { amount: true },
  });
  const paidAggP = prisma.payout.aggregate({
    where: { userId, status: "Paid" },
    _sum: { amount: true },
  });
  const pendingAggP = prisma.payout.aggregate({
    where: { userId, status: "Pending" },
    _sum: { amount: true },
  });
  const walletsP = prisma.wallet.findMany({
    where: { userId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  }) as Promise<Wallet[]>;
  const payoutsP = prisma.payout.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  }) as Promise<Payout[]>;

  const [revenueAgg, paidAgg, pendingAgg, wallets, payouts] = await Promise.all([
    revenueAggP,
    paidAggP,
    pendingAggP,
    walletsP,
    payoutsP,
  ]);

  const revenue = Number(revenueAgg._sum.amount ?? 0);
  const totalPaid = Number(paidAgg._sum.amount ?? 0);
  const pending = Number(pendingAgg._sum.amount ?? 0);
  const available = Math.max(0, revenue - totalPaid - pending);

  // ====== server actions ======
  async function addWallet(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s?.user) return;

    const parsed = WalletSchema.safeParse({
      label: String(formData.get("label") ?? ""),
      address: String(formData.get("address") ?? ""),
    });
    if (!parsed.success) return;

    const uid = (s.user as { id: string }).id;

    await prisma.$transaction(async (tx) => {
      const hasAny = await tx.wallet.count({ where: { userId: uid } });
      await tx.wallet.create({
        data: {
          userId: uid,
          label: parsed.data.label,
          address: parsed.data.address,
          verified: false,
          isPrimary: hasAny === 0,
        },
      });
    });

    revalidatePath(`/${locale}/finance`);
  }

  async function setPrimary(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s?.user) return;

    const id = String(formData.get("id") ?? "");
    if (!id) return;

    const uid = (s.user as { id: string }).id;

    await prisma.$transaction(async (tx) => {
      await tx.wallet.updateMany({ where: { userId: uid }, data: { isPrimary: false } });
      await tx.wallet.update({ where: { id }, data: { isPrimary: true } });
    });

    revalidatePath(`/${locale}/finance`);
  }

  async function deleteWallet(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s?.user) return;

    const id = String(formData.get("id") ?? "");
    if (!id) return;

    const uid = (s.user as { id: string }).id;

    await prisma.wallet.delete({ where: { id } });

    const stillPrimary = await prisma.wallet.findFirst({
      where: { userId: uid, isPrimary: true },
    });

    if (!stillPrimary) {
      const first = await prisma.wallet.findFirst({
        where: { userId: uid },
        orderBy: { createdAt: "asc" },
      });
      if (first) {
        await prisma.wallet.update({ where: { id: first.id }, data: { isPrimary: true } });
      }
    }

    revalidatePath(`/${locale}/finance`);
  }

  const fmt = (n: number) =>
    `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const tone = (s: string) => (s === "Paid" ? "green" : s === "Pending" ? "orange" : "default");

  return (
    <section className="mx-auto max-w-7xl space-y-8 p-4 text-white/90">
      {/* ⭐ абсолютно такая же шапка, как на Statistics */}
      <HeaderClient locale={locale} />

      <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">Finance</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi title="Available Balance" value={fmt(available)} />
        <Kpi title="Pending" value={fmt(pending)} />
        <Kpi title="Total Paid" value={fmt(totalPaid)} />
      </div>

      {/* Wallets */}
      <section className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-xl font-semibold">Wallets</h2>
          <form action={addWallet} className="flex items-center gap-2">
            <input
              name="label"
              placeholder="Label (TRC20 / ERC20 / BANK)"
              className="w-44 rounded-xl bg-black/40 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-white/20"
            />
            <input
              name="address"
              placeholder="Address / IBAN / Card"
              className="w-64 rounded-xl bg-black/40 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-white/20"
            />
            <button className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm hover:bg-white/15">
              Add Wallet
            </button>
          </form>
        </div>
        <div className="divide-y divide-white/10">
          {wallets.length === 0 && (
            <div className="px-4 py-6 text-white/60">Нет сохранённых реквизитов</div>
          )}
          {wallets.map((w) => (
            <div key={w.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{w.label}</span>
                  {w.verified ? (
                    <Badge tone="green">Verified</Badge>
                  ) : (
                    <Badge tone="default">Unverified</Badge>
                  )}
                  {w.isPrimary && <Badge tone="blue">Primary</Badge>}
                </div>
                <div
                  className="mt-1 max-w-[60vw] truncate text-sm text-white/70"
                  title={w.address}
                >
                  {w.address}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!w.isPrimary && (
                  <form action={setPrimary}>
                    <input type="hidden" name="id" value={w.id} />
                    <button className="rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15">
                      Set Primary
                    </button>
                  </form>
                )}
                <form action={deleteWallet}>
                  <input type="hidden" name="id" value={w.id} />
                  <button className="rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Payouts */}
      <section className="overflow-hidden rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-xl font-semibold">Payouts (history)</h2>
        </div>
        <div className="min-w-full">
          <div className="grid grid-cols-12 px-4 py-2 text-sm text-white/60">
            <div className="col-span-3">Date</div>
            <div className="col-span-3">Amount</div>
            <div className="col-span-3">Status</div>
            <div className="col-span-3">TxHash</div>
          </div>
          <div className="divide-y divide-white/10">
            {payouts.length === 0 && (
              <div className="px-4 py-6 text-white/60">No payouts yet</div>
            )}
            {payouts.map((p) => (
              <div key={p.id} className="grid grid-cols-12 px-4 py-3">
                <div className="col-span-3">{p.createdAt.toISOString().slice(0, 10)}</div>
                <div className="col-span-3">{fmt(Number(p.amount))}</div>
                <div className="col-span-3">
                  <Badge tone={tone(p.status)}>{p.status}</Badge>
                </div>
                <div className="col-span-3 truncate">{p.txHash ?? "—"}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}

/* ——— UI утилиты ——— */

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 backdrop-blur-md">
      <div className="text-sm text-white/75">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "green" | "blue" | "orange";
}) {
  const map: Record<string, string> = {
    default: "bg-white/10 border-white/20 text-white/80",
    green: "bg-emerald-400/15 border-emerald-400/30 text-emerald-200",
    blue: "bg-sky-400/15 border-sky-400/30 text-sky-200",
    orange: "bg-amber-400/15 border-amber-400/30 text-amber-200",
  };
  return (
    <span className={`inline-flex items-center rounded-lg border px-2 py-1 text-xs ${map[tone]}`}>
      {children}
    </span>
  );
}
