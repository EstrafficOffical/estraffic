// src/app/[locale]/(auth)/admin/requests/page.tsx
import "server-only";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Actions from "./row-actions";

type SearchParams = { status?: string; q?: string; page?: string; perPage?: string };

export default async function Page({
  searchParams,
  params: { locale },
}: {
  searchParams: SearchParams;
  params: { locale: string };
}) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    redirect(`/api/auth/signin?callbackUrl=/${locale}/admin/requests`);
  }

  const status = searchParams.status ?? "PENDING";
  const q = (searchParams.q ?? "").trim();
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(searchParams.perPage ?? 20)));

  const where: any = {
    AND: [
      status ? { status } : {},
      q
        ? {
            OR: [
              { user: { email: { contains: q, mode: "insensitive" } } },
              { offer: { title: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {},
    ],
  };

  const [total, items] = await Promise.all([
    prisma.offerRequest.count({ where }),
    prisma.offerRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        user: { select: { id: true, email: true, name: true } },
        offer: { select: { id: true, title: true, tag: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="p-4 space-y-4 text-white">
      <h1 className="text-xl font-semibold">Заявки на офферы</h1>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Поиск по email/офферу"
          className="bg-zinc-900 text-white placeholder-white/50 rounded-xl px-3 py-2"
        />
        <select
          name="status"
          defaultValue={status}
          className="bg-zinc-900 text-white rounded-xl px-3 py-2"
        >
          <option value="">Все</option>
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
        </select>
        <button className="rounded-xl border border-white/20 px-3 py-2 hover:bg-white/10">
          Фильтр
        </button>
      </form>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="text-left px-3 py-2">Дата</th>
              <th className="text-left px-3 py-2">Пользователь</th>
              <th className="text-left px-3 py-2">Оффер</th>
              <th className="text-left px-3 py-2">Статус</th>
              <th className="text-left px-3 py-2">Действия</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-t border-white/10">
                <td className="px-3 py-2">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">
                  <div className="text-white/90">{r.user.email}</div>
                  <div className="text-white/50">{r.user.name ?? "—"}</div>
                </td>
                <td className="px-3 py-2">
                  <div className="text-white/90">{r.offer.title}</div>
                  <div className="text-white/50">{r.offer.tag ?? "—"}</div>
                </td>
                <td className="px-3 py-2">{r.status}</td>
                <td className="px-3 py-2">
                  <Actions id={r.id} current={r.status} />
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td className="px-3 py-8 text-center text-white/60" colSpan={5}>
                  Ничего не найдено
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-white/60 text-sm">
          Стр. {page} из {totalPages} • всего {total}
        </span>
      </div>
    </div>
  );
}
