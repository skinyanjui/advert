import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/locales"
import { en, type MessageKey } from "@/lib/i18n/messages/en"
import { fr } from "@/lib/i18n/messages/fr"
import { sw } from "@/lib/i18n/messages/sw"

const catalogs: Record<Locale, Record<MessageKey, string>> = {
  en,
  fr,
  sw,
}

/**
 * Locales offered in the Language selector.
 * Only list locales whose product UI catalogs are complete (key-parity tested).
 * Wiring of every screen through `t()` may still be incremental; catalogs cover
 * the full product surface so selectors can ship all three locales.
 */
export const offeredLocales: readonly Locale[] = ["en", "fr", "sw"] as const

export type TranslateValues = Record<string, string | number>

export function translate(
  locale: Locale,
  key: MessageKey,
  values?: TranslateValues,
): string {
  const catalog = catalogs[isLocale(locale) ? locale : defaultLocale]
  let text = catalog[key] ?? en[key] ?? key
  if (values) {
    for (const [name, value] of Object.entries(values)) {
      text = text.replaceAll(`{${name}}`, String(value))
    }
  }
  return text
}

export function messageKeys(): MessageKey[] {
  return Object.keys(en) as MessageKey[]
}

export { en, fr, sw }
export type { MessageKey }
