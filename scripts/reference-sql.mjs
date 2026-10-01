// Emit one atomic import. Run the generated SQL with a server-only DB connection.
// Usage: node scripts/reference-sql.mjs sync > /tmp/advert-reference-sync.sql
import { readFileSync } from "node:fs"
import { createHash } from "node:crypto"

if (process.argv[2] && process.argv[2] !== "sync") {
  throw new Error("Numbered batches are retired. Use reference-sql.mjs sync for an atomic snapshot import.")
}
const countries = JSON.parse(readFileSync("src/data/countries.json", "utf8"))
const cities = JSON.parse(readFileSync("src/data/cities.json", "utf8")).filter((city) => city.pop >= 15000)
const manifest = JSON.parse(readFileSync("src/data/reference-manifest.json", "utf8"))
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`
const hash = (rows) => createHash("sha256").update(JSON.stringify(rows)).digest("hex")
for (const [dataset, rows] of [["countries", countries], ["cities", cities]]) {
  if (hash(rows) !== manifest[dataset].contentHash || rows.length !== manifest[dataset].recordCount) {
    throw new Error(`${dataset} differs from its manifest. Rebuild and review the reference snapshot first.`)
  }
}
const generatedAt = manifest.countries.generatedAt ? `${quote(manifest.countries.generatedAt)}::timestamptz` : "null"
process.stdout.write(`select public.sync_reference_snapshot(\n  ${quote(JSON.stringify(countries))}::jsonb,\n  ${quote(JSON.stringify(cities))}::jsonb,\n  ${quote(hash(countries))}, ${quote(hash(cities))}, ${generatedAt}\n);\n`)
