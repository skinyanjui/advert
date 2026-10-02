"use client"

import { usePathname } from "next/navigation"
import { useMemo } from "react"

import { usePrefs } from "@/components/prefs-provider"
import { canonicalCountry, countries } from "@/lib/countries"
import { categoryFromPath, useListingQuery } from "@/lib/use-listing-query"
import { useRememberedPlace } from "@/lib/use-remembered-place"

/** Temporary browsing market; saved posting defaults remain in Settings. */
export function MarketCountrySelect({ onNavigate }: { onNavigate: () => void }) {
  const { query, update } = useListingQuery()
  const pathname = usePathname()
  const rememberedPlace = useRememberedPlace()
  const { language, t } = usePrefs()
  const onBoard = pathname === "/" || categoryFromPath(pathname) !== undefined
  const selected = onBoard ? query.country : rememberedPlace?.country
  const options = useMemo(() => {
    const names = new Intl.DisplayNames([language], { type: "region" })
    return countries
      .map((country) => ({ code: country.code, label: names.of(country.code) ?? country.name }))
      .sort((a, b) => a.label.localeCompare(b.label, language))
  }, [language])

  return (
    <div className="mb-3 space-y-1.5 px-2">
      <label htmlFor="mobile-market-country" className="text-xs font-medium text-sidebar-foreground/75">{t("nav.market")}</label>
      <select
        id="mobile-market-country"
        value={selected ?? ""}
        onChange={(event) => {
          update({ country: canonicalCountry(event.target.value) ?? null })
          onNavigate()
        }}
        className="h-11 w-full min-w-0 rounded-lg border border-sidebar-border bg-sidebar px-3 text-base text-sidebar-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">{t("nav.allAfrica")}</option>
        {options.map((country) => <option key={country.code} value={country.code}>{country.label}</option>)}
      </select>
    </div>
  )
}
