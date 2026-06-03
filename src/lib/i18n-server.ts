import "server-only";
import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  getDictionaryFor,
  isLocale,
  type Dictionary,
  type Locale,
} from "./i18n";

/** Aktuelle Sprache aus dem Cookie (Default: de). */
export function getLocale(): Locale {
  const v = cookies().get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

/** Wörterbuch für die aktuelle Sprache (Server-Komponenten). */
export function getDictionary(): Dictionary {
  return getDictionaryFor(getLocale());
}
