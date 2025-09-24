// редирект внутрь роут-группы на форму логина
import { redirect } from "next/navigation";

export default function Page({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale}/login`);
}
