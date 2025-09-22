// src/app/[locale]/page.tsx
import { auth } from "@/lib/auth";
import DashboardHome from "@/app/components/DashboardHome";

export default async function Page({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const session = await auth();

  return (
    <DashboardHome
      locale={locale}
      sessionUser={session?.user ? (session.user as any) : null}
    />
  );
}
