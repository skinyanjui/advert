// Emit idempotent SQL batches from the checked-in reference snapshots.
// Usage: node scripts/reference-sql.mjs batches | node scripts/reference-sql.mjs 0
// The first batch contains countries and lookup tables; subsequent batches contain cities.
import { readFileSync } from "node:fs"
import { createHash } from "node:crypto"

const countryText = readFileSync("src/data/countries.json", "utf8")
const cityText = readFileSync("src/data/cities.json", "utf8")
const countries = JSON.parse(countryText)
const cities = JSON.parse(cityText).filter((city) => city.pop >= 15000)
const batchSize = 100
const total = 1 + Math.ceil(cities.length / batchSize)

if (process.argv[2] === "batches") {
  console.log(total)
  process.exit(0)
}
const batch = Number(process.argv[2])
if (!Number.isInteger(batch) || batch < 0 || batch >= total) {
  throw new Error(`Choose a batch from 0 to ${total - 1}`)
}

function quote(value) {
  return `'${String(value).replaceAll("'", "''")}'`
}
function number(value) {
  if (!Number.isFinite(value)) throw new Error("Non-finite reference number")
  return value
}
function upsert(table, columns, rows, conflict) {
  if (!rows.length) return ""
  return `insert into public.${table} (${columns.join(", ")}) values\n${rows
    .map((row) => `(${row.join(", ")})`)
    .join(",\n")}\non conflict (${conflict.join(", ")}) do update set ${columns
    .filter((column) => !conflict.includes(column))
    .map((column) => `${column} = excluded.${column}`)
    .join(", ")};\n`
}

const sql = ["begin;\n"]
if (batch === 0) {
  sql.push(
    upsert(
      "reference_countries",
      ["code", "alpha3", "numeric_code", "name", "official_name", "capital", "latitude", "longitude", "subregion", "calling_code", "population", "default_timezone", "primary_market", "source_payload"],
      countries.map((c) => [quote(c.code), quote(c.alpha3), c.numeric ? quote(c.numeric) : "null", quote(c.name), quote(c.officialName), quote(c.capital), number(c.lat), number(c.lng), quote(c.subregion), quote(c.callingCode), number(c.population), quote(c.timezone), c.primary ? "true" : "false", `${quote(JSON.stringify(c))}::jsonb`]),
      ["code"],
    ),
  )
  const currencies = [...new Map(countries.flatMap((c) => c.currencies.map((v) => [v.code, v]))).values()]
  sql.push(upsert("reference_currencies", ["code", "name", "symbol"], currencies.map((v) => [quote(v.code), quote(v.name), quote(v.symbol)]), ["code"]))
  const languages = [...new Map(countries.flatMap((c) => c.languages.map((v) => [v.code, v]))).values()]
  sql.push(upsert("reference_languages", ["code", "name"], languages.map((v) => [quote(v.code), quote(v.name)]), ["code"]))
  sql.push(upsert("reference_timezones", ["tzid"], [...new Set([...countries.map((c) => c.timezone), ...cities.map((c) => c.tz)])].map((tz) => [quote(tz)]), ["tzid"]).replace(/ do update set ;/, " do nothing;"))
  const currencyLinks = countries.flatMap((c) => c.currencies.map((v) => [quote(c.code), quote(v.code)]))
  const languageLinks = countries.flatMap((c) => c.languages.map((v) => [quote(c.code), quote(v.code)]))
  sql.push(upsert("reference_country_currencies", ["country_code", "currency_code"], currencyLinks, ["country_code", "currency_code"]).replace(/ do update set ;/, " do nothing;"))
  sql.push(upsert("reference_country_languages", ["country_code", "language_code"], languageLinks, ["country_code", "language_code"]).replace(/ do update set ;/, " do nothing;"))
  const version = createHash("sha256").update(JSON.stringify(countries)).digest("hex")
  sql.push(`insert into public.reference_imports (source, source_version, content_hash, source_url, license, generated_at, record_count) values ('mledoze/countries snapshot', ${quote(version)}, ${quote(version)}, 'https://github.com/mledoze/countries', 'ODbL-1.0', now(), ${countries.length});\n`)
} else {
  const slice = cities.slice((batch - 1) * batchSize, batch * batchSize)
  sql.push(upsert("reference_cities", ["geoname_id", "country_code", "name", "latitude", "longitude", "population", "timezone"], slice.map((c) => [number(c.id), quote(c.country), quote(c.name), number(c.lat), number(c.lng), number(c.pop), quote(c.tz)]), ["geoname_id"]))
  if (batch === total - 1) {
    const version = createHash("sha256").update(JSON.stringify(cities)).digest("hex")
    sql.push(`insert into public.reference_imports (source, source_version, content_hash, source_url, license, generated_at, record_count) values ('GeoNames cities15000 snapshot', ${quote(version)}, ${quote(version)}, 'https://download.geonames.org/export/dump/cities15000.zip', 'CC-BY-4.0', now(), ${cities.length});\n`)
  }
}
sql.push("commit;\n")
process.stdout.write(sql.join(""))
