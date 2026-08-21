import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import NexusAppShell from "@/app/components/NexusAppShell";

export default async function AuthLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  if (session.user.status !== "APPROVED") {
    redirect(`/${locale}/status`);
  }

  return (
    <NexusAppShell
      locale={locale}
      user={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        tier: (session.user as any).tier ?? 3,
      }}
    >
      {children}
    </NexusAppShell>
  );
}
