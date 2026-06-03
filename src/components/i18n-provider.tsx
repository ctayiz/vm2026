"use client";

import { createContext, useContext } from "react";
import { dictionaries, type Dictionary, type Locale } from "@/lib/i18n";

const I18nContext = createContext<{ locale: Locale; t: Dictionary }>({
  locale: "de",
  t: dictionaries.de,
});

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <I18nContext.Provider value={{ locale, t: dictionaries[locale] ?? dictionaries.de }}>
      {children}
    </I18nContext.Provider>
  );
}

/** Übersetzungen in Client-Komponenten. */
export function useT(): Dictionary {
  return useContext(I18nContext).t;
}

export function useLocale(): Locale {
  return useContext(I18nContext).locale;
}
