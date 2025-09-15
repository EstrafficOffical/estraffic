import type { ReactNode } from "react";
import LocaleProvider from "@/app/i18n/LocaleProvider";
import AuthSessionProvider from "@/app/providers/AuthSessionProvider";

// словари
import ru from "@/app/i18n/messages/ru.json";
import en from "@/app/i18n/messages/en.json";
import uk from "@/app/i18n/messages/uk.json";

const dictionaries: Record<string, any> = { ru, en, uk };

export default function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  const locale = params.locale ?? "ru";
  const messages = dictionaries[locale] ?? dictionaries.ru;

  return (
    <LocaleProvider locale={locale} messages={messages}>
      <AuthSessionProvider>
        {children}
      </AuthSessionProvider>
    </LocaleProvider>
  );
}
