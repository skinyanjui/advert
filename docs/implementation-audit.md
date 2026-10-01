# Chat and project-file implementation audit

Audit date: 2026-10-01. Repository: `skinyanjui/advert`. Baseline: `5e908b3`.

This audit compares the accessible project conversations, uploaded project text, repository
history, implementation, tests, and live Supabase schema. It includes the numbered
authority-refactor proposal in the October 1 “Test invocation verification” conversation,
the posting/location/currency/help requirements in the project chats, the uploaded
DevelopmentDoctrine text dated September 29, and the October 1 pasted deployment log.
The pasted build failure was already corrected on main before this audit.

## Authority proposal

| # | Requirement | Audit result and implementation evidence |
| --- | --- | --- |
| 1 | Country-driven currency default | Existing implementation verified; regression coverage now checks Uganda/UGX, explicit overrides, one displayed price, and unavailable-rate fallback. `prefs.ts`, `price-display.ts`. |
| 2 | Shared location model | Existing `location.ts`/`cities.ts` resolution retained. Unknown typed cities now produce no map point or buyer distance; a specific public pickup description is still displayed. `distance.ts`, listing detail. |
| 3 | Server profile authority | Signed-in profile resolution and cross-device preference behavior retained. Malformed profile patches return 400. Follow-up fixes automatic draft defaults blocking the current profile; deliberately chosen draft locations and edits are preserved. |
| 4 | Persisted RBAC roles | Existing `board_user_roles` authority verified against the live database. Client grants remain revoked. Added an index for `assigned_by`. |
| 5 | Capability permissions | Existing server and UI permissions verified for posting, messaging, direct contact, reporting, profile access, and administrative operations. |
| 6 | Listing state machine | Existing active/paused/sold/expired transitions verified. Full edits now parse separately from sold/pause/renew actions. |
| 7 | Registry-derived status filters | Existing `listing-status.ts` filters and transition tests verified. |
| 8 | Marketplace policy | Existing shared limits retained; specific-location length is now part of the policy. Request, domain, and DB checks agree on whole-unit prices and bounded writes. |
| 9 | Category catalog | Existing centralized category registry and expanded posting plans verified. |
| 10 | Identity independent of UI copy | Category and option identities use explicit codes. Relabelling options cannot change stored IDs; the frozen taxonomy contract excludes labels. |
| 11 | Stable option codes | Removed label-derived option IDs. Existing English labels remain accepted as legacy input and normalize to the same explicit codes. |
| 12 | Validated identifiers | Country, currency, and time-zone parsers are consumed by shared request schemas; listing and conversation identifiers are validated before storage. UTC is accepted. |
| 13 | Currency registry | Existing registry owns display choices; listing writes remain country-aware and the DB enforces country/currency relationships. |
| 14 | Provenance manifest | Added `reference-manifest.json` with source URLs, licenses, actual SHA-256 hashes and counts. Rebuilds record real generation times; unknown historical generation times stay null. |
| 15 | Reference database authority | Reference APIs validate database rows, respect active flags, time out safely, and accurately label database versus snapshot responses. Remote city suggestions take precedence over bundled entries. Sync is atomic and server-only. |
| 16 | Integrity checks | Added manifest/hash/count checks, complete reference-row validation, and a frozen taxonomy-to-DB comparison. Existing policy/status/contact checks retained. |
| 17 | Capability-driven compliance | Existing `product-capabilities.ts` and compliance registry verified; conservative defaults retained. |
| 18 | Generated compliance docs | Fixed the generator command and installed its missing `server-only` dependency. `npm run docs:compliance` now succeeds. |
| 19 | Contact registry | Marketplace messages now correctly declare authentication required. The guest CTA retains listing context through sign-in. Direct contact remains seller opt-in. |
| 20 | Schema-derived API contracts | Listing wire types and profile patch types derive from Zod. All JSON account/marketplace/privacy/moderation writes consume shared schemas; malformed JSON and field types return client errors. Signed webhook bodies retain their signature-specific parsing. |
| 21 | DB/domain constraint contract tests | Added rollback-only DB verification generated from shared valid/invalid fixtures. The live DB rejected 17 invalid payloads, accepted valid pinned/unpinned listings, and preserved private grants. |
| 22 | Versioned taxonomy IDs | Writes store taxonomy version 1. `taxonomy-v1.json` freezes category/type/field/option identities and its hash. Versionless legacy labels remain readable; edits normalize to version 1. |
| 23 | Sources-of-truth document | Updated `docs/architecture/sources-of-truth.md` for parsed request kinds, versioned taxonomy, atomic reference imports, provenance, and historical reference preservation. |

## Other chat requirements

| Requirement | Result |
| --- | --- |
| Category → Type → Details → Review | Existing four-step flow verified. Category clicks advance immediately; Back preserves selections. Legacy draft steps migrate to the equivalent current step. |
| Transport/logistics, Energy/power, Food/market goods, Industrial/commercial | Existing categories/subtypes and English/French/Swahili category keys verified. |
| Settings/onboarding country defaults and country-aware browsing | Fixed stale automatic draft countries (including Zimbabwe) overriding Settings. Draft location intent is persisted; explicit action context wins, selected draft locations are retained, and automatic defaults refresh country/city/currency together. Uganda display-price behavior has dedicated regression coverage. |
| Distance only in listing details | Existing card removal verified. Details now require real known or explicitly supplied coordinates for distance/map display. |
| Specific location during posting | Required neighborhood, landmark, pickup point, or address; a map pin is optional. Device-location failures offer typed-location recovery. Public disclosure is shown before using location. Same-origin geolocation requests are permitted by the document policy so client navigation to Post works; browser permission and the posting button's explicit action remain required. |
| Draft recovery | Drafts save and restore latitude, longitude, time zone, precision, pickup description, and whether location was chosen or inherited. Legacy drafts with pickup descriptions/specific pins retain their location; unfinished legacy defaults refresh from current Settings. Malformed pins are discarded while valid draft content is preserved. |
| Inline contact and Messenger | Existing inline composer retained. No messaging modal added. Sign-in, send failure, disabled status, and unread behavior remain covered by existing tests. |
| Help documentation | Replaced the abbreviated help page with complete English/French/Swahili help for posting, prices, location, buying, account/privacy, and recovery. Updated README, source/license attribution, and public-location privacy disclosure. |
| Privacy policy versioning | The new location disclosure has a new Privacy/disclosure version and effective date; existing accounts use the established reacceptance flow. Existing acceptance evidence is not rewritten. |
| Mobile and accessibility | New controls retain responsive layouts, 44px touch targets, accessible location-button labels, alert states, and city listbox semantics. |
| Reliable test invocation | `npm test` discovers all test files and forwards Node options before the file list. Targeted `--test-name-pattern` runs work without tsx CLI IPC. |

## Database verification

Applied migrations:

- `supabase/migrations/20261001213348_authority_contracts.sql`
- `supabase/migrations/20261001215910_authority_constraint_indexes.sql`

The reference sync refreshed 54 countries and retained the matching 4,017-city snapshot.
A second import reported zero changed countries/cities. An intentionally invalid city
caused the entire reference update and provenance publication to roll back. New listing
constraints were validated against existing rows. Test listings did not persist.

Supabase's private-table “RLS enabled, no policy” notices reflect intentional server-only
access with revoked browser grants; the audit verified those grants instead of adding
public policies. The missing foreign-key indexes found during the audit were added.

## Code verification

`npm run ci` passes lint, typecheck, all 225 tests, and the Next.js production build.
The test suite includes request/form compatibility, taxonomy identity, provenance,
country defaults, single-price conversion, unknown towns, and saved-pin recovery.
Targeted test-name filtering and compliance-document generation also pass.
Production deployment and public UI/API checks are reported in the task completion.

## External operator work still outstanding

These require real operator details, service configuration, or external evidence rather
than invented code values:

- Configure and verify the operator legal name/address and public support/privacy contacts.
- Obtain legal review and any applicable registration, representative, officer, transfer,
  or DMCA-agent evidence; the existing compliance screen tracks those requirements.
- Verify optional operational credentials and delivery (mail, reminder cron, reference webhook)
  before relying on those integrations. The audit does not claim delivery without a real send.
- Enable [Supabase leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
  in project authentication settings if supported by the project plan. The live security
  advisor reports it disabled; the installed Supabase connector does not expose auth-setting updates.

The product's legal notices remain drafts. Completing software controls does not establish
external legal approval or registrations.
