import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import PostbacksClient from "./PostbacksClient";

export const dynamic = "force-dynamic";

export default async function Page(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;

  const session = await auth();
  const role = session?.user?.role ?? "USER";

  if (!session || !["OWNER", "ADMIN"].includes(role)) {
    notFound();
  }

  return <PostbacksClient locale={locale} />;
}