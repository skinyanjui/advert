# africa classifieds

A classifieds board for buying and selling across Africa: cars, houses, jobs, electronics, and the rest of the usual categories. Search, filter by country and category, save listings, and post an ad.

Listings in the catalog are sample ads. Ads you post, saved listings, Messenger conversations, reports, and profiles are stored in Supabase. Uploaded photos are served from Supabase Storage. City search uses the bundled GeoNames snapshot and the reference database.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## What’s included

- Browse, search, and sort. A selected country shows its capital, local time, time zone, currency, languages, and calling code. Search any city in that country, or filter to cities that already have ads. A city with no ads keeps the city filter selected and opens the post form with that place filled in. Price sort keeps each currency together.
- The country control in the top bar searches by country, capital, or ISO code.
- A category sidebar on desktop and a compact drawer from the right on mobile. The mobile drawer includes a market selector, expandable preferences, and legal/help links in one scrolling area.
- Listing pages with inline Messenger, authenticated SMS/Text, Call and WhatsApp contact, and “Report this ad”
- Post an ad with up to 6 photos (cover + gallery) or a category image; new ads default to the country saved during onboarding or in Settings, explicit location-specific Post links can override that default, automatic draft locations follow the current default, and deliberately chosen draft/edit locations are preserved; ads expire after 60 days and can be renewed
- Seller accounts: email OTP / magic link, optional password, Profile settings, and session claim so guest cookie posts move onto the account
- My ads with active / paused / sold / expired actions
- Messenger for real buyer–seller listing threads
- Saved ads
- Persisted RBAC for administrative operations. `ADMIN_EMAILS` is bootstrap-only; `board_user_roles` is authoritative after role creation.
- Supabase Postgres stores board data; a public Storage bucket serves listing photos. Apply `database/board.sql`, then the migrations below, on the connected Supabase project before deploying the board routes.

## Auth

Sign-in lives at `/sign-in`. When `NEXT_PUBLIC_SUPABASE_URL` and a publishable key are set, new ads require a signed-in account (the post form and `POST /api/listings` both enforce this). Guests who posted earlier still keep cookie ownership for edits until they sign in; `POST /api/auth/claim` moves cookie-owned listings, saves, and conversations onto `auth.users.id`.

Supported flows:

- Email one-time code and magic link (`/auth/confirm`, `/auth/callback`)
- Optional email + password (sign-in, sign-up, forgot/reset at `/auth/reset`)
- Change email and password from Profile; sign out of this device or all devices
- Phone/SMS and Google OAuth stay hidden until `NEXT_PUBLIC_AUTH_PHONE=1` or `NEXT_PUBLIC_AUTH_GOOGLE=1` after those providers are configured in Supabase

Paste the HTML under `supabase/templates/` into Supabase Dashboard → Authentication → Email Templates (Confirm signup, Magic Link, Reset password, Change email). Prefer `token_hash` links over Management API calls. Site URL and redirect allow lists must include `/auth/confirm` and `/auth/callback` for production, previews, and localhost.

Protected account routes such as `/saved`, `/my-ads`, `/messages`, and `/account/moderation` redirect unsigned visitors to `/sign-in?next=…`. Administrative routes use narrow persisted permissions: moderation review, privacy review, compliance management, and administrative access. Role assignments are stored in `board_user_roles`. Profile keeps its public language/currency settings visible but protects private account data and mutations.

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
13. `database/migrations/20260929_contact_events.sql` — first-party listing/contact intent events; no phone numbers or message contents
14. `database/migrations/20260929_whatsapp_consents.sql` — scoped buyer WhatsApp consent records; no phone numbers or message contents
15. `database/migrations/20260929_whatsapp_platform_enforcement.sql` — WABA policy-warning/restriction state and event history
16. `database/migrations/20260929_contact_sms.sql` — adds SMS/text contact intent to the contact-event allow-list
17. `database/migrations/20260929_privacy_rights_workflow.sql` — age/privacy acceptance evidence, privacy-rights cases and audit events, compliance incident records
18. `database/migrations/20260929_moderation_redress.sql` — moderation statement-of-reasons evidence and seller appeal records
19. `database/migrations/20260929_illegal_content_notice.sql` — structured illegal-content notice fields and report reason
20. `database/migrations/20261001_persisted_rbac.sql` — authoritative persisted application roles; `ADMIN_EMAILS` is bootstrap-only
21. `database/migrations/20261001_reference_provenance.sql` — source URL, license, content hash, and generation metadata for reference imports
22. `supabase/migrations/20261001213348_authority_contracts.sql` — atomic reference import, active reference rows, versioned taxonomy validation, listing payload constraints, and country/currency relation
23. `supabase/migrations/20261001215910_authority_constraint_indexes.sql` — covering foreign-key indexes and validation of the new listing contracts

After the lock migration, anyone with only the publishable key must not be able to read `board_listings` (including phones).


## Authority model

The repository documents authoritative ownership in `docs/architecture/sources-of-truth.md`. Shared business limits live in `src/lib/marketplace-policy.ts`; category identity lives in `src/lib/category-registry.ts`; contact channels live in `src/lib/contact-methods.ts`; currency availability lives in `src/lib/currency-registry.ts`; and compliance product facts live in `src/lib/product-capabilities.ts`.

Reference APIs prefer the reference database and return provenance/version/staleness metadata. The checked-in ISO/GeoNames snapshots are an explicit resilience fallback, not a second unlabelled source of truth. `npm test` includes authority-integrity checks that fail on taxonomy, reference-relation, lifecycle, contact-event, policy, and provenance drift.

Compliance documentation is generated from the registry with `npm run docs:compliance`.

Request and listing response types derive from Zod schemas in `src/lib/runtime-contracts.ts`.
Taxonomy identities and option codes are frozen in `src/data/taxonomy-v1.json`; relabelling
does not change stored values. Identity/schema changes require a new version and migration.
`npm test -- --test-name-pattern="posting|country"` runs targeted tests.
Generate the rollback-only database checks with
`node --import tsx scripts/database-contracts.ts > /tmp/advert-database-contracts.sql`
and execute the generated SQL on the target database after applying migrations.
The chat-and-file implementation audit is in `docs/implementation-audit.md`.

## Reference data

- **Countries.** ISO 3166-1 codes and names, snapshotted from the open [mledoze/countries](https://github.com/mledoze/countries) dataset (the historical source behind REST Countries). The public REST Countries API v3 is deprecated, and v5 needs a key. `REST_COUNTRIES_API_KEY` is reserved for a later refresh; the app ships the snapshot so it runs with no key.
- **Cities.** GeoNames places with population over 15,000, each with an IANA time zone. A country’s default zone is its capital’s zone (Tanzania is `Africa/Dar_es_Salaam`).
- **Currencies.** ISO 4217 codes. Display names come from Unicode CLDR through `Intl.DisplayNames`. Sample ads preserve their original currency. New ads use a currency accepted in their country. Browsing prices follow the buyer's selected market, then their saved default country, unless they choose another African currency. Each view shows one price; conversions use ≈. Without a buyer market or usable exchange rates, the posted price stays visible. Posting previews, Review, My ads, and Messenger show the exact posted amount and currency, formatted in the viewer's language.
- **Languages.** ISO 639 codes, with CLDR display names through `Intl`.
- **Time zones.** IANA Time Zone Database, formatted with `Intl.DateTimeFormat`.
- **Map and search.** OpenStreetMap embeds on listing pages. City suggestions come from the bundled GeoNames snapshot and do not call the public Nominatim search service. Typed cities that do not match GeoNames are stored without a pin.

Rebuild the snapshots with `node scripts/build-reference.mjs`.

## Reference database and sync webhook

The checked-in snapshots are the app's offline fallback. The dedicated Supabase
database is the production authority so other clients can query the same reference
data. Apply `database/schema.sql` and the ordered migrations, then generate an atomic
import with `node scripts/reference-sql.mjs sync > /tmp/advert-reference-sync.sql`
and execute that SQL with a server-only database connection. The import is idempotent
and uses an advisory lock; data and provenance commit together. Removed places become
inactive so historical references remain valid. The
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
SHA-256 versions in `reference_imports`, in the same transaction as all reference changes. The endpoint **does not** accept arbitrary
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

User uploads accept JPEG, PNG, or WebP, up to 12 MB before browser preparation,
and up to 6 photos per ad. Preparation resizes to at most 1600 pixels, strips
photo metadata, and stores files of at most 1.5 MB each. The cover photo is stored as `image` and mirrored as the first entry in
`images[]`. The server validates each file signature, uploads to
`listing-photos`, and stores only the resulting public URLs in Postgres.
Sellers can add, remove, reorder, and set the cover when editing.

A signed, HTTP-only, same-site `board_session` cookie remains only for legacy ownership migration and public browsing continuity. Protected account actions—including saves, Messenger, direct seller contact, posting, reporting, profile access, and listing management—require an authenticated member role.
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

## Privacy and regulatory controls

- Signed-in profile country/city is authoritative and is cached locally for responsiveness; anonymous onboarding/device state is only a bootstrap/fallback. New-post precedence is explicit action location → signed-in profile → anonymous device default → temporary browsing location → no default. Display currency derives from the authoritative country unless the user has an explicit currency override; with no country, prices remain in each listing's original currency instead of defaulting to one market.
- Account creation uses two separate confirmations: an 18+ age attestation and a Terms acceptance / Privacy Policy acknowledgment. The server stores the current document versions, disclosure version, locale, timestamp, IP/user-agent evidence, age attestation, and privacy acknowledgment in the append-only legal acceptance log.
- Protected APIs require the current legal evidence before returning protected data or performing account mutations. A legal-version bump therefore creates an account-access reacceptance boundary rather than interrupting an unrelated feature at the moment of use.
- Signed-in users can correct profile information, download a machine-readable JSON export, delete their account, submit privacy-rights requests, review their privacy-request history, and review/appeal moderation restrictions.
- `/privacy/request` accepts access, portability, correction, deletion, restriction, objection, opt-out, sensitive-data limitation, consent-withdrawal, and appeal requests. It records jurisdiction, verification state, internal target date, status, resolution, and audit events. Authorized-agent requests are supported without accepting identity documents in the free-text field.
- California sale/share opt-out and sensitive-information limitation cases use a 15-business-day internal target; other privacy cases use a 28-calendar-day internal operating target. These targets are deliberately conservative and are not a claim that every jurisdiction has the same statutory deadline.
- `/privacy/choices` exposes the current no-sale/share/no-targeted-advertising position, detects `Sec-GPC: 1`, and discloses the current response to browser DNT signals. The current app does not run third-party behavioral-advertising pixels.
- Covered residential Property and Jobs listings require a versioned fair-access attestation before publication. The server enforces the attestation, stores it with the listing payload, and discriminatory housing/job content has a dedicated report reason.
- Listing reports include a structured illegal-content notice option. It stores the reporter's legal/factual explanation, optional jurisdiction, and good-faith attestation for moderator review without exposing reporter identity to the seller.
- Restrictive moderator actions require a reason. Moderator “remove” is a reversible hidden state, not a destructive delete. Affected sellers can see the reason and policy basis and submit an in-product appeal for six months; administrators can uphold or reverse the decision with a reasoned resolution.
- Admin operations include `/admin/privacy` for rights requests, `/admin/moderation-appeals` for seller redress, `/admin/incidents` for security/privacy incident records and notification assessments, and `/admin/compliance` for the law-to-product control registry.
- The compliance registry covers current or conditional requirements for GDPR, CCPA/CPRA, CalOPPA, Indiana/Colorado/Oregon/Texas and other U.S. state privacy laws, Kenya/Nigeria/South Africa/Ghana privacy regimes, DSA, ePrivacy, accessibility, FTC advertising/endorsement rules, INFORM, CAN-SPAM/TCPA, COPPA, FTC Act Section 5, and DMCA §512. Conditional entries identify the product/business facts that would trigger additional implementation.
- Account deletion removes account-linked active application data according to the deletion service; privacy exports include the user's legal acceptance evidence, privacy cases, moderation decisions, appeals, reports, direct-contact events, WhatsApp consent, messages sent, saves, listings, and profile information without exposing counterpart private records.
- All privacy-case, moderation-redress, and compliance-incident tables are server-only: RLS is enabled and direct `anon`/`authenticated` table grants are revoked. API-level RBAC is the access boundary.
- Set `NEXT_PUBLIC_SUPPORT_EMAIL`, `LEGAL_OPERATOR_NAME`, and `LEGAL_OPERATOR_ADDRESS` before final legal approval. Configure an EU representative or DPO only when the applicable facts require one.
- If the operator intends to rely on DMCA §512 safe harbor, register and maintain a designated DMCA agent with the U.S. Copyright Office and configure the public agent details before claiming that protection.
- Supabase currently reports leaked-password protection as disabled; enable that Auth control in the Supabase project before treating the password-security checklist as complete.
- The legal pages remain drafts pending licensed counsel review. Applicability still depends on the operating entity, geography, scale, transaction model, advertising/marketing practices, profiling, and actual processor/transfer arrangements.

## Marketplace contact and compliance notes

- Listing phone numbers are normalized server-side using the listing country before they are stored.
- Sellers can enable direct phone contact; authenticated buyers can use Call, SMS/Text, or WhatsApp where the listing allows it. Marketplace Messenger remains a separate on-site channel.
- Click-to-chat uses WhatsApp's `wa.me` flow with listing context in the prefilled message; the contact UI does not display the internal listing ID.
- Before opening WhatsApp, buyers explicitly consent to receive replies from the named seller about that listing. The server stores the consent text/version, seller/listing snapshots, buyer auth/session identifier, and timestamp. The consent does not authorize unrelated marketing.
- Sellers using WhatsApp for business communications remain responsible for WhatsApp policy, applicable communications law, opt-out handling, and any additional consent required for future or different message categories.
- If the WhatsApp Business Platform is enabled, subscribe the WABA to `account_update` at `/api/webhooks/whatsapp/account-update`. Configure server-only `WHATSAPP_WEBHOOK_VERIFY_TOKEN` and `WHATSAPP_APP_SECRET` values.
- WABA enforcement events are mapped to `warning`, `template_block`, `all_messages_block`, `account_lock`, or `disabled`. Future platform senders must call `assertWhatsAppPlatformSendAllowed()` before sending. Template blocks prevent marketing/utility/authentication templates while preserving service replies; all-message blocks, locks, and disablement stop every platform send.
- Admins can inspect current WABA enforcement state and recent events at `/admin/whatsapp`. Appeals and acknowledgments still occur in Meta Business Support Home; the marketplace does not override Meta enforcement.
- Contact analytics records only listing ID, event type (including message, SMS/text, call, or WhatsApp intent), timestamp, and the existing authenticated/session owner identifier; it does not store phone numbers or off-platform message contents.
- Phone data stays behind the server-side board API; do not restore public `SELECT` access to `board_listings`.
- The Terms and Privacy drafts describe Messenger plus off-platform SMS/text, phone, and WhatsApp handoffs and must receive legal review before production reliance.
- Before operating at a scale or model covered by seller-verification laws such as the U.S. INFORM Consumers Act, implement the required seller collection, verification, disclosure, suspension, data-security, and consumer reporting procedures. The current app does not claim that operational compliance.
- Configure a real public support address and, where legally required, a telephone reporting mechanism before relying on the marketplace for regulated seller-disclosure/reporting obligations.

## Production

Production `adverts` targets `skinyanjui/advert` on `main`, and its dedicated Supabase project is attached only to the Production environment. Automatic Vercel Git deployments are restricted to `main`; pull requests use the GitHub quality gate instead of consuming a Vercel build for every intermediate branch commit. A merge to `main` is not considered deployed until the corresponding Vercel deployment is confirmed `READY`; Git integration can fail or stop creating production deployments even when preview builds and CI pass. The webhook secret is a Vercel Secret scoped to Production; after changing environment variables, redeploy for the new value to take effect. Reference tables are readable through RLS, while snapshot imports use the server-only key. Board listing rows are not readable with the publishable key after the lock-listings migration.

## Featured ads (Stripe)

Sellers use **My ads → Feature an ad** (`/my-ads/featured`) to buy seven days
for **USD 10** through Stripe Checkout. The Sponsored checkbox still discloses
outside sponsorship; it does not buy ranking. Payment submits a request for admin
review. `/admin/promotions` (also linked from admin Profile) approves requests,
rejects/refunds them, removes/refunds active paid promotions, grants complimentary
placements for 1–30 days, and retries pending refunds. Every decision requires a
seller-visible reason and is retained in append-only decision history. Complimentary grants do not create a Stripe charge.

Apply `database/migrations/20261002_featured_promotions.sql` manually to the
**development** Supabase project before running the new code, and to the target
project before deployment. This adds server-only promotion history/events and RPCs,
plus `featured`, `featured_until`, `featured_paid`, and `featured_promotion_id` on
`board_listings`. Ordinary listing reads and the existing reminder cron remain compatible before
the migration; checkout/admin promotion APIs require it. No schema changes
or Stripe charges are made automatically during builds. The migration is repeatable.

Configure `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `APP_BASE_URL` securely
alongside the existing Supabase public URL/key and server-only key. `APP_BASE_URL`
is the trusted application origin (HTTPS except for localhost development). Use
Stripe test mode first; checkout is unavailable without these bindings. Card details
stay on Stripe's hosted checkout. The package uses server-owned inline Stripe price
data, USD 1000 cents and seven days; clients cannot choose the amount or duration.
No recurring subscription or automatic renewal is created. Configure your Stripe
business, receipt, tax and refund settings before enabling real payments.

Register `/api/webhooks/stripe` as a Stripe webhook destination for:

- `checkout.session.completed` and `checkout.session.async_payment_succeeded`
- `checkout.session.expired`
- `refund.created`, `refund.updated`, and `charge.refunded`

For local test mode, use the Stripe CLI's `stripe listen --forward-to
localhost:3000/api/webhooks/stripe`, set its signing secret in local environment
settings, and use Stripe's documented test cards. Test payment → pending queue →
approval, and payment → rejection → refund, before enabling live mode. Success-page
redirects do **not** confirm payment. Signed webhook processing checks the session,
amount, currency and current PaymentIntent; database transactions prevent replayed
payment events from granting another period or reviving a refunded promotion. A
failed webhook returns non-2xx for Stripe retries. If checkout creation times out,
retry with the same promotion; the server uses a stable idempotency key. Signed
webhooks recover missing session bindings. After 23 hours an unbound checkout
requires operator reconciliation in Stripe before retry, so a discarded idempotency
key cannot create a second charge. Expired
sessions are cancelled by webhook; do not pay twice while awaiting confirmation.

Approved periods start at approval and last seven days. The listing must be active
and have the full period remaining before expiry. Paused, sold, hidden or expired
ads receive no boost while the clock continues. Eligible featured ads appear first
among matching results under **relevance** sort; explicit price/newest order is
preserved. Filters still apply. Cards/details distinguish `Ad · Featured` (paid)
from complimentary `Featured`, and browse explains the paid ranking effect.
The former hardcoded Land Cruiser featured label has been removed.

End dates are enforced on reads and in the UI, independently of cron. The existing
`/api/cron/expiry-reminders` daily job now also clears elapsed promotions and removes
events older than 90 days; configure `CRON_SECRET` and keep the schedule enabled.
Refund failure leaves an explicit `refund_pending` state for admin retry. Pending
Stripe refunds remain pending until their succeeded webhook arrives. Full dashboard
refunds remove ranking too. Failed refunds require operator attention in Stripe;
never mark them completed manually without confirming payment-provider state.

Stats are approximate first-party visible-card impressions (at least 50% visible
for one second) and card-to-listing clicks, deduplicated per board session/account
per day, excluding sellers and inactive placements. They are not fraud-audited or
billing measurements. No raw account identifier, card details or message content
is stored in event rows. Promotion/payment decision history survives listing deletion
so pending refunds can still be resolved. Privacy exports include a seller's own
promotion history. Terms/Privacy draft versions changed, so accounts must reaccept.

`npm test` includes PostgreSQL-backed tests (PGlite) covering the actual migration,
ownership, confirmed payment before approval, retries, refunds, expiry, event
deduplication, access grants, and forged featured fields. External Stripe/Supabase
integration still requires the test-mode validation above.
