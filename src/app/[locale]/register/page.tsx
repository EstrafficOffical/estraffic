import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { TextInput, Button } from "@/app/components/Form";
import { getDict } from "@/lib/getDict";
import type { Locale } from "@/app/i18n/i18n";

async function register(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "");
  if (!email || !password) return;
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? "12");
  const hash = await bcrypt.hash(password, saltRounds);
  await prisma.user.create({ data: { email, name, passwordHash: hash } });
  redirect("/login");
}

export default async function RegisterPage({
  params,
}: {
  params: { locale: Locale };
}) {
  const t = await getDict(params.locale);

  return (
    <div className="mx-auto max-w-md bg-white p-6 rounded-xl shadow">
      <h1 className="text-xl font-semibold mb-4">{t.register.title}</h1>
      <form action={register} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">{t.register.name}</label>
          <TextInput type="text" name="name" required />
        </div>
        <div>
          <label className="block text-sm mb-1">{t.register.email}</label>
          <TextInput type="email" name="email" required />
        </div>
        <div>
          <label className="block text-sm mb-1">{t.register.password}</label>
          <TextInput type="password" name="password" required />
        </div>
        <Button type="submit">{t.register.submit}</Button>
      </form>
    </div>
  );
}
