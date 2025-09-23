import { redirect } from "next/navigation";

export default function AuthIndex({
  params: { locale },
}: { params: { locale: string } }) {
  redirect(`/${locale}/login`);
}
