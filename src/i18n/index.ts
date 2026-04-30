/**
 * Tiny cookie-based i18n. We deliberately avoid next-intl's locale-segment
 * routing to keep URLs canonical and SEO-friendly per language via the
 * existing `language` field on Article.
 *
 * Usage in RSC:
 *   const t = await getDictionary();
 *   <h1>{t.bands.title}</h1>
 */

import { cookies, headers } from "next/headers";
import { en, type Dictionary } from "./dictionaries/en";
import { bg } from "./dictionaries/bg";
import { de } from "./dictionaries/de";
import { ru } from "./dictionaries/ru";

export type Locale = "en" | "bg" | "de" | "ru";
export const LOCALES: Locale[] = ["en", "bg", "de", "ru"];
export const DEFAULT_LOCALE: Locale = "en";
const COOKIE = "um.locale";

const DICTIONARIES: Record<Locale, Dictionary> = { en, bg, de, ru };

export async function getLocale(): Promise<Locale> {
  const c = await cookies();
  const fromCookie = c.get(COOKIE)?.value;
  if (fromCookie && LOCALES.includes(fromCookie as Locale)) {
    return fromCookie as Locale;
  }
  // Fall back to Accept-Language
  const h = await headers();
  const accept = h.get("accept-language") ?? "";
  for (const locale of LOCALES) {
    if (accept.toLowerCase().startsWith(locale)) return locale;
  }
  return DEFAULT_LOCALE;
}

export async function getDictionary(): Promise<Dictionary> {
  const locale = await getLocale();
  return DICTIONARIES[locale];
}

export async function setLocale(locale: Locale) {
  const c = await cookies();
  c.set(COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
