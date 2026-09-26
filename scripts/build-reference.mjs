// Builds src/data/countries.json and src/data/cities.json.
// Countries: ISO 3166 fields from the open mledoze/countries dataset
// (the source REST Countries was built on; the live v5 API needs a key).
// Cities and IANA time zones: GeoNames cities15000.
// Display names for regions, languages, and currencies: Intl / Unicode CLDR.

import { writeFileSync } from "node:fs"
import { execSync } from "node:child_process"

const countryUrl =
  "https://raw.githubusercontent.com/mledoze/countries/master/countries.json"
const citiesZip = "https://download.geonames.org/export/dump/cities15000.zip"

const countryPath = "/tmp/refdata/countries.json"
const citiesPath = "/tmp/refdata/cities15000.txt"

execSync(`mkdir -p /tmp/refdata && curl -fsSL -o ${countryPath} ${countryUrl}`, {
  stdio: "inherit",
})
execSync(
  `curl -fsSL -o /tmp/refdata/cities15000.zip ${citiesZip} && unzip -p /tmp/refdata/cities15000.zip cities15000.txt > ${citiesPath}`,
  { stdio: "inherit" },
)

const rawCountries = JSON.parse(await import("node:fs").then((fs) => fs.readFileSync(countryPath, "utf8")))
const regionNames = new Intl.DisplayNames(["en"], { type: "region" })
const currencyNames = new Intl.DisplayNames(["en"], { type: "currency" })

const primary = new Set(["KE", "TZ", "UG", "RW", "ET", "ZA", "GH", "NG", "ZM"])

const africa = rawCountries.filter(
  (country) => country.region === "Africa" && country.unMember === true,
)

const citiesText = await import("node:fs").then((fs) => fs.readFileSync(citiesPath, "utf8"))
const codes = new Set(africa.map((country) => country.cca2))

/** @type {Array<{id:number,name:string,country:string,lat:number,lng:number,pop:number,tz:string}>} */
const cities = []
for (const line of citiesText.split("\n")) {
  if (!line) continue
  const parts = line.split("\t")
  const country = parts[8]
  if (!codes.has(country)) continue
  const timezone = parts[17]
  if (!timezone || !timezone.includes("/")) continue
  cities.push({
    id: Number(parts[0]),
    name: parts[1],
    country,
    lat: Number(Number(parts[4]).toFixed(4)),
    lng: Number(Number(parts[5]).toFixed(4)),
    pop: Number(parts[14]) || 0,
    tz: timezone,
  })
}
cities.sort((a, b) => b.pop - a.pop)

function fold(value) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
}

const citiesByCountry = new Map()
for (const city of cities) {
  const list = citiesByCountry.get(city.country) ?? []
  list.push(city)
  citiesByCountry.set(city.country, list)
}

function timezoneFor(country) {
  const list = citiesByCountry.get(country.cca2) ?? []
  const capital = country.capital?.[0]
  if (capital) {
    const match = list.find((city) => fold(city.name) === fold(capital))
    if (match) return match.tz
  }
  return list[0]?.tz ?? "Africa/Abidjan"
}

const countries = africa
  .map((country) => {
    const root = country.idd?.root ?? ""
    const suffix = country.idd?.suffixes?.[0] ?? ""
    const currencies = Object.entries(country.currencies ?? {}).map(([code, info]) => {
      let name = info.name
      try {
        name = currencyNames.of(code) || info.name
      } catch {
        name = info.name
      }
      return { code, name, symbol: info.symbol ?? code }
    })
    const languages = Object.entries(country.languages ?? {}).map(([code, name]) => ({
      code,
      name,
    }))
    const [lat, lng] = country.latlng ?? [0, 0]
    const displayOverrides = { CD: "DR Congo", CG: "Congo" }
    let name = displayOverrides[country.cca2] ?? country.name.common
    if (!displayOverrides[country.cca2]) {
      try {
        name = regionNames.of(country.cca2) || name
      } catch {
        name = country.name.common
      }
    }
    return {
      code: country.cca2,
      alpha3: country.cca3,
      numeric: country.ccn3,
      name,
      officialName: country.name.official,
      capital: country.capital?.[0] ?? "",
      lat: Number(lat.toFixed(4)),
      lng: Number(lng.toFixed(4)),
      subregion: country.subregion ?? "Africa",
      callingCode: `${root}${suffix}`,
      population: country.population ?? 0,
      currencies,
      languages,
      timezone: timezoneFor(country),
      primary: primary.has(country.cca2),
    }
  })
  .sort((a, b) => a.name.localeCompare(b.name))

writeFileSync("src/data/countries.json", `${JSON.stringify(countries)}\n`)
writeFileSync("src/data/cities.json", `${JSON.stringify(cities)}\n`)
console.log(`wrote ${countries.length} countries and ${cities.length} cities`)
