// src/lib/getDict.ts
import type { Locale } from "@/app/i18n/i18n";
import ru from "src/app/i18n/messages/ru.json";
import uk from "src/app/i18n/messages/uk.json";
import en from "src/app/i18n/messages/en.json";

export type Dict = typeof ru; // структура словаря

export async function getDict(locale: Locale): Promise<Dict> {
  switch (locale) {
    case "ru":
      return ru;
    case "uk":
      return uk;
    case "en":
      return en;
  }
}
