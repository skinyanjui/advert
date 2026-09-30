import "server-only"

export type ComplianceState = "implemented" | "conditional" | "operator_action"

export type ComplianceItem = {
  id: string
  law: string
  scope: string
  state: ComplianceState
  implemented: string[]
  triggers: string[]
  operatorActions: string[]
}

function configured(name: string): boolean {
  return Boolean(process.env[name]?.trim())
}

export const complianceFacts = {
  accountMinimumAge: 18,
  paymentProcessing: false,
  marketingEmail: false,
  marketingRobotexts: false,
  thirdPartyAdPixels: false,
  sellsPersonalInformation: false,
  crossContextBehavioralAdvertising: false,
  significantDecisionAdmt: false,
  safetyModerationAutomation: true,
  gpcRecognized: true,
  dntDisclosed: true,
  privacyRightsWorkflow: true,
  structuredIllegalContentNotice: true,
  moderationRedress: true,
  dataExport: true,
  accountDeletion: true,
} as const

export function complianceConfiguration() {
  return {
    supportEmail: configured("NEXT_PUBLIC_SUPPORT_EMAIL"),
    operatorName: configured("LEGAL_OPERATOR_NAME"),
    operatorAddress: configured("LEGAL_OPERATOR_ADDRESS"),
    dmcaAgentDetails:
      configured("DMCA_AGENT_NAME") &&
      configured("DMCA_AGENT_EMAIL") &&
      configured("DMCA_AGENT_ADDRESS"),
    dmcaAgentRegistered: process.env.DMCA_AGENT_REGISTERED === "1",
    euRepresentative: configured("PRIVACY_EU_REPRESENTATIVE"),
    dpoContact: configured("PRIVACY_DPO_EMAIL"),
  }
}

export function complianceItems(): ComplianceItem[] {
  const config = complianceConfiguration()
  return [
    {
      id: "gdpr",
      law: "EU / EEA GDPR",
      scope: "Conditional on establishment, offering goods/services to people in the EEA, or monitoring covered individuals.",
      state: "conditional",
      implemented: [
        "Privacy notice describes purposes, legal bases, recipients/processors, retention approach, transfers, and rights.",
        "Access/portability export, profile correction, deletion, objection/restriction/consent-withdrawal request types, and tracked privacy cases are implemented.",
        "Account and privacy data are protected with server-side RBAC and service-role-only privacy case storage.",
      ],
      triggers: [
        "EEA establishment, EEA offering, or covered monitoring.",
        "High-risk processing may require a DPIA; large-scale/special-category or monitoring facts may require a DPO.",
      ],
      operatorActions: [
        !config.operatorName || !config.operatorAddress
          ? "Configure the controller legal name and business address."
          : "Controller identity is configured.",
        !config.euRepresentative
          ? "Determine whether an Article 27 EU representative is required and configure one if applicable."
          : "EU representative contact is configured.",
        !config.dpoContact
          ? "Determine whether a DPO is legally required and configure contact details if applicable."
          : "DPO contact is configured.",
        "Document the actual transfer mechanism and processor DPAs before representing a specific transfer safeguard.",
        "Run a DPIA before introducing high-risk profiling, significant automated decisions, sensitive-data processing, or systematic monitoring.",
      ],
    },
    {
      id: "california",
      law: "California CCPA / CPRA + 2026 regulations",
      scope: "Conditional on statutory business thresholds and California consumer data.",
      state: "conditional",
      implemented: [
        "Notice-at-collection categories/purposes, rights, Privacy Choices, no-sale/share statement, and GPC recognition are implemented.",
        "Access, portability, correction, deletion, opt-out, limit-sensitive, agent, and appeal-capable request intake is tracked.",
        "Current product registry states no sale/share, targeted advertising, third-party ad pixels, or significant-decision ADMT.",
      ],
      triggers: [
        "CCPA/CPRA business thresholds.",
        "Future sale/share, targeted advertising, sensitive-data use, or significant-decision ADMT.",
        "2026 California risk-assessment, cybersecurity-audit, and ADMT rules apply only when their statutory/regulatory triggers are met.",
      ],
      operatorActions: [
        "Reassess notice, opt-out links, risk assessments, ADMT notices/choices, and cybersecurity-audit duties before enabling advertising, profiling, or new high-risk processing.",
        "Maintain request-verification, authorized-agent, response, denial, and appeal procedures.",
      ],
    },
    {
      id: "caloppa",
      law: "California Online Privacy Protection Act (CalOPPA)",
      scope: "Applies to operators of commercial websites or online services that collect covered personal information from California consumers.",
      state: "implemented",
      implemented: [
        "Privacy Policy is conspicuously linked from the product and describes categories collected, uses, processors/third parties, retention, effective/version dates, and correction/deletion methods.",
        "Privacy Choices and the Privacy Policy disclose the current response to browser Do Not Track signals and the absence of third-party cross-site behavioral advertising in the current product.",
        "Global Privacy Control is handled separately where CCPA/CPRA opt-out duties apply.",
      ],
      triggers: [
        "Any new third party that tracks users across unrelated sites or apps.",
        "Any material change to categories collected, sharing practices, retention, or user choices.",
      ],
      operatorActions: [
        "Keep the DNT/tracking disclosure synchronized with actual analytics, advertising SDKs, and third-party scripts.",
        "Maintain a conspicuous Privacy Policy link in production navigation/footer surfaces.",
      ],
    },
    {
      id: "us_states",
      law: "Colorado, Oregon, Texas, Indiana and other U.S. state privacy laws",
      scope: "Conditional on each state law's thresholds, exemptions, residents, and processing activities.",
      state: "conditional",
      implemented: [
        "Privacy request workflow supports access, correction, deletion, portability, opt-out, restriction/objection, and appeals.",
        "GPC is detected and treated as an opt-out signal where applicable.",
        "Current product does not use targeted advertising or sale of personal data.",
      ],
      triggers: [
        "Covered-resident and threshold tests for each state.",
        "Universal opt-out obligations where applicable.",
        "Consent or assessment duties before sensitive/high-risk processing.",
      ],
      operatorActions: [
        "Add any state-specific notice, appeal timing, or opt-out behavior when a covered threshold is reached.",
        "Keep a current state-law applicability review as transaction/user scale changes.",
      ],
    },
    {
      id: "africa_privacy",
      law: "Kenya DPA, Nigeria NDPA, South Africa POPIA, Ghana DPA",
      scope: "Conditional on controller/processor establishment, targeting, data-subject location, registration thresholds, and local exemptions.",
      state: "conditional",
      implemented: [
        "Request workflow supports access, correction, deletion, portability, objection, restriction, withdrawal, and review/appeal patterns.",
        "Privacy notice includes purpose limitation, minimization, security, transfer, and rights concepts.",
        "Country/jurisdiction can be recorded on each privacy case for operational routing.",
      ],
      triggers: [
        "Applicable local controller/processor or data-subject nexus.",
        "Registration, information-officer/DPO, localization, breach-notification, or transfer rules may depend on country and scale.",
      ],
      operatorActions: [
        "Confirm registration/controller obligations with the Kenya ODPC, Nigeria NDPC, South Africa Information Regulator, and Ghana DPC where applicable.",
        "Appoint/register an information officer or DPO where legally required.",
        "Document country-specific cross-border transfer safeguards and breach procedures before relying on them.",
      ],
    },
    {
      id: "dsa",
      law: "EU Digital Services Act (DSA)",
      scope: "Conditional on providing covered intermediary/online-platform services to recipients in the EU; marketplace-specific duties depend on the service and trader/consumer contracting model.",
      state: "conditional",
      implemented: [
        "Listing reports include a structured illegal-content notice path with listing location, optional jurisdiction, legal/factual explanation, and a good-faith attestation.",
        "Restrictive moderator actions require a written reason, record the affected seller, policy basis, restriction type, and whether the decision was automated.",
        "Moderation removals are reversible hidden states rather than destructive deletes.",
        "Affected sellers receive an in-product statement of reasons and a free six-month appeal path; appeals are reviewed by an administrator and can reverse the restriction.",
        "Temporary report-threshold hiding is disclosed and can be reversed by moderator review.",
      ],
      triggers: [
        "Offering covered platform services to EU recipients.",
        "Allowing EU consumers to conclude distance contracts with traders can trigger trader-traceability obligations.",
        "EU hosting/platform moderation can require notices of action, reasons, complaint/redress processes, and transparency reporting.",
      ],
      operatorActions: [
        "Before an EU launch, perform a DSA classification and small/micro-enterprise applicability review.",
        "If marketplace trader-traceability rules apply, add the legally required trader identity/verification fields before permitting EU trader offers; do not collect those documents speculatively for non-EU users.",
        "If in scope, validate the implemented notice/action and appeal workflow against the operator's DSA classification, add out-of-court redress information and any required Transparency Database submission/integration, and produce the required transparency reporting metrics.",
      ],
    },
    {
      id: "eprivacy",
      law: "EU ePrivacy / cookie and device-storage rules",
      scope: "Conditional on EU terminal-device storage/access and national implementation; strictly necessary storage can be treated differently from nonessential tracking.",
      state: "conditional",
      implemented: [
        "The current app uses authentication/session storage and user-requested preferences and does not run third-party advertising pixels.",
        "Privacy disclosures describe cookies/local storage and the current no-targeted-advertising posture.",
      ],
      triggers: [
        "Adding advertising, behavioral analytics, fingerprinting, or other nonessential terminal storage/access.",
      ],
      operatorActions: [
        "Before adding nonessential cookies or SDK storage, implement a purpose-specific consent/preference layer and prevent those technologies from loading before the required choice.",
        "Maintain a current cookie/storage inventory and durations.",
      ],
    },
    {
      id: "accessibility",
      law: "U.S. ADA web accessibility and related accessibility duties",
      scope: "Applicability depends on the operating entity and public-accommodation/public-entity facts; accessibility is also a product-quality requirement.",
      state: "conditional",
      implemented: [
        "Core controls use semantic labels, keyboard-capable component primitives, visible focus states, and text alternatives where implemented.",
      ],
      triggers: [
        "Operating as a covered public accommodation or public entity, and any jurisdiction-specific accessibility requirement.",
      ],
      operatorActions: [
        "Run recurring keyboard, screen-reader, zoom/reflow, contrast, form-error, and WCAG-based testing; screenshot review alone is not sufficient.",
        "Provide an accessible method to request assistance and remediate reported barriers.",
      ],
    },
    {
      id: "advertising",
      law: "FTC advertising, endorsement, and native-ad disclosure rules",
      scope: "Applies when listings or content are paid, sponsored, endorsed, or otherwise commercial in a way that could affect how consumers evaluate them.",
      state: "implemented",
      implemented: [
        "Posting supports a Sponsored / paid promotion designation and sponsored listings receive an explicit visible label.",
        "Undisclosed promotion is a report reason and moderators can mark a listing sponsored.",
      ],
      triggers: [
        "Paid placement, affiliate relationships, endorsements/testimonials, creator promotions, or platform-sold advertising.",
      ],
      operatorActions: [
        "Keep commercial disclosures clear, prominent, proximate, and in the language of the surrounding content.",
        "Before adding ranking boosts or paid recommendation products, disclose the commercial nature and ranking effect clearly.",
      ],
    },
    {
      id: "fair_access_ads",
      law: "U.S. Fair Housing Act and federal equal-employment advertising laws",
      scope: "Applies according to the type of housing/employment advertisement, the poster's legal status, statutory coverage, exemptions, and other applicable federal/state/local law.",
      state: "implemented",
      implemented: [
        "Property and Jobs posting flows show category-specific anti-discrimination disclosures.",
        "Property and Jobs submissions require a versioned fair-access attestation that is stored with the listing payload and revalidated by the server.",
        "Users can report a listing specifically for discriminatory housing or employment content, and moderators can review it through the existing reversible moderation/redress workflow.",
        "The product does not attempt to infer protected characteristics or automatically decide legality from keywords.",
      ],
      triggers: [
        "Housing offered for sale or rental and employment/recruitment advertising.",
        "Expansion into ad targeting, recommendation, or delivery systems that could selectively exclude protected groups.",
        "State or local protected-class and advertising rules that exceed federal baselines.",
      ],
      operatorActions: [
        "Keep the fair-access disclosure and protected-trait guidance synchronized with applicable jurisdictions.",
        "Before adding demographic targeting or optimization for housing/jobs, perform a dedicated discrimination and automated-ad-delivery review.",
      ],
    },
    {
      id: "inform",
      law: "U.S. INFORM Consumers Act",
      scope: "Conditional on marketplace/seller transaction thresholds and covered online-marketplace status.",
      state: "conditional",
      implemented: [
        "Terms disclose that seller-verification requirements will be added if the product enters covered transaction/payment flows.",
        "The product currently does not process buyer purchase payments and does not collect speculative bank/tax identifiers.",
      ],
      triggers: [
        "Covered high-volume third-party seller activity and marketplace/payment facts.",
      ],
      operatorActions: [
        "Before covered payment/transaction features launch, implement seller information collection, verification, certification, required disclosures, suspension, security, and suspicious-activity reporting.",
      ],
    },
    {
      id: "communications",
      law: "CAN-SPAM + TCPA / FCC rules",
      scope: "Applies according to message purpose, technology, consent, and recipient.",
      state: "conditional",
      implemented: [
        "Current email is described as transactional/account messaging.",
        "Account creation and seller phone entry are explicitly not treated as consent to automated marketing calls or texts.",
        "WhatsApp consent is listing-scoped and excludes unrelated marketing.",
      ],
      triggers: [
        "Commercial marketing email.",
        "Platform-originated autodialed/prerecorded marketing calls or robotexts.",
      ],
      operatorActions: [
        "Before marketing email launches, add sender/address/ad identification as applicable and one-click/working unsubscribe processing.",
        "Before automated marketing calls/texts launch, implement separate channel/purpose-specific consent and revocation suppression.",
      ],
    },
    {
      id: "coppa",
      law: "COPPA / child privacy",
      scope: "Current service policy is adults 18+; COPPA risk arises if the service is directed to children under 13 or knowingly collects their data.",
      state: "implemented",
      implemented: [
        "Account creation requires a separate 18+ attestation, stored independently in the legal acceptance evidence.",
        "Terms state accounts are intended for adults and the service is not directed to children under 13.",
      ],
      triggers: [
        "Any future child-directed product, actual-knowledge collection from children, or age-segmented experience.",
      ],
      operatorActions: [
        "Do not introduce child-directed onboarding/content or knowingly retain under-13 account data without a dedicated COPPA design and counsel review.",
      ],
    },
    {
      id: "ftc",
      law: "FTC Act Section 5 privacy/security and consumer protection",
      scope: "U.S. unfair/deceptive-practices enforcement can apply regardless of a comprehensive privacy-law threshold.",
      state: "implemented",
      implemented: [
        "Privacy claims are tied to current product facts (no sale/share/targeted ads, current processors, current contact channels).",
        "RBAC, database access restrictions, deletion/export, and data minimization are encoded in product/backend behavior.",
      ],
      triggers: [
        "Any material change to data use, advertising, security, seller claims, or consumer-facing disclosures.",
      ],
      operatorActions: [
        "Keep disclosures synchronized with actual telemetry, processors, product features, and security controls.",
        "Maintain incident-response and breach-notification procedures appropriate to applicable jurisdictions.",
      ],
    },
    {
      id: "dmca",
      law: "DMCA §512 safe-harbor readiness",
      scope: "Relevant if the operator seeks U.S. safe-harbor protection for qualifying user-hosted content.",
      state: config.dmcaAgentRegistered && config.dmcaAgentDetails ? "implemented" : "operator_action",
      implemented: [
        "Terms prohibit copyright infringement and document the need for notice/takedown and counter-notice handling.",
      ],
      triggers: [
        "Operator chooses to rely on §512 safe harbor for hosted user content.",
      ],
      operatorActions: [
        !config.dmcaAgentRegistered
          ? "Register and maintain the designated DMCA agent with the U.S. Copyright Office before claiming safe-harbor reliance."
          : "DMCA registration is marked configured; verify the registration remains current.",
        !config.dmcaAgentDetails
          ? "Configure and publish the designated agent name, email, and postal address."
          : "DMCA agent contact details are configured.",
        "Implement operational notice, removal, counter-notice, repeat-infringer, and restoration procedures.",
      ],
    },
  ]
}
