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
| Display currency | Explicit profile/device override; otherwise country registry | `listing` means original listing currency |
| Country/city/currency/language/time-zone reference data | Supabase reference tables | Versioned checked-in snapshots |
| Reference provenance | `reference_imports` + reference manifest | Snapshot hash |
| Listing | `board_listings` | Catalog entries are samples only |
| Listing lifecycle | `board_listings.status` + lifecycle timestamps | Legacy payload `sold` is read-only compatibility |
| Listing business limits | `src/lib/marketplace-policy.ts` | None |
| Category identity | `src/lib/category-registry.ts` | Localized labels in i18n |
| Category posting schema | `src/lib/posting.ts` | Stable field/option IDs derive from schema IDs |
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
