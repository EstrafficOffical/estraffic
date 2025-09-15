// src/app/payouts/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default async function PayoutsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return <div className="p-6">Нужно войти в аккаунт.</div>;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) {
    return <div className="p-6">Пользователь не найден.</div>;
  }

  const payouts = await prisma.payout.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Выплаты</h1>
      {payouts.length === 0 ? (
        <p className="text-gray-600">Выплат пока нет.</p>
      ) : (
        <div className="border rounded divide-y">
          {payouts.map((p) => (
            <div key={p.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">
                  {p.amount.toString()} {p.currency}
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(p.createdAt).toLocaleString()} {p.txHash ? ` • tx: ${p.txHash}` : ""}
                </div>
              </div>
              <div className="text-sm text-gray-600">ID: {p.id}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
