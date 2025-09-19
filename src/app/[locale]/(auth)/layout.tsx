// app/[locale]/(auth)/layout.tsx
import { auth } from "@/lib/auth"; // экспортируй из lib/auth.ts helper: export const auth = () => getServerSession(authOptions)
import { redirect } from "next/navigation";

export default async function AuthLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const session = await auth();

  // Не залогинен → на главную с модалкой логина (или /{locale}/login — как у тебя принято)
  if (!session?.user) {
    redirect(`/${locale}?auth=login`);
  }

  return <>{children}</>;
}
