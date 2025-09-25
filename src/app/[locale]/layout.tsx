// src/app/[locale]/layout.tsx
import type { ReactNode } from "react";
import LocaleProvider from "@/app/i18n/LocaleProvider";
import AuthSessionProvider from "@/app/providers/AuthSessionProvider";

// словари
import ru from "@/app/i18n/messages/ru.json";
import en from "@/app/i18n/messages/en.json";
import uk from "@/app/i18n/messages/uk.json";

const SUPPORTED = ["ru", "en", "uk"] as const;
type SupportedLocale = (typeof SUPPORTED)[number];

const DICTS: Record<SupportedLocale, any> = { ru, en, uk };

function normalizeLocale(raw?: string): SupportedLocale {
  const s = (raw ?? "").toLowerCase();
  return (SUPPORTED as readonly string[]).includes(s) ? (s as SupportedLocale) : "ru";
}

export default function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  const locale = normalizeLocale(params?.locale);
  const messages = DICTS[locale];

  return (
    <LocaleProvider locale={locale} messages={messages}>
      <AuthSessionProvider>{children}</AuthSessionProvider>
    </LocaleProvider>
  );
}
