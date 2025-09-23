// src/app/[locale]/profile/ProfileHeader.tsx
import AvatarUploader from "@/app/components/AvatarUploader";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function ProfileHeader() {
  const session = await getServerSession(authOptions);

  const image = (session?.user as any)?.image as string | undefined;
  const name = session?.user?.name ?? "Anonymous";

  return (
    <div className="flex flex-col items-center gap-2">
      <AvatarUploader current={image} />
      <span className="text-white/80">{name}</span>
    </div>
  );
}
