# africa classifieds

A classifieds board for buying and selling across Africa: cars, houses, jobs, electronics, and the rest of the usual categories. Search, filter by country and category, save listings, and post an ad.

Listings in the catalog are sample ads. Ads you post, saved hearts, and messages are stored in Supabase. Uploaded photos are served from Supabase Storage. City search uses the bundled GeoNames snapshot and the reference database.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## What’s included

- Browse, search, and sort. A selected country shows its capital, local time, time zone, currency, languages, and calling code. Search any city in that country, or filter to cities that already have ads. A city with no ads shows a map and opens the post form with that place filled in. Price sort keeps each currency together.
- The country control in the top bar searches by country, capital, or ISO code.
- A category sidebar
- Listing pages with a message, phone reveal, and WhatsApp link
- Post an ad, with a photo from your computer or a category image
- Saved ads and your own ads
- Supabase Postgres stores posted ads, saves, and messages, and a public Storage bucket serves listing photos. Run `database/board.sql` on the connected Supabase project before deploying the board routes.

## Reference data

- **Countries.** ISO 3166-1 codes and names, snapshotted from the open [mledoze/countries](https://github.com/mledoze/countries) dataset (the historical source behind REST Countries). The public REST Countries API v3 is deprecated, and v5 needs a key. `REST_COUNTRIES_API_KEY` is reserved for a later refresh; the app ships the snapshot so it runs with no key.
- **Cities.** GeoNames places with population over 15,000, each with an IANA time zone. A country’s default zone is its capital’s zone (Tanzania is `Africa/Dar_es_Salaam`).
- **Currencies.** ISO 4217 codes. Display names come from Unicode CLDR through `Intl.DisplayNames`. Sample ads stay in USD. A new ad defaults to the country’s currency, and USD stays available.
- **Languages.** ISO 639 codes, with CLDR display names through `Intl`.
- **Time zones.** IANA Time Zone Database, formatted with `Intl.DateTimeFormat`.
- **Map and search.** OpenStreetMap embeds on listing pages. City suggestions come from the bundled GeoNames snapshot and do not call the public Nominatim search service. Typed cities that do not match GeoNames are stored without a pin.

Rebuild the snapshots with `node scripts/build-reference.mjs`.

## Reference database and sync webhook

The checked-in snapshots are the app's offline fallback. The dedicated Supabase
database mirrors those records so other clients can query the same reference
data. Apply `database/schema.sql` once, then import the snapshots with
`node scripts/reference-sql.mjs batches` and apply numbered batches from
`node scripts/reference-sql.mjs 0` onward. The import is idempotent. The
database holds countries, cities (population at least 15,000), currencies,
languages, time zones, country relationships, and source hashes. There are no
currency conversion rates or translated names stored in these tables.

`GET /api/reference/countries` and `GET /api/reference/cities?country=KE&q=Nai`
read from Supabase with its publishable key and use the bundled snapshot if
Supabase is unavailable. The board's city controls use the city endpoint.
Display labels and local time remain formatted by `Intl` at runtime.

`POST /api/reference/sync` is a webhook receiver for a snapshot update. Send
`Authorization: Bearer <REFERENCE_WEBHOOK_SECRET>` after a deployment containing
the refreshed JSON files. It upserts only changed snapshots and stores their
SHA-256 versions in `reference_imports`. The endpoint **does not** accept arbitrary
external data or call upstream services. Configure `SUPABASE_URL`, a server-only
`SUPABASE_SECRET_KEY`, and `REFERENCE_WEBHOOK_SECRET` in Vercel. The key must
never be prefixed `NEXT_PUBLIC_` or committed. If Vercel supplies the legacy
`SUPABASE_SERVICE_ROLE_KEY`, the sync handler supports it too.

The upstream datasets do not send webhooks. Refresh them deliberately with
`node scripts/build-reference.mjs`, review the resulting data diff and license
attribution, deploy the updated snapshot, and then call the sync endpoint.
This prevents a third party's changed country or city record from appearing
on the live board without review. The source data comes from
[mledoze/countries](https://github.com/mledoze/countries) (ODbL 1.0) and
[GeoNames cities15000](https://download.geonames.org/export/dump/)
(CC BY 4.0). ISO code semantics are described by
[ISO](https://www.iso.org/iso-4217-currency-codes.html); currency and language
display names use Unicode CLDR through the server's `Intl` runtime, and city
time zones use IANA identifiers supplied by GeoNames. Maps are OpenStreetMap
embeds; no request goes to the public Nominatim autocomplete API.

## Photos

User uploads accept JPEG, PNG, or WebP, up to 700 KB in the posting form.
The server validates the file signature, uploads it to `listing-photos`,
and stores only the resulting public URL in Postgres. A signed, HTTP-only,
same-site browser cookie identifies the owner for edits, saves, and messages;
the server rejects cross-origin writes. The optional `BOARD_SESSION_SECRET`
can be set to a dedicated random value of at least 32 characters; otherwise
the server-only Supabase key signs sessions with a separate HMAC context.
Keep that key private. Clearing browser cookies loses access to existing
posts, because this demo does not yet offer account sign-in or recovery.
The earlier temporary SQLite records cannot be recovered from Vercel
instances; the legacy browser-side export is imported on first load.

Sample photos come from Unsplash, Pexels, and Wikimedia Commons. The Toyota HiAce photo is by Lawrence Ruiz and the diesel generator photo is by Biswarup Ganguly, both CC BY-SA via Wikimedia Commons.
# advert
# advert

Production `adverts` is linked to `skinyanjui/advert` on `main` and its dedicated Supabase project is attached only to the Production environment. Each update to `main` creates a Production deployment. The webhook secret is a Vercel Secret scoped to Production; after changing environment variables, redeploy for the new value to take effect. Reference tables are readable through RLS, while snapshot imports use the server-only key.
