# Small-business project audit

Date: 2026-10-02. Code baseline: `0314032`.

The referenced “Audit small-business improvements” chat contains no completed audit or business data. It proposed sales, pricing, customer experience, and operations as review areas. This report applies those areas to the repository. The small-business plugin is unavailable; no plugin assessment is claimed.

## Assessment

The marketplace has substantial foundations: country-aware prices and locations, recoverable posting drafts, listing management, buyer/seller messaging, reporting and appeals, persisted permissions, privacy workflows, and a paid featured-listing lifecycle. The next priority is making real inventory discoverable and proving seller value before expanding monetization.

Impact and effort below are qualitative engineering/business judgments, not measured revenue projections. No production traffic, sales, customer interviews, operating costs, or provider configuration was available for this audit.

| Priority | Finding and evidence | Improvement | Impact / effort |
| --- | --- | --- | --- |
| 1 | Ordinary inventory is limited to the newest 500 rows before visibility or market filtering. Featured inventory has a separate 500-row query. My ads derives ownership from that same board snapshot. Older ordinary listings can therefore disappear from discovery and seller management while still active. `src/lib/board-store.ts:198`, `src/components/my-ads-page.tsx:65`. | Add server-side filtered, paginated public discovery and a separate owner-scoped listing endpoint. Resolve direct listing URLs independently of the board window. Verify with more than 500 listings across markets, including paused/expired owner listings. | High / high |
| 2 | Contact intent is recorded, but there is no seller lead report. Promotion reporting shows only card impressions/clicks, so sellers cannot see whether spending produced messages, calls, or other contact intent. `src/app/api/contact-events/route.ts:19`, `src/components/promotions-page.tsx:118`. | Provide an owner-authorized per-listing funnel: views, unique contact intent by channel, conversations, and seller-marked sold status. Define deduplication and attribution before linking promotion spend to leads. Treat contact clicks as intent, not completed transactions. | High / medium |
| 3 | Promotion review/refunds require an operator to inspect the queue. Decision paths contain no seller notification or queue-age escalation; seller status refreshes only while the page is open. A failed immediate refund asks an admin to retry. `src/app/api/admin/promotions/route.ts:25`, `src/components/promotions-page.tsx:43`. | Set a review target, show oldest pending requests, notify sellers of decisions/refund progress, and add bounded refund retries plus operational alerts. Include payment reconciliation instructions and named support ownership. | High / medium |
| 4 | Checkout recovery tells sellers to contact support, but public support is optional and the contact page explicitly has an unavailable state. Legal operator identity is also configuration-dependent. These are launch-readiness checks, not proof that production settings are missing. `src/app/api/promotions/checkout/route.ts:35`, `src/lib/site.ts:4`, `src/app/contact/page.tsx`, `src/lib/legal-config.ts`. | Verify a working support mailbox and operator identity before taking payments. Give paid-placement problems a clear contact route and response target. Exercise checkout, approval, rejection, refund, webhook retries, and cron against the deployed database/provider configuration. | High / low–medium |
| 5 | Sample listings are always appended to real inventory. Detail pages label them Sample and disable real contact, but browse cards have no sample label. Buyers can mistake demonstration stock for available goods. `src/lib/marketplace.tsx:478`, `src/components/listing-card.tsx:35`, `src/components/listing-detail.tsx:847`. | Keep samples in an explicit demo mode, or label them on cards and separate them from live search counts. Measure real supply per city/category before opening more markets. | Medium–high / low |
| 6 | Featured checkout is USD 10 for seven days and card-only. The promotion interface and terms are English literals although the marketplace supports French/Swahili. `src/lib/marketplace-policy.ts:13`, `src/app/api/promotions/checkout/route.ts:38`, `src/components/promotions-page.tsx:85`. | Retain the agreed package; localize the full paid journey first. Research card access, FX friction, and willingness to pay in an initial market before adding local payment methods or prices. Evaluate contribution margin using fees, refunds, support effort, and incremental qualified leads. | Medium / medium |
| 7 | Listing metadata includes canonical URLs and social previews, but there is no sitemap route in the repository; browse rendering depends on client board data. Existing SEO foundations should be preserved. `src/app/(board)/listings/[id]/page.tsx:37`, `src/components/browse.tsx`. | Publish a sitemap of active real listings and indexable market/category pages; verify crawler-visible listing content and canonical production origin. Avoid indexing sample or thin empty-market pages. | Medium / medium |

## Measurement and delivery order

1. **Inventory and launch reliability:** fix listing retrieval limits; verify support, deployed migration, Stripe and cron; distinguish demo stock.
2. **Seller value and operations:** expose contact intent, establish review/refund service targets, and add decision notifications and failure alerts.
3. **Growth experiments:** translate the paid journey, improve search acquisition, and test one city/category with actual supply and demand before changing prices or adding markets.

Track real active listings by market, search-to-detail rate, detail-to-contact rate, time to first qualified contact, posting completion, repeat seller activity, promotion purchase/approval/refund rates, review age, and contribution margin. Establish denominators and a baseline first. Do not call contact clicks sales or promotion clicks incremental leads without an attribution method.

## Validation and limits

The current automated suite passed: 242 tests, zero failures or skips. This audit inspected repository code and routes; it did not repeat the full lint/typecheck/build gate or run live Stripe payments, email delivery, database migrations, production search tests, customer research, or mobile usability sessions. Passing tests do not establish business viability or operational readiness.

No application behavior, pricing, or production configuration was changed by this audit.

## Implementation follow-up

The subsequent implementation addresses these findings with uncapped database
batch traversal, owner-only contact reporting, review deadlines and durable
notification/refund operations, a verified-support checkout gate, explicit sample
labels, paid-flow translations and search sitemaps/metadata. The full board remains
a client snapshot; server-filtered search is still a future scaling improvement.
Provider delivery, deployed migrations, scheduler execution and live payment
behavior require deployment verification. See README for the migration and
configuration sequence; the historical audit above remains the baseline evidence.

Follow-up validation: lint, typecheck, all 262 tests and the production build pass.
Production HTTP smoke checks passed for home, robots and both sitemap routes;
sample detail pages expose the Sample label and noindex metadata. Anonymous lead,
support-admin and operations-cron requests, plus cross-origin checkout/support
mutations, were rejected. These checks used the local production server, not live
provider credentials. These checks preceded production deployment.
