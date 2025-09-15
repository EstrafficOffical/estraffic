"use client";

import { IntlProvider, MessageFormatElement } from "react-intl";
import type { ReactNode } from "react";

type IntlMessages =
  | Record<string, string>
  | Record<string, MessageFormatElement[]>;

interface LocaleProviderProps {
  locale: string;
  messages: IntlMessages;
  children: ReactNode;
}

export default function LocaleProvider({
  locale,
  messages,
  children,
}: LocaleProviderProps) {
  return (
    <IntlProvider locale={locale} messages={messages}>
      {children}
    </IntlProvider>
  );
}
