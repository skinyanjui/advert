# africa classifieds

A classifieds board for buying and selling across Africa: cars, houses, jobs, electronics, and the rest of the usual categories. Search, filter by country and category, save listings, and post an ad. Ads and saved hearts stay in this browser.

Listings in the catalog are sample ads. Ads and saved hearts stay in this browser. City search can ask OpenStreetMap for extra place names.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## What’s included

- Browse, search, and sort. A selected country shows its capital, local time, time zone, currency, languages, and calling code. Search any city in that country, or filter to cities that already have ads. A city with no ads shows a map and opens the post form with that place filled in. Price sort keeps each currency together.
- The location menu and the More list search by country, capital, or ISO code.
- Country chips and a category sidebar
- Listing pages with a message, phone reveal, and WhatsApp link
- Post an ad, with a photo from your computer or a category image
- Saved ads and your own ads

## Reference data

- **Countries.** ISO 3166-1 codes and names, snapshotted from the open [mledoze/countries](https://github.com/mledoze/countries) dataset (the historical source behind REST Countries). The public REST Countries API v3 is deprecated, and v5 needs a key. `REST_COUNTRIES_API_KEY` is reserved for a later refresh; the app ships the snapshot so it runs with no key.
- **Cities.** GeoNames places with population over 15,000, each with an IANA time zone. A country’s default zone is its capital’s zone (Tanzania is `Africa/Dar_es_Salaam`).
- **Currencies.** ISO 4217 codes. Display names come from Unicode CLDR through `Intl.DisplayNames`. Sample ads stay in USD. A new ad defaults to the country’s currency, and USD stays available.
- **Languages.** ISO 639 codes, with CLDR display names through `Intl`.
- **Time zones.** IANA Time Zone Database, formatted with `Intl.DateTimeFormat`.
- **Map and search.** OpenStreetMap embeds on listing pages. City search also asks Nominatim through `/api/places` (one request a second, ten-minute cache). Typed cities that do not match GeoNames or a map suggestion are stored without a pin.

Rebuild the snapshots with `node scripts/build-reference.mjs`.

## Photos

Sample photos come from Unsplash, Pexels, and Wikimedia Commons. The Toyota HiAce photo is by Lawrence Ruiz and the diesel generator photo is by Biswarup Ganguly, both CC BY-SA via Wikimedia Commons.
