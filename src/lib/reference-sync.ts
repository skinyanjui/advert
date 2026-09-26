import "server-only"

import { createHash } from "node:crypto"
import { createClient } from "@supabase/supabase-js"

import countries from "@/data/countries.json"
import cities from "@/data/cities.json"

function adminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Supabase URL or server-only secret key is missing")
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function syncReferenceData() {
  const db = adminClient()
  const cityRows = cities.filter((city) => city.pop >= 15000)
  const countryVersion = createHash("sha256").update(JSON.stringify(countries)).digest("hex")
  const cityVersion = createHash("sha256").update(JSON.stringify(cityRows)).digest("hex")
  const { data: imported, error: readError } = await db
    .from("reference_imports")
    .select("source,source_version")
    .in("source", ["mledoze/countries snapshot", "GeoNames cities15000 snapshot"])
    .order("imported_at", { ascending: false })
    .limit(10)
  if (readError) throw readError
  const versions = new Set((imported ?? []).map((entry) => `${entry.source}:${entry.source_version}`))
  const countriesChanged = !versions.has(`mledoze/countries snapshot:${countryVersion}`)
  const citiesChanged = !versions.has(`GeoNames cities15000 snapshot:${cityVersion}`)

  async function write(table: string, rows: Record<string, unknown>[], onConflict: string) {
    for (let at = 0; at < rows.length; at += 100) {
      const { error } = await db.from(table).upsert(rows.slice(at, at + 100), { onConflict })
      if (error) throw error
    }
  }

  if (countriesChanged) {
    await write("reference_countries", countries.map((country) => ({
      code: country.code, alpha3: country.alpha3, numeric_code: country.numeric,
      name: country.name, official_name: country.officialName, capital: country.capital,
      latitude: country.lat, longitude: country.lng, subregion: country.subregion,
      calling_code: country.callingCode, population: country.population,
      default_timezone: country.timezone, primary_market: country.primary,
      source_payload: country,
    })), "code")
    await write("reference_currencies", [...new Map(countries.flatMap((country) => country.currencies.map((currency) => [currency.code, currency]))).values()], "code")
    await write("reference_languages", [...new Map(countries.flatMap((country) => country.languages.map((language) => [language.code, language]))).values()], "code")
    await write("reference_country_currencies", countries.flatMap((country) => country.currencies.map((currency) => ({ country_code: country.code, currency_code: currency.code }))), "country_code,currency_code")
    await write("reference_country_languages", countries.flatMap((country) => country.languages.map((language) => ({ country_code: country.code, language_code: language.code }))), "country_code,language_code")
  }
  if (countriesChanged || citiesChanged) {
    await write("reference_timezones", [...new Set([...countries.map((country) => country.timezone), ...cityRows.map((city) => city.tz)])].map((tzid) => ({ tzid })), "tzid")
  }
  if (citiesChanged) {
    await write("reference_cities", cityRows.map((city) => ({
      geoname_id: city.id, country_code: city.country, name: city.name,
      latitude: city.lat, longitude: city.lng, population: city.pop, timezone: city.tz,
    })), "geoname_id")
  }
  if (countriesChanged || citiesChanged) {
    const entries = [
      ...(countriesChanged ? [{ source: "mledoze/countries snapshot", source_version: countryVersion, record_count: countries.length }] : []),
      ...(citiesChanged ? [{ source: "GeoNames cities15000 snapshot", source_version: cityVersion, record_count: cityRows.length }] : []),
    ]
    const { error } = await db.from("reference_imports").insert(entries)
    if (error) throw error
  }
  return { countries: countriesChanged ? countries.length : 0, cities: citiesChanged ? cityRows.length : 0 }
}
