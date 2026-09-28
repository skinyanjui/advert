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
import {
  isCurrencyPreference,
  listingCurrencyPreference,
  type CurrencyPreference,
} from "@/lib/prefs"

export function LanguageCurrencyFields({
  layout = "stack",
  idPrefix = "pref",
}: {
  layout?: "stack" | "menu"
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
        <SelectTrigger id={`${idPrefix}-language`} className={layout === "menu" ? "w-full" : "w-full max-w-xs"}>
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
      hint={layout === "stack" ? t("prefs.currencyHint") : undefined}
    >
      <Select
        value={currency}
        onValueChange={(value) => {
          if (isCurrencyPreference(value)) setCurrency(value as CurrencyPreference)
        }}
      >
        <SelectTrigger id={`${idPrefix}-currency`} className={layout === "menu" ? "w-full" : "w-full max-w-xs"}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="z-[90] max-h-72">
          <SelectItem value={listingCurrencyPreference}>{t("prefs.currencyListing")}</SelectItem>
          {currencies.map((item) => (
            <SelectItem key={item.code} value={item.code}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  )

  if (layout === "menu") {
    return (
      <div className="space-y-2 px-2 py-1.5">
        {languageField}
        {currencyField}
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {languageField}
      {currencyField}
    </div>
  )
}
