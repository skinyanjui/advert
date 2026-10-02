import type { Metadata } from "next"
import Link from "next/link"

import { PRIVACY_EFFECTIVE_DATE, PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal"
import { legalOperatorIdentity, privacyOfficerContacts } from "@/lib/legal-config"
import { SUPPORT_CONTACT_PLACEHOLDER, site, siteSupportMailto } from "@/lib/site"

export const metadata: Metadata = { title: "Privacy Policy" }

export default function PrivacyPage() {
  const contactHref = siteSupportMailto()
  const operator = legalOperatorIdentity()
  const privacyContacts = privacyOfficerContacts()
  return (
    <div className="w-full px-3 py-8 md:px-4">
      <div
        role="status"
        className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
      >
        Draft — pending legal review
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Version {PRIVACY_VERSION} · Effective {PRIVACY_EFFECTIVE_DATE} · Terms version {TERMS_VERSION}
      </p>
      <p className="mt-4 text-sm leading-6 text-neutral-700">
        This Privacy Policy is a <strong>DRAFT</strong> for {site.name}. It describes how we handle
        personal data in plain language. A lawyer will review it before it applies in production.
      </p>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">What we collect</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-neutral-700">
          <li>Email address and sign-in details</li>
          <li>Profile information (such as display name, city, and country)</li>
          <li>Optional phone number you provide for buyer contact, plus the direct-contact options you deliberately enable. New listings default to marketplace messaging only.</li>
          <li>Listings you post (title, description, photos, location, and related fields)</li>
          <li>Messages you send through the board</li>
          <li>Reports you submit about listings</li>
          <li>Contact-intent events such as listing views and clicks to message, text, call, or open WhatsApp</li>
          <li>WhatsApp consent records, including the listing, named seller, consent text/version, account or session identifier, and time</li>
          <li>WhatsApp Business Platform enforcement metadata received for our business account, such as warnings, restrictions, policy references, and restriction periods</li>
          <li>
            IP address and user agent when we record Terms and Privacy acceptance, so we can show
            when and how you agreed
          </li>
          <li>
            Cookies and local storage on your device for session, drafts, saved items, and similar
            preferences
          </li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Access controls</h2>
        <p className="text-sm leading-6 text-neutral-700">
          Public visitors receive public listing information only. Seller direct-contact details, saved listings, marketplace messages, reports, profile information, account-management data, and administrative information are restricted to authenticated roles with the required permission. We apply these checks on the server as well as in the interface.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Public listing location</h2>
        <p className="text-sm leading-6 text-neutral-700">
          The city, specific pickup description, and any coordinates you attach to a listing are public.
          Use a suitable public pickup point instead of a private home address when appropriate.
          Device location is optional and is requested only when you choose Use location; use it at the
          intended pickup place. You can enter the city and pickup description without sharing a device
          location. Drafts keep the chosen coordinates on this device until the location is changed or
          the draft is cleared. Listing distance is approximate and uses the buyer&apos;s saved city;
          it is not a live location, route, or travel time.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Direct contact, text, and WhatsApp</h2>
        <p className="text-sm leading-6 text-neutral-700">
          New listings default to marketplace messaging without direct phone or WhatsApp contact. Sellers choose whether a listing allows direct phone contact or WhatsApp. When enabled, we may use the phone number they provided to create call, SMS/text, and WhatsApp links. A buyer must be signed in before the service returns or displays seller direct-contact details. Buyers do not need to save the number before using those links.
        </p>
        <p className="text-sm leading-6 text-neutral-700">
          Opening WhatsApp leaves {site.name} and uses WhatsApp&apos;s service. WhatsApp may receive
          information such as the phone numbers involved and technical information under its own
          terms and privacy policy. We do not receive the contents of WhatsApp conversations through
          this click-to-chat feature. Before opening WhatsApp, we ask the buyer to agree to receive WhatsApp replies from the named seller
          about that specific listing. We record that scoped consent and the wording/version shown at the time. The consent does not authorize
          unrelated marketing. We may also record that the WhatsApp button was clicked, but not the WhatsApp conversation or its contents.
          Marketplace messages sent through {site.name} remain separate and are stored by us as described in this policy. If we later use the WhatsApp Business Platform, we may receive account-level policy and restriction notices from Meta through webhooks so we can suspend affected outbound messaging.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Controller and privacy contact</h2>
        <p className="text-sm leading-6 text-neutral-700">
          For data-protection purposes, the operator of {site.name} is the controller of the personal
          data described in this policy.{" "}
          {operator.complete ? (
            <strong>{operator.name} · {operator.address}</strong>
          ) : (
            <strong>[OPERATOR LEGAL NAME AND BUSINESS ADDRESS — configure before final legal approval]</strong>
          )}
          . The support contact below is also the privacy contact.
          {privacyContacts.dpoEmail ? <> Data protection contact: <strong>{privacyContacts.dpoEmail}</strong>.</> : null}
          {privacyContacts.euRepresentative ? <> EU representative: <strong>{privacyContacts.euRepresentative}</strong>.</> : null}
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Why we use data and GDPR legal bases</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-neutral-700">
          <li><strong>Contract:</strong> to create and secure accounts, publish and manage listings, save listings, provide Messenger, and deliver requested account features.</li>
          <li><strong>Legitimate interests:</strong> to prevent fraud and abuse, moderate listings, secure the service, diagnose failures, and use minimal first-party contact-intent analytics. We balance those interests against user rights.</li>
          <li><strong>Consent:</strong> where we ask for a specific optional permission, such as scoped WhatsApp contact consent. Consent can be withdrawn for future processing where applicable.</li>
          <li><strong>Legal obligation and legal claims:</strong> to keep or disclose records when law requires it and to establish, exercise, or defend legal claims.</li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">California notice at collection</h2>
        <p className="text-sm leading-6 text-neutral-700">
          Depending on how you use the service, we collect identifiers and account information;
          profile and contact information; listing and commercial activity; messages and other
          user-provided content; device/session and acceptance records; coarse or listing location
          information; moderation and report information; and first-party interaction events.
          Sources include you, your browser/device, other users when they communicate or report
          activity, and service providers that return operational or policy events.
        </p>
        <p className="text-sm leading-6 text-neutral-700">
          We use these categories to provide the marketplace, authenticate users, enable user-to-user
          communications, moderate and secure the service, troubleshoot, maintain legal records, and
          provide support. We disclose information to service providers such as Supabase, Vercel, and
          Resend as needed to perform those functions, and to services such as WhatsApp when a user
          chooses an off-platform contact action.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">California online tracking / Do Not Track</h2>
        <p className="text-sm leading-6 text-neutral-700">
          The current application does not use third-party behavioral advertising pixels or collect
          personal information about your activity over time across unrelated websites for targeted
          advertising. Browser Do Not Track (DNT) signals do not create a separate app preference
          because the current product does not perform that cross-site behavioral advertising
          activity. We separately recognize Global Privacy Control where applicable. Third parties
          may receive information when needed to provide the service or when you intentionally open
          an off-platform service such as WhatsApp.
        </p>
      </section>

      <section id="sale-share" className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Sale, sharing, targeted advertising, and GPC</h2>
        <p className="text-sm leading-6 text-neutral-700">
          The current application does not sell personal information and does not share personal
          information for cross-context behavioral advertising. It does not use automated decisionmaking technology to make significant decisions about consumers. It does not currently run third-party
          advertising pixels or behavioral-ad tracking. If those practices change, we will update this
          notice and provide required choices before relying on the new practice.
        </p>
        <p className="text-sm leading-6 text-neutral-700">
          We recognize a browser Global Privacy Control signal as an opt-out signal where applicable.
          See{" "}
          <Link href="/privacy/choices" className="underline underline-offset-2">
            Privacy choices
          </Link>
          {" "}for the current status and account privacy controls.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Your GDPR rights</h2>
        <p className="text-sm leading-6 text-neutral-700">
          Where the GDPR applies, you may have rights to be informed, access your personal data,
          correct inaccurate data, request erasure, restrict processing, receive portable data, and
          object to certain processing. You may also complain to the competent data-protection
          supervisory authority. Where processing is based on consent, you may withdraw that consent
          for future processing without affecting earlier lawful processing.
        </p>
        <p className="text-sm leading-6 text-neutral-700">
          Signed-in members can correct profile information, download a JSON copy of account data,
          and delete their account from Profile. Other requests can be sent to the privacy contact.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">California privacy rights</h2>
        <p className="text-sm leading-6 text-neutral-700">
          Where the CCPA, as amended by the CPRA and applicable regulations effective January 1, 2026, applies to us, California residents may have rights
          to know/access, delete, and correct personal information; opt out of sale or sharing; limit
          certain uses or disclosures of sensitive personal information; and receive non-discriminatory
          service for exercising those rights. We currently do not sell or share personal information
          for cross-context behavioral advertising.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Children and age</h2>
        <p className="text-sm leading-6 text-neutral-700">
          Accounts are intended for people age 18 or older. The service is not directed to children.
        </p>
        <p className="text-sm leading-6 text-neutral-700">
          The service is intended for adults. We do not knowingly seek personal information from children under 13. If we
          learn that an account was created in violation of this age rule, we may suspend or delete it
          and remove associated personal data as appropriate.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Email and text communications</h2>
        <p className="text-sm leading-6 text-neutral-700">
          Current platform email is intended for account, security, and other transactional purposes.
          If we add marketing email, it must include the disclosures and opt-out mechanisms required
          by applicable law. Creating an account, providing a phone number, or enabling seller contact
          does not by itself consent to automated marketing calls or texts. Any platform-originated
          marketing calls or robotexts that require consent will use a separate consent flow.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">International transfers</h2>
        <p className="text-sm leading-6 text-neutral-700">
          Service providers may process data in countries other than the country where you live. Where
          GDPR transfer rules apply, we will rely on an available lawful transfer mechanism and
          appropriate safeguards, such as an adequacy decision or contractual safeguards, as applicable.
          This draft does not claim participation in any certification program unless separately verified.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Security and data minimization</h2>
        <p className="text-sm leading-6 text-neutral-700">
          We use role-based access controls, server-side authorization, restricted database access,
          and data minimization measures designed to protect account information. Listing forms default optional direct-contact sharing off, require only category-relevant fields, and instruct sellers not to publish payment-card details, government identifiers, medical information, or other unnecessary sensitive personal data. No system can be
          guaranteed completely secure. We review what data the service collects and avoid collecting
          sensitive identifiers such as government IDs, tax IDs, or bank details unless a future legal
          or product requirement makes them necessary.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Other U.S. state privacy laws</h2>
        <p className="text-sm leading-6 text-neutral-700">
          Where laws such as the Colorado Privacy Act, Oregon Consumer Privacy Act, or Texas Data
          Privacy and Security Act apply to us, covered residents may have rights that include access,
          correction, deletion, a portable copy, and opt-outs from covered sale, targeted advertising,
          or certain profiling. Some states also require recognition of universal opt-out signals.
          Applicability depends on each law&apos;s thresholds, exemptions, residents, and processing activity.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">African privacy rights</h2>
        <p className="text-sm leading-6 text-neutral-700">
          Where applicable, privacy laws including Kenya&apos;s Data Protection Act, Nigeria&apos;s Data
          Protection Act, South Africa&apos;s POPIA, and Ghana&apos;s Data Protection Act provide rights
          that can include being informed, access, correction or rectification, deletion or erasure,
          objection or restriction, and in some jurisdictions portability or protections concerning
          automated decisions. Local registration, officer, transfer, breach, and response requirements
          depend on the operator&apos;s activities and each country&apos;s rules.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">How to exercise privacy rights</h2>
        <p className="text-sm leading-6 text-neutral-700">
          Use the{" "}
          <Link href="/privacy/request" className="underline underline-offset-2">
            Privacy request form
          </Link>
          {" "}for access, portability, correction, deletion, restriction, objection, consent withdrawal,
          opt-out, sensitive-data limitation, or an appeal. Signed-in requests for the account holder
          can be treated as account-verified; other requests may require a separate identity or
          authorized-agent verification step before personal data is disclosed or changed.
        </p>
        <p className="text-sm leading-6 text-neutral-700">
          Do not submit passwords, government identification numbers, bank information, medical
          records, or identity-document images in the request form. If additional verification is
          necessary, we will use a separate process appropriate to the request.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Moderation and automated processing</h2>
        <p className="text-sm leading-6 text-neutral-700">
          We use listing rules, rate limits, report counts, and moderator review to protect the
          marketplace. Multiple distinct pending reports can temporarily hide a listing until a
          moderator reviews the reports; dismissing reports can restore it. We record moderation
          actions needed to operate and secure the service.
        </p>
        <p className="text-sm leading-6 text-neutral-700">
          The current application does not use personal data for solely automated decisions that
          determine access to credit, employment, housing, insurance, education, or another
          similarly significant service. Before adding significant-decision automated processing or
          profiling, we will reassess applicable notice, assessment, explanation, access, and
          opt-out/appeal requirements.
        </p>
        <p className="text-sm leading-6 text-neutral-700">
          The 2026 California regulations add requirements for covered risk assessments and cybersecurity audits and, beginning January 1, 2027, requirements for covered uses of automated decisionmaking technology. Those duties depend on the business and processing triggers; we will reassess them before enabling significant-decision ADMT or other covered high-risk processing.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Security incidents and breach response</h2>
        <p className="text-sm leading-6 text-neutral-700">
          We maintain an internal incident register for suspected security or personal-data incidents.
          When an incident occurs, we record discovery and containment timing, affected data and
          jurisdictions, estimated scope, notification assessments, and actions taken. Where an
          applicable law requires notification to a regulator, affected individuals, or another
          party, we will use the applicable legal standard and deadline rather than a single global
          deadline.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Featured placements and payment</h2>
        <p className="text-sm leading-6 text-neutral-700">
          When you buy featured placement, Stripe hosts checkout and processes card details;
          we do not store your card number. We keep the listing/account association, price,
          payment and refund references, accepted placement terms, admin decision and promotion
          dates to provide the placement, handle refunds and resolve disputes. Payment and
          decision records may remain after listing or account deletion as reasonably needed
          for refunds, disputes and financial-record obligations.
        </p>
        <p className="text-sm leading-6 text-neutral-700">
          First-party featured-card statistics count visible impressions and clicks, excluding
          seller activity. We deduplicate each event per board session/account per day using a
          daily keyed hash; we do not collect card details, message contents, or raw account IDs
          in these analytics records. Events are retained for up to 90 days and then removed
          by the scheduled cleanup. These are approximate aggregate measurements, not
          cross-site behavioral advertising or third-party advertising pixels.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Processors</h2>
        <p className="text-sm leading-6 text-neutral-700">
          We use <strong>Supabase</strong> (database, auth, and storage) and <strong>Vercel</strong>{" "}
          (hosting and edge delivery) as processors to run the service. When email sending is
          enabled, we also use <strong>Resend</strong> to deliver transactional email. They process
          data on our instructions to provide those functions. Stripe processes payments when paid featuring is used; its privacy notice also applies to checkout.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Retention</h2>
        <p className="text-sm leading-6 text-neutral-700">
          We keep account, listing, message, report, contact-intent, WhatsApp consent, and business-platform enforcement records only for as long as reasonably needed for the purposes described above, account operation, safety, disputes, security, or legal obligations. Account deletion removes account-linked listings, saves, conversations, submitted reports, authenticated contact-intent events, and WhatsApp consent records from the active application data, subject to narrow legal or safety exceptions. Terms and Privacy acceptance records are linked to the authentication account and are deleted with it. Privacy-request case records may be retained after account deletion only as reasonably needed to document request handling, satisfy legal obligations, or resolve disputes, then deleted or de-identified. Backup and service-provider copies may persist for a limited period under provider retention processes.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Deletion</h2>
        <p className="text-sm leading-6 text-neutral-700">
          You can delete your account from{" "}
          <Link href="/account" className="underline underline-offset-2">
            Profile
          </Link>
          . That removes or de-identifies personal data we hold for the account, subject to records
          we must keep for legal or safety reasons (for example, recent moderation logs).
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Contact</h2>
        <p className="text-sm leading-6 text-neutral-700">
          {contactHref && site.supportEmail ? (
            <>
              Privacy questions:{" "}
              <a href={contactHref} className="underline underline-offset-2">
                {site.supportEmail}
              </a>
              .
            </>
          ) : (
            SUPPORT_CONTACT_PLACEHOLDER
          )}
        </p>
      </section>

      <p className="mt-10 text-sm text-neutral-500">
        See also our{" "}
        <Link href="/terms" className="underline underline-offset-2">
          Terms of use
        </Link>
        .
      </p>
    </div>
  )
}
