"use client"

import { Check } from "lucide-react"

import { FormField } from "@/components/form-field"
import { usePrefs } from "@/components/prefs-provider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { boardCurrencyOptions } from "@/lib/fx"
import { offeredLocales } from "@/lib/i18n"
import { isLocale, localeLabel, type Locale } from "@/lib/i18n/locales"
import { isCurrencyPreference, type CurrencyPreference } from "@/lib/prefs"

export function LanguageCurrencyFields({
  layout = "row",
  idPrefix = "pref",
}: {
  layout?: "row" | "menu"
  idPrefix?: string
}) {
  const { language, currency, setLanguage, setCurrency, t } = usePrefs()
  const currencies = boardCurrencyOptions()

  const languageField = (
    <FormField label={t("prefs.language")} htmlFor={`${idPrefix}-language`}>
      <Select
        value={language}
        onValueChange={(value) => {
          if (isLocale(value) && offeredLocales.includes(value)) setLanguage(value)
        }}
      >
        <SelectTrigger id={`${idPrefix}-language`} className="w-full min-w-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="z-[90]">
          {offeredLocales.map((locale) => (
            <SelectItem key={locale} value={locale}>
              {localeLabel(locale as Locale)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  )

  const currencyField = (
    <FormField
      label={t("prefs.currency")}
      htmlFor={`${idPrefix}-currency`}
      hint={layout === "row" ? t("prefs.currencyHint") : undefined}
    >
      <Select
        value={currency}
        onValueChange={(value) => {
          if (isCurrencyPreference(value)) setCurrency(value as CurrencyPreference)
        }}
      >
        <SelectTrigger id={`${idPrefix}-currency`} className="w-full min-w-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="z-[90] max-h-72">
          {currencies.map((item) => (
            <SelectItem key={item.code} value={item.code}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  )

  return (
    <div
      className={
        layout === "menu"
          ? "grid grid-cols-2 gap-2 px-2 py-1.5"
          : "grid grid-cols-2 gap-3"
      }
    >
      <div className="min-w-0">{languageField}</div>
      <div className="min-w-0">{currencyField}</div>
    </div>
  )
}

export function LanguageCurrencyMenu() {
  const { language, currency, setLanguage, setCurrency, t } = usePrefs()
  const currencies = boardCurrencyOptions()
  return (
    <div className="w-[min(42rem,calc(100vw-2rem))] p-4 sm:p-5">
      <div className="mb-5">
        <h2 className="text-lg font-semibold tracking-tight">{t("prefs.language")} & {t("prefs.currency")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Choose how marketplace content and prices are shown.</p>
      </div>
      <section>
        <h3 className="mb-2 text-sm font-semibold">{t("prefs.language")}</h3>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
          {offeredLocales.map((locale) => (
            <button key={locale} type="button" onClick={() => setLanguage(locale as Locale)} className="flex min-h-12 items-center justify-between rounded-lg px-3 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span>{localeLabel(locale as Locale)}</span>{language === locale ? <Check className="size-4" aria-hidden /> : null}
            </button>
          ))}
        </div>
      </section>
      <div className="my-4 border-t border-border" />
      <section>
        <h3 className="mb-2 text-sm font-semibold">{t("prefs.currency")}</h3>
        <div className="grid max-h-64 grid-cols-2 gap-1 overflow-y-auto pr-1 sm:grid-cols-3">
          {currencies.map((item) => (
            <button key={item.code} type="button" onClick={() => setCurrency(item.code as CurrencyPreference)} className="flex min-h-12 items-center justify-between gap-2 rounded-lg px-3 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="min-w-0"><span className="block font-medium">{item.label}</span><span className="block text-xs text-muted-foreground">{item.code}</span></span>{currency === item.code ? <Check className="size-4 shrink-0" aria-hidden /> : null}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
