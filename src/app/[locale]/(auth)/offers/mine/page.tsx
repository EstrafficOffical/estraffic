import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default async function MyOffersPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  if (!userId) {
    return <div className="p-6">Please sign in.</div>;
  }

  const rows = await prisma.offerAccess.findMany({
    where: { userId, approved: true },
    include: { offer: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6">
      <h1 className="text-xl mb-4">My offers</h1>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border border-white/15 p-3">
            {r.offer?.title} — {r.offer?.geo} — CPA: {r.offer?.cpa != null ? String(r.offer.cpa) : "-"}
          </li>
        ))}
      </ul>
    </div>
  );
}
