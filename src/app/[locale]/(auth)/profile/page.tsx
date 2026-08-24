import "server-only";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AffiliateProfile from "./AffiliateProfile";
import PrivilegedProfile from "./PrivilegedProfile";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  const role = String(
    (session.user as any)?.role || "",
  );

  if (
    role === "OWNER" ||
    role === "ADMIN"
  ) {
    return <PrivilegedProfile />;
  }

  return <AffiliateProfile />;
}