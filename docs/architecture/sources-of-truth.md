# Sources of truth

Use one authoritative owner for each concept. Caches, snapshots, UI state, and compatibility fields must not independently override the authoritative source.

| Concept | Authority | Cache / fallback |
| --- | --- | --- |
| Identity | Supabase Auth `auth.users` | Auth session cookie/token |
| Application role | `board_user_roles` | `ADMIN_EMAILS` only bootstraps a missing row |
| Permissions | `src/lib/access-control.ts` | None |
| Signed-in default country/city | `board_profiles.country_code/city` | localStorage mirrors the profile after sign-in |
| Anonymous default country/city | localStorage home place | Temporary board selection |
| Explicit posting location | `/post?country=&city=` action context | Profile/device fallback |
| Draft posting location | Explicit action context, then a deliberately chosen draft location, then the current posting default | Draft `locationSource` distinguishes chosen locations from inherited defaults; legacy pickup descriptions/specific pins establish intent |
| Browsing display currency | Explicit profile/device override → active buyer market → saved default country, using the country registry | The persisted `listing` preference means Follow country. With no buyer market or usable rates, display the posted currency. |
| Authoring/conversation price | Listing amount and currency | `ListingPrice` in `posted` mode applies viewer number formatting without conversion. Used by posting preview/review, My ads, and Messenger. |
| Country/city/currency/language/time-zone reference data | Supabase reference tables | Versioned checked-in snapshots with manifest hashes |
| Reference provenance | `reference_imports` + reference manifest | Snapshot hash |
| Listing | `board_listings` | Catalog entries are samples only |
| Listing lifecycle | `board_listings.status` + lifecycle timestamps | Legacy payload `sold` is read-only compatibility |
| Featured state and payment/review history | `board_listings.featured*` + `board_promotions` | Client cards use server fields and enforce end dates; sample badges have no authority |
| Promotion statuses and events | `src/lib/promotions.ts` | Runtime schemas and SQL constraints are checked by authority-integrity tests |
| Featured package, grants and analytics retention | `src/lib/marketplace-policy.ts` | Frozen SQL package constraints tested against the policy |
| Featured placement consent version | `src/lib/policy-versions.ts` | Stored evidence retains the checkout version |
| Listing business limits | `src/lib/marketplace-policy.ts` | None |
| Category identity | `src/lib/category-registry.ts` | Localized labels in i18n |
| Category posting schema | `src/lib/posting.ts` | Explicit field/option codes; versioned `src/data/taxonomy-v1.json` contract |
| Contact channels | `src/lib/contact-methods.ts` | Listing seller opt-in flags |
| Compliance product facts | `src/lib/product-capabilities.ts` | Environment configuration with conservative defaults |
| Law-to-product controls | `src/lib/compliance.ts` | Generated `docs/compliance-controls.md` |
| Consent/policy versions | Dedicated policy modules (`legal.ts`, `policy-versions.ts`) | Stored evidence retains historical version |
| Messages | Conversation/message tables | Client marketplace state |
| Privacy/moderation/incident evidence | Server-only database tables | No public-client copy |

## Resolution rules

For signed-in users, server profile state wins over device state. Device state is a cache and an onboarding bootstrap only. For new posts, explicit action context wins over the profile. Drafts and edits preserve their own saved location.

The reference database is the production authority. API responses expose authority, version, provenance, and staleness metadata. If the database cannot be read, the application uses the checked-in snapshot and labels it as a snapshot response.

When a new domain value is introduced, add a stable ID first, update its runtime validator and database constraint, add migration/backfill compatibility, and add an integrity test that compares the layers before removing legacy representations.

Reference sync uses the server-only `sync_reference_snapshot` RPC. Countries, cities,
relationships, active flags, and provenance publish in one transaction. Country/currency
relations retain historical tender pairs for old listings. A failed import publishes none
of its changes. Manifest generation dates remain unknown (`null`) for historical snapshots
until an intentional rebuild records a real generation time.

Listing request/response types derive from `runtime-contracts.ts` schemas. Writes normalize
legacy option labels to explicit option codes and store `taxonomyVersion`. The database
checks the frozen taxonomy contract and the country/currency relationship. Invalid JSON
and mistyped fields return client errors before any storage operation. Full edits and
lifecycle actions have distinct parsed request kinds.
