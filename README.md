# africa classifieds

A classifieds board for buying and selling across Africa: cars, houses, jobs, electronics, and the rest of the usual categories. Search, filter by country and category, save listings, and post an ad.

Listings in the catalog are sample ads. Ads you post, saved hearts, messages, reports, and profiles are stored in Supabase. Uploaded photos are served from Supabase Storage. City search uses the bundled GeoNames snapshot and the reference database.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## What’s included

- Browse, search, and sort. A selected country shows its capital, local time, time zone, currency, languages, and calling code. Search any city in that country, or filter to cities that already have ads. A city with no ads shows a map and opens the post form with that place filled in. Price sort keeps each currency together.
- The country control in the top bar searches by country, capital, or ISO code.
- A category sidebar (desktop) and category sheet (mobile)
- Listing pages with messaging, phone reveal, WhatsApp, and “Report this ad”
- Post an ad with up to 6 photos (cover + gallery) or a category image; ads expire after 60 days and can be renewed
- Seller accounts: email OTP / magic link, optional password, Profile settings, and session claim so guest cookie posts move onto the account
- My ads with active / paused / sold / expired actions
- Messages inbox for real buyer–seller threads
- Saved ads
- Admin report review at `/admin/reports` for emails listed in `ADMIN_EMAILS`
- Supabase Postgres stores board data; a public Storage bucket serves listing photos. Apply `database/board.sql`, then the migrations below, on the connected Supabase project before deploying the board routes.

## Auth

Sign-in lives at `/sign-in`. When `NEXT_PUBLIC_SUPABASE_URL` and a publishable key are set, new ads require a signed-in account (the post form and `POST /api/listings` both enforce this). Guests who posted earlier still keep cookie ownership for edits until they sign in; `POST /api/auth/claim` moves cookie-owned listings, saves, and conversations onto `auth.users.id`.

Supported flows:

- Email one-time code and magic link (`/auth/confirm`, `/auth/callback`)
- Optional email + password (sign-in, sign-up, forgot/reset at `/auth/reset`)
- Change email and password from Profile; sign out of this device or all devices
- Phone/SMS and Google OAuth stay hidden until `NEXT_PUBLIC_AUTH_PHONE=1` or `NEXT_PUBLIC_AUTH_GOOGLE=1` after those providers are configured in Supabase

Paste the HTML under `supabase/templates/` into Supabase Dashboard → Authentication → Email Templates (Confirm signup, Magic Link, Reset password, Change email). Prefer `token_hash` links over Management API calls. Site URL and redirect allow lists must include `/auth/confirm` and `/auth/callback` for production, previews, and localhost.

Protected routes (`/my-ads`, `/messages`, `/admin/reports`) redirect unsigned visitors to `/sign-in?next=…`.

## Board database migrations

Apply in order on the board Supabase project (SQL editor), after `database/board.sql`:

1. `database/migrations/20260926_seller_accounts.sql`
2. `database/migrations/20260926_seller_inbox.sql`
3. `database/migrations/20260926_report_listing.sql`
4. `database/migrations/20260926_ad_expiry.sql`
5. `database/migrations/20260926_multi_photo.sql` (documenting payload-only multi-photo; noop)
6. `database/migrations/20260926_lock_listings_reads.sql` — revoke public `SELECT` on board tables; all reads go through the server secret key
7. `database/migrations/20260927_reference_relation_indexes.sql` (if using the reference schema indexes)
8. `database/migrations/20260928_listing_status.sql`
9. `database/migrations/20260928_terms_acceptance.sql` — append-only Terms/Privacy acceptance log
10. `database/migrations/20260928_sponsored_ads.sql` — `board_listings.sponsored`, `undisclosed_promo` report reason, `moderation_actions`
11. `supabase/migrations/20260928_profile_settings.sql`
12. `supabase/migrations/20260928_profile_buyer_contact.sql`

After the lock migration, anyone with only the publishable key must not be able to read `board_listings` (including phones).

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

User uploads accept JPEG, PNG, or WebP, up to 700 KB each, and up to 6 photos
per ad. The cover photo is stored as `image` and mirrored as the first entry in
`images[]`. The server validates each file signature, uploads to
`listing-photos`, and stores only the resulting public URLs in Postgres.
Sellers can add, remove, reorder, and set the cover when editing.

A signed, HTTP-only, same-site `board_session` cookie still identifies guest
owners for legacy posts, saves, and messages; the server rejects cross-origin
writes. Prefer signing in so ownership survives cookie clears and other devices.
The optional `BOARD_SESSION_SECRET` can be set to a dedicated random value of at
least 32 characters; otherwise the server-only Supabase key signs sessions with
a separate HMAC context. Keep that key private.

Sample photos come from Unsplash, Pexels, and Wikimedia Commons. The Toyota HiAce photo is by Lawrence Ruiz and the diesel generator photo is by Biswarup Ganguly, both CC BY-SA via Wikimedia Commons.

## Expiry reminders

Ads expire 60 days after `posted_at` (or renew). `vercel.json` schedules
`GET /api/cron/expiry-reminders` daily at 08:00 UTC. Set `CRON_SECRET` and call
with `Authorization: Bearer <CRON_SECRET>`. Optional `RESEND_API_KEY` and
`RESEND_FROM_EMAIL` send reminder email to signed-in sellers; without Resend the
route still advances reminder markers as a no-op send.

## Marketplace contact and compliance notes

- Listing phone numbers are normalized server-side using the listing country before they are stored.
- Sellers can independently enable WhatsApp and phone calls; marketplace messaging remains separate.
- Click-to-chat uses WhatsApp's `wa.me` flow and includes the listing ID in the prefilled message.
- Phone data stays behind the server-side board API; do not restore public `SELECT` access to `board_listings`.
- The Terms and Privacy drafts describe the off-platform WhatsApp handoff and must receive legal review before production reliance.
- Before operating at a scale or model covered by seller-verification laws such as the U.S. INFORM Consumers Act, implement the required seller collection, verification, disclosure, suspension, data-security, and consumer reporting procedures. The current app does not claim that operational compliance.
- Configure a real public support address and, where legally required, a telephone reporting mechanism before relying on the marketplace for regulated seller-disclosure/reporting obligations.

## Production

Production `adverts` is linked to `skinyanjui/advert` on `main` and its dedicated Supabase project is attached only to the Production environment. Each update to `main` creates a Production deployment. The webhook secret is a Vercel Secret scoped to Production; after changing environment variables, redeploy for the new value to take effect. Reference tables are readable through RLS, while snapshot imports use the server-only key. Board listing rows are not readable with the publishable key after the lock-listings migration.
