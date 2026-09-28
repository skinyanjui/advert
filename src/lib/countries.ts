import countriesData from "@/data/countries.json"

export type CurrencyInfo = {
  code: string
  name: string
  symbol: string
}

export type LanguageInfo = {
  code: string
  name: string
}

export type CountryRecord = {
  code: string
  alpha3: string
  numeric: string
  name: string
  officialName: string
  capital: string
  lat: number
  lng: number
  subregion: string
  callingCode: string
  population: number
  currencies: CurrencyInfo[]
  languages: LanguageInfo[]
  timezone: string
  primary: boolean
  /** Sort key among primary markets (lower first). Absent on non-primary rows. */
  primaryRank?: number
}

export const countries = countriesData as CountryRecord[]

const byCode = new Map(countries.map((country) => [country.code, country]))

const legacySlugs: Record<string, string> = {
  kenya: "KE",
  tanzania: "TZ",
  uganda: "UG",
  rwanda: "RW",
  ethiopia: "ET",
  "south-africa": "ZA",
  ghana: "GH",
  nigeria: "NG",
  zambia: "ZM",
  botswana: "BW",
  namibia: "NA",
  mozambique: "MZ",
  senegal: "SN",
  "cote-divoire": "CI",
  cameroon: "CM",
  morocco: "MA",
  egypt: "EG",
  malawi: "MW",
  angola: "AO",
}

export function isCountryId(value: string | null | undefined): value is string {
  if (!value) return false
  return byCode.has(value.toUpperCase()) || value.toLowerCase() in legacySlugs
}

export function canonicalCountry(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const legacy = legacySlugs[value.toLowerCase()]
  const code = legacy ?? value.toUpperCase()
  return byCode.has(code) ? code : undefined
}

export function getCountry(code: string): CountryRecord | undefined {
  const canonical = canonicalCountry(code)
  return canonical ? byCode.get(canonical) : undefined
}

export function countryName(code: string): string {
  return getCountry(code)?.name ?? code
}

export function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
}

export function primaryCountries(): CountryRecord[] {
  return countries
    .filter((country) => country.primary)
    .sort((a, b) => (a.primaryRank ?? Number.MAX_SAFE_INTEGER) - (b.primaryRank ?? Number.MAX_SAFE_INTEGER))
}

export function moreCountries(): CountryRecord[] {
  return countries.filter((country) => !country.primary)
}

export function currencyLabel(code: string): string {
  return getCountryCurrencyName(code) ?? code
}

function getCountryCurrencyName(code: string): string | undefined {
  for (const country of countries) {
    const match = country.currencies.find((currency) => currency.code === code)
    if (match) return match.name
  }
  return undefined
}

export function languageLabel(code: string, fallback: string): string {
  return fallback || code
}

export function formatLocalTime(timeZone: string, date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en", {
      timeZone,
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(date)
  } catch {
    return timeZone
  }
}
