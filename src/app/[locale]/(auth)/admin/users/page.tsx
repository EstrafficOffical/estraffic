// src/app/[locale]/(auth)/admin/users/page.tsx
import "server-only";
import { prisma } from "@/lib/prisma";        // ⬅️ именованный импорт
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import RowActions from "./row-actions";
import NavToggle from "@/app/components/NavToggle";

type SearchParams = { q?: string; status?: string; role?: string; page?: string; perPage?: string };

export default async function Page({
  searchParams,
  params: { locale },
}: {
  searchParams: SearchParams;
  params: { locale: string };
}) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    redirect(`/api/auth/signin?callbackUrl=/${locale}/admin/users`);
  }

  const meId = (session.user as any).id as string;

  const q = (searchParams.q ?? "").trim();
  const status = searchParams.status ?? "";
  const role = searchParams.role ?? "";
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(searchParams.perPage ?? 20)));

  const where: any = {
    AND: [
      q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
              { telegram: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
      status ? { status } : {},
      role ? { role } : {},
    ],
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        email: true,
        name: true,
        telegram: true,
        role: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="p-4 space-y-4 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Пользователи</h1>
        <NavToggle />
      </div>

      <form className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Поиск: email / имя / telegram"
          className="bg-zinc-900 text-white placeholder-white/50 rounded-xl px-3 py-2"
        />
        <select name="status" defaultValue={status} className="bg-zinc-900 text-white rounded-xl px-3 py-2">
          <option value="">Все статусы</option>
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="BANNED">BANNED</option>
        </select>
        <select name="role" defaultValue={role} className="bg-zinc-900 text-white rounded-xl px-3 py-2">
          <option value="">Все роли</option>
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <button className="rounded-xl border border-white/20 px-3 py-2 hover:bg-white/10">Фильтр</button>
      </form>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="text-left px-3 py-2">Дата</th>
              <th className="text-left px-3 py-2">Email</th>
              <th className="text-left px-3 py-2">Имя/Telegram</th>
              <th className="text-left px-3 py-2">Роль</th>
              <th className="text-left px-3 py-2">Статус</th>
              <th className="text-left px-3 py-2">Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-white/10">
                <td className="px-3 py-2">{new Date(u.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">
                  <div className="text-white/90">{u.name ?? "—"}</div>
                  <div className="text-white/50">{u.telegram ?? "—"}</div>
                </td>
                <td className="px-3 py-2">{u.role}</td>
                <td className="px-3 py-2">{u.status}</td>
                <td className="px-3 py-2">
                  <RowActions id={u.id} meId={meId} role={u.role as any} status={u.status as any} />
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td className="px-3 py-8 text-center text-white/60" colSpan={6}>
                  Ничего не найдено
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-white/60 text-sm">
        Стр. {page} из {totalPages} • всего {total}
      </div>
    </div>
  );
}
