# Compliance controls

> Generated from `src/lib/compliance.ts` and `src/lib/product-capabilities.ts`. Do not edit the control list by hand.

## Current product facts

- **accountMinimumAge:** 18
- **paymentProcessing:** false
- **marketingEmail:** false
- **marketingRobotexts:** false
- **thirdPartyAdPixels:** false
- **sellsPersonalInformation:** false
- **crossContextBehavioralAdvertising:** false
- **significantDecisionAdmt:** false
- **safetyModerationAutomation:** true
- **gpcRecognized:** true
- **dntDisclosed:** true
- **privacyRightsWorkflow:** true
- **structuredIllegalContentNotice:** true
- **moderationRedress:** true
- **dataExport:** true
- **accountDeletion:** true

## Law-to-product registry

### Security assurance & transfer frameworks

**State:** operator_action

SOC 2, ISO/IEC 27001:2022, CASA Tier 2, EU-U.S. Data Privacy Framework, and PCI DSS are tracked separately from privacy-law implementation. No certification, attestation, assessment, or DPF participation is claimed unless operator evidence is configured.

**Triggers**

- SOC 2: pursue an independent SOC examination when customers or enterprise procurement require assurance over relevant Trust Services Criteria.
- ISO/IEC 27001:2022: establish and operate an ISMS before seeking accredited certification.
- CASA Tier 2: applicable when a platform or integration requires the Cloud Application Security Assessment Tier 2 process.
- EU-U.S. DPF: do not claim participation unless the legal entity has completed and maintains the formal self-certification process.
- PCI DSS v4.0.1: reassess scope before the service stores, processes, transmits, or can affect the security of payment card account data.

**Implemented controls**

- Server-side RBAC, authenticated privacy operations, service-role isolation, and security-oriented response headers provide baseline technical controls.
- The product registry keeps payment processing, advertising, and high-risk processing facts explicit so scope changes can trigger reassessment.

**Operator actions**

- No SOC 2 report is recorded; do not display a SOC 2 badge or attestation claim.
- No ISO/IEC 27001:2022 certificate is recorded; do not claim certification.
- No CASA Tier 2 assessment is recorded; do not claim completion.
- No EU-U.S. DPF participation is recorded; do not claim DPF certification/participation.
- No PCI DSS attestation is recorded; current product fact says buyer payment processing is disabled.

### EU / EEA GDPR

**State:** conditional

Conditional on establishment, offering goods/services to people in the EEA, or monitoring covered individuals.

**Triggers**

- EEA establishment, EEA offering, or covered monitoring.
- High-risk processing may require a DPIA; large-scale/special-category or monitoring facts may require a DPO.

**Implemented controls**

- Privacy notice describes purposes, legal bases, recipients/processors, retention approach, transfers, and rights.
- Access/portability export, profile correction, deletion, objection/restriction/consent-withdrawal request types, and tracked privacy cases are implemented.
- Account and privacy data are protected with server-side RBAC and service-role-only privacy case storage.
- New listings default to marketplace messaging; optional direct phone/WhatsApp sharing is off until the seller enables it, and listing validation rejects apparent payment-card or sensitive identity data.

**Operator actions**

- Configure the controller legal name and business address.
- Determine whether an Article 27 EU representative is required and configure one if applicable.
- Determine whether a DPO is legally required and configure contact details if applicable.
- Document the actual transfer mechanism and processor DPAs before representing a specific transfer safeguard.
- Run a DPIA before introducing high-risk profiling, significant automated decisions, sensitive-data processing, or systematic monitoring.

### California CCPA / CPRA + 2026 regulations

**State:** conditional

Conditional on statutory business thresholds and California consumer data.

**Triggers**

- CCPA/CPRA business thresholds.
- Future sale/share, targeted advertising, sensitive-data use, or significant-decision ADMT.
- 2026 California risk-assessment, cybersecurity-audit, and ADMT rules apply only when their statutory/regulatory triggers are met.

**Implemented controls**

- Notice-at-collection categories/purposes, rights, Privacy Choices, no-sale/share statement, and GPC recognition are implemented.
- Access, portability, correction, deletion, opt-out, limit-sensitive, agent, and appeal-capable request intake is tracked.
- Current product registry states no sale/share, targeted advertising, third-party ad pixels, or significant-decision ADMT.
- Listing contact defaults minimize personal information disclosure and sensitive/payment-card patterns are rejected from listing text.

**Operator actions**

- Reassess notice, opt-out links, risk assessments, ADMT notices/choices, and cybersecurity-audit duties before enabling advertising, profiling, or new high-risk processing.
- Maintain request-verification, authorized-agent, response, denial, and appeal procedures.

### California Online Privacy Protection Act (CalOPPA)

**State:** implemented

Applies to operators of commercial websites or online services that collect covered personal information from California consumers.

**Triggers**

- Any new third party that tracks users across unrelated sites or apps.
- Any material change to categories collected, sharing practices, retention, or user choices.

**Implemented controls**

- Privacy Policy is conspicuously linked from the product and describes categories collected, uses, processors/third parties, retention, effective/version dates, and correction/deletion methods.
- Privacy Choices and the Privacy Policy disclose the current response to browser Do Not Track signals and the absence of third-party cross-site behavioral advertising in the current product.
- Global Privacy Control is handled separately where CCPA/CPRA opt-out duties apply.

**Operator actions**

- Keep the DNT/tracking disclosure synchronized with actual analytics, advertising SDKs, and third-party scripts.
- Maintain a conspicuous Privacy Policy link in production navigation/footer surfaces.

### Colorado, Oregon, Texas, Indiana and other U.S. state privacy laws

**State:** conditional

Conditional on each state law's thresholds, exemptions, residents, and processing activities.

**Triggers**

- Covered-resident and threshold tests for each state.
- Universal opt-out obligations where applicable.
- Consent or assessment duties before sensitive/high-risk processing.

**Implemented controls**

- Privacy request workflow supports access, correction, deletion, portability, opt-out, restriction/objection, and appeals.
- GPC is detected and treated as an opt-out signal where applicable.
- Current product does not use targeted advertising or sale of personal data.

**Operator actions**

- Add any state-specific notice, appeal timing, or opt-out behavior when a covered threshold is reached.
- Keep a current state-law applicability review as transaction/user scale changes.

### Kenya DPA, Nigeria NDPA, South Africa POPIA, Ghana DPA

**State:** conditional

Conditional on controller/processor establishment, targeting, data-subject location, registration thresholds, and local exemptions.

**Triggers**

- Applicable local controller/processor or data-subject nexus.
- Registration, information-officer/DPO, localization, breach-notification, or transfer rules may depend on country and scale.

**Implemented controls**

- Request workflow supports access, correction, deletion, portability, objection, restriction, withdrawal, and review/appeal patterns.
- Privacy notice includes purpose limitation, minimization, security, transfer, and rights concepts.
- Country/jurisdiction can be recorded on each privacy case for operational routing.

**Operator actions**

- Confirm registration/controller obligations with the Kenya ODPC, Nigeria NDPC, South Africa Information Regulator, and Ghana DPC where applicable.
- Appoint/register an information officer or DPO where legally required.
- Document country-specific cross-border transfer safeguards and breach procedures before relying on them.

### EU Digital Services Act (DSA)

**State:** conditional

Conditional on providing covered intermediary/online-platform services to recipients in the EU; marketplace-specific duties depend on the service and trader/consumer contracting model.

**Triggers**

- Offering covered platform services to EU recipients.
- Allowing EU consumers to conclude distance contracts with traders can trigger trader-traceability obligations.
- EU hosting/platform moderation can require notices of action, reasons, complaint/redress processes, and transparency reporting.

**Implemented controls**

- Listing reports include a structured illegal-content notice path with listing location, optional jurisdiction, legal/factual explanation, and a good-faith attestation.
- Restrictive moderator actions require a written reason, record the affected seller, policy basis, restriction type, and whether the decision was automated.
- Moderation removals are reversible hidden states rather than destructive deletes.
- Affected sellers receive an in-product statement of reasons and a free six-month appeal path; appeals are reviewed by an administrator and can reverse the restriction.
- Temporary report-threshold hiding is disclosed and can be reversed by moderator review.

**Operator actions**

- Before an EU launch, perform a DSA classification and small/micro-enterprise applicability review.
- If marketplace trader-traceability rules apply, add the legally required trader identity/verification fields before permitting EU trader offers; do not collect those documents speculatively for non-EU users.
- If in scope, validate the implemented notice/action and appeal workflow against the operator's DSA classification, add out-of-court redress information and any required Transparency Database submission/integration, and produce the required transparency reporting metrics.

### EU ePrivacy / cookie and device-storage rules

**State:** conditional

Conditional on EU terminal-device storage/access and national implementation; strictly necessary storage can be treated differently from nonessential tracking.

**Triggers**

- Adding advertising, behavioral analytics, fingerprinting, or other nonessential terminal storage/access.

**Implemented controls**

- The current app uses authentication/session storage and user-requested preferences and does not run third-party advertising pixels.
- Privacy disclosures describe cookies/local storage and the current no-targeted-advertising posture.

**Operator actions**

- Before adding nonessential cookies or SDK storage, implement a purpose-specific consent/preference layer and prevent those technologies from loading before the required choice.
- Maintain a current cookie/storage inventory and durations.

### U.S. ADA web accessibility and related accessibility duties

**State:** conditional

Applicability depends on the operating entity and public-accommodation/public-entity facts; accessibility is also a product-quality requirement.

**Triggers**

- Operating as a covered public accommodation or public entity, and any jurisdiction-specific accessibility requirement.

**Implemented controls**

- Core controls use semantic labels, keyboard-capable component primitives, visible focus states, and text alternatives where implemented.

**Operator actions**

- Run recurring keyboard, screen-reader, zoom/reflow, contrast, form-error, and WCAG-based testing; screenshot review alone is not sufficient.
- Provide an accessible method to request assistance and remediate reported barriers.

### FTC advertising, endorsement, and native-ad disclosure rules

**State:** implemented

Applies when listings or content are paid, sponsored, endorsed, or otherwise commercial in a way that could affect how consumers evaluate them.

**Triggers**

- Paid placement, affiliate relationships, endorsements/testimonials, creator promotions, or platform-sold advertising.

**Implemented controls**

- Posting supports a Sponsored / paid promotion designation and sponsored listings receive an explicit visible label.
- Undisclosed promotion is a report reason and moderators can mark a listing sponsored.
- Paid featuring uses Stripe checkout followed by admin approval, a time-bounded priority placement under relevance sort, and a proximate Ad · Featured label plus ranking-effect explanation. Complimentary grants are distinguished from paid placements.

**Operator actions**

- Keep commercial disclosures clear, prominent, proximate, and in the language of the surrounding content.
- Review paid-placement terms, refund operation, Stripe onboarding, tax obligations, and the clarity of ranking disclosures before enabling checkout in production.

### U.S. Fair Housing Act and federal equal-employment advertising laws

**State:** implemented

Applies according to the housing/employment advertisement, the poster's legal status, statutory coverage, exemptions, and applicable federal, state, and local law.

**Triggers**

- Housing offered for sale or rental and employment/recruitment advertising.
- Expansion into ad targeting, recommendation, or delivery systems that could selectively exclude protected groups.
- State or local protected-class and advertising rules beyond federal baselines.

**Implemented controls**

- Covered residential Property and Jobs posting flows show category-specific anti-discrimination disclosures.
- Submissions in scope require a versioned fair-access attestation stored with the listing payload and revalidated by the server.
- Users can report discriminatory housing or employment content, and moderators can review it through the existing reversible moderation/redress workflow.
- The product does not infer protected characteristics or automatically decide legality from keywords.

**Operator actions**

- Keep the fair-access disclosure and protected-trait guidance synchronized with applicable jurisdictions.
- Before adding demographic targeting or optimization for housing/jobs, perform a dedicated discrimination and automated-ad-delivery review.

### U.S. INFORM Consumers Act

**State:** conditional

Conditional on marketplace/seller transaction thresholds and covered online-marketplace status.

**Triggers**

- Covered high-volume third-party seller activity and marketplace/payment facts.

**Implemented controls**

- Terms disclose that seller-verification requirements will be added if the product enters covered transaction/payment flows.
- The product currently does not process buyer purchase payments and does not collect speculative bank/tax identifiers.

**Operator actions**

- Before covered payment/transaction features launch, implement seller information collection, verification, certification, required disclosures, suspension, security, and suspicious-activity reporting.

### CAN-SPAM + TCPA / FCC rules

**State:** conditional

Applies according to message purpose, technology, consent, and recipient.

**Triggers**

- Commercial marketing email.
- Platform-originated autodialed/prerecorded marketing calls or robotexts.

**Implemented controls**

- Current email is described as transactional/account messaging.
- Account creation and seller phone entry are explicitly not treated as consent to automated marketing calls or texts.
- WhatsApp consent is listing-scoped and excludes unrelated marketing.

**Operator actions**

- Before marketing email launches, add sender/address/ad identification as applicable and one-click/working unsubscribe processing.
- Before automated marketing calls/texts launch, implement separate channel/purpose-specific consent and revocation suppression.

### COPPA / child privacy

**State:** implemented

Current service policy is adults 18+; COPPA risk arises if the service is directed to children under 13 or knowingly collects their data.

**Triggers**

- Any future child-directed product, actual-knowledge collection from children, or age-segmented experience.

**Implemented controls**

- Account creation requires a separate 18+ attestation, stored independently in the legal acceptance evidence.
- Terms state accounts are intended for adults and the service is not directed to children under 13.

**Operator actions**

- Do not introduce child-directed onboarding/content or knowingly retain under-13 account data without a dedicated COPPA design and counsel review.

### FTC Act Section 5 privacy/security and consumer protection

**State:** implemented

U.S. unfair/deceptive-practices enforcement can apply regardless of a comprehensive privacy-law threshold.

**Triggers**

- Any material change to data use, advertising, security, seller claims, or consumer-facing disclosures.

**Implemented controls**

- Privacy claims are tied to current product facts (no sale/share/targeted ads, current processors, current contact channels).
- RBAC, database access restrictions, deletion/export, and data minimization are encoded in product/backend behavior.

**Operator actions**

- Keep disclosures synchronized with actual telemetry, processors, product features, and security controls.
- Maintain incident-response and breach-notification procedures appropriate to applicable jurisdictions.

### DMCA §512 safe-harbor readiness

**State:** operator_action

Relevant if the operator seeks U.S. safe-harbor protection for qualifying user-hosted content.

**Triggers**

- Operator chooses to rely on §512 safe harbor for hosted user content.

**Implemented controls**

- Terms prohibit copyright infringement and document the need for notice/takedown and counter-notice handling.

**Operator actions**

- Register and maintain the designated DMCA agent with the U.S. Copyright Office before claiming safe-harbor reliance.
- Configure and publish the designated agent name, email, and postal address.
- Implement operational notice, removal, counter-notice, repeat-infringer, and restoration procedures.
