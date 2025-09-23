import { redirect } from "next/navigation";
export default function ProtectedIndex({ params: { locale } }: { params: { locale: string } }) {
  redirect(`/${locale}/login`);
}
