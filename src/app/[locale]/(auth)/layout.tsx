import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AuthLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const session = await auth();
  if (!session?.user) {
    redirect(`/api/auth/signin?callbackUrl=/${locale}`);
  }

  const user = session.user as any;
  const role = user?.role as string | undefined;
  const status = user?.status as string | undefined;

  // Админов пропускаем всегда. Для остальных — только APPROVED.
  const isAdmin = role === "ADMIN";
  const isApproved = status === "APPROVED";

  if (!isAdmin && !isApproved) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-zinc-950 text-white">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold mb-2">Аккаунт на модерации</h1>
          <p className="text-white/70 mb-6">
            Доступ к разделам появится после одобрения администратором.
          </p>
          <div className="flex items-center justify-center gap-3">
            <a
              href={`/api/auth/signout`}
              className="rounded-xl border border-white/20 px-4 py-2 hover:bg-white/10"
            >
              Выйти
            </a>
            <a
              href={`/${locale}`}
              className="rounded-xl border border-white/20 px-4 py-2 hover:bg-white/10"
            >
              На главную
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
