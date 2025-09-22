// src/app/[locale]/(auth)/layout.tsx
import  {auth}  from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AuthLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // ВАЖНО: именованный импорт { auth }, НЕ default!
  const session = await auth();

  // Не залогинен? выкидываем на главную. (Группа (auth) закрыта)
  if (!session?.user) {
    redirect(`/${locale}`);
  }

  return <>{children}</>;
}
