/** UI locales with complete product-string dictionaries. Never list a locale without messages. */
export const locales = ["en", "fr", "sw"] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "en"

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "fr" || value === "sw"
}

export function localeLabel(locale: Locale): string {
  switch (locale) {
    case "en":
      return "English"
    case "fr":
      return "Français"
    case "sw":
      return "Kiswahili"
    default: {
      const unreachable: never = locale
      return unreachable
    }
  }
}

/** BCP 47 tag for `<html lang>` and Intl. */
export function htmlLang(locale: Locale): string {
  switch (locale) {
    case "en":
      return "en"
    case "fr":
      return "fr"
    case "sw":
      return "sw"
    default: {
      const unreachable: never = locale
      return unreachable
    }
  }
}
