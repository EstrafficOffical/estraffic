// src/app/[locale]/postbacks/page.tsx
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import PostbacksClient from "./PostbacksClient";

export const dynamic = "force-dynamic"; // учитывать сессию на Vercel

export default async function Page({ params: { locale } }: { params: { locale: string } }) {
  const session = await auth();
  const role = (session?.user as any)?.role ?? "USER";
  if (!session || role !== "ADMIN") {
    // скрываем страницу от всех не-админов
    notFound();
  }
  return <PostbacksClient locale={locale} />;
}
