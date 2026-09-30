"use client"

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
