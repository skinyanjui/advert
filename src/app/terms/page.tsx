import type { Metadata } from "next"
import Link from "next/link"

import {
  LEGAL_EFFECTIVE_DATE,
  PRIVACY_VERSION,
  PROHIBITED_ITEM_SUMMARY,
  TERMS_VERSION,
} from "@/lib/legal"
import { dmcaAgentConfiguration, legalOperatorIdentity } from "@/lib/legal-config"
import { SUPPORT_CONTACT_PLACEHOLDER, site, siteSupportMailto } from "@/lib/site"

export const metadata: Metadata = { title: "Terms of use" }

export default function TermsPage() {
  const contactHref = siteSupportMailto()
  const operator = legalOperatorIdentity()
  const dmca = dmcaAgentConfiguration()
  return (
    <div className="w-full px-3 py-8 md:px-4">
      <div
        role="status"
        className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
      >
        Draft — pending legal review
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Terms of use</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Version {TERMS_VERSION} · Effective {LEGAL_EFFECTIVE_DATE} · Privacy version {PRIVACY_VERSION}
      </p>
      <p className="mt-4 text-sm leading-6 text-neutral-700">
        These Terms are a <strong>DRAFT</strong> for {site.name}. They are not final legal advice. A
        lawyer will review them before they apply in production.
      </p>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Account access and permissions</h2>
        <p className="text-sm leading-6 text-neutral-700">
          Browsing public listings does not require an account. Features that expose account data or enable transactions between users require sign-in, including saving listings, marketplace messaging, direct seller contact details, posting or managing ads, submitting reports, profile and account tools, and moderation functions.
        </p>
        <p className="text-sm leading-6 text-neutral-700">
          Access is role-based. Signed-out visitors receive public listing information only. Signed-in members receive member features and may access only their own private account resources. Administrative functions require an authorized administrator role. We may deny or revoke access when authorization checks fail.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Age eligibility</h2>
        <p className="text-sm leading-6 text-neutral-700">
          You must be at least 18 years old to create or use an account. The service is not directed
          to children under 13. This age boundary is also intended to avoid knowingly collecting
          children&apos;s personal information in circumstances covered by the Children&apos;s Online Privacy
          Protection Act (COPPA). If we learn that an account was created in violation of this rule,
          we may suspend or delete it and remove associated personal data as appropriate.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">U.S. marketplace transparency</h2>
        <p className="text-sm leading-6 text-neutral-700">
          The current service is a classifieds marketplace and does not process buyer payments.
          If future payment or transaction features bring the service or a seller within the scope of
          the federal INFORM Consumers Act, we may be required to collect and verify specified
          high-volume seller information, require periodic certification, disclose specified seller
          information, suspend sellers who do not provide required information, and maintain a
          mechanism for reporting suspicious marketplace activity. We will not collect bank or tax
          identifiers merely for future readiness before they are actually required.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Commercial email and automated calls or texts</h2>
        <p className="text-sm leading-6 text-neutral-700">
          Account and security communications are treated as transactional. If we send commercial
          marketing email, we will follow applicable CAN-SPAM Act requirements, including required
          sender information and a working opt-out process. Creating an account or providing a phone
          number does not authorize automated marketing calls
          or robotexts. Separate consent will be used where the Telephone Consumer Protection Act or
          other applicable law requires it.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Consumer protection and data security</h2>
        <p className="text-sm leading-6 text-neutral-700">
          Do not use the service for deceptive, unfair, fraudulent, or misleading conduct. We aim to
          keep our privacy and security statements accurate and to use reasonable safeguards and
          data-minimization practices consistent with applicable consumer-protection law, including
          Section 5 of the Federal Trade Commission Act where it applies.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Copyright and DMCA notices</h2>
        <p className="text-sm leading-6 text-neutral-700">
          Do not upload content that infringes another person&apos;s copyright. If the operator intends
          to rely on the U.S. Digital Millennium Copyright Act section 512 safe harbor for hosted user
          content, it must register and maintain a designated DMCA agent with the U.S. Copyright
          Office, publish the agent&apos;s required contact information, and operate a compliant
          notice-and-takedown and counter-notice process.{" "}
          {dmca.registered && dmca.contactComplete ? (
            <strong>
              Designated agent: {dmca.name} · {dmca.email} · {dmca.address}
              {dmca.phone ? <> · {dmca.phone}</> : null}
            </strong>
          ) : (
            <strong>[DMCA AGENT DETAILS — register and configure before relying on the safe harbor]</strong>
          )}
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">1. The platform is not a party to sales</h2>
        <p className="text-sm leading-6 text-neutral-700">
          {site.name} helps people list and find goods and services. We are not the buyer or the
          seller. Buyers pay sellers directly. We do not hold purchase money, escrow payments, or collect payment-card details for listing transactions.
          guarantee that a sale will complete.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">2. Liability limit</h2>
        <p className="text-sm leading-6 text-neutral-700">
          To the fullest extent allowed by law, {site.name} is not liable for disputes between
          buyers and sellers, failed payments, loss of goods, or reliance on listing content. Where
          liability cannot be excluded, it is limited to the greater of (a) fees you paid us for the
          service in the three months before the claim, or (b){" "}
          <strong>[LAWYER TO CONFIRM]</strong> USD 50. Nothing in this draft removes rights your local
          consumer law may give you that cannot be waived.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">3. Prohibited items</h2>
        <p className="text-sm leading-6 text-neutral-700">
          Do not list or promote prohibited items or services. Our automated checks and moderation
          look for content consistent with these categories (see also our listing rules):
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-neutral-700">
          {PROHIBITED_ITEM_SUMMARY.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="text-sm leading-6 text-neutral-700">
          Illegal items under the laws that apply to you are also banned, even if not named here.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Housing and job advertisements</h2>
        <p className="text-sm leading-6 text-neutral-700">
          Housing and employment listings must follow applicable anti-discrimination law. Do not
          publish a housing ad that states an unlawful preference, limitation, or discrimination
          based on a protected characteristic. Do not publish a job ad that unlawfully prefers,
          excludes, or discourages applicants based on a protected characteristic. Local law may
          protect additional characteristics or impose additional advertising rules.
        </p>
        <p className="text-sm leading-6 text-neutral-700">
          Covered residential Property and Jobs listings require a fair-access attestation before
          publication. Users can report discriminatory listings for moderator review. The
          attestation does not replace the poster&apos;s responsibility to determine and follow the
          laws that apply to the listing.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">4. Your content licence</h2>
        <p className="text-sm leading-6 text-neutral-700">
          You keep ownership of the text, photos, and other content you post. You give {site.name} a
          worldwide, non-exclusive, royalty-free licence to host, display, reproduce, and distribute
          that content so we can operate, moderate, and promote the board (including caches,
          previews, and search). You confirm you have the rights needed to grant this licence.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">5. Removal and suspension</h2>
        <p className="text-sm leading-6 text-neutral-700">
          We may hide, remove, or refuse listings, and suspend or end accounts, when we believe
          Do not publish passwords, payment-card details, government identification numbers, medical information, or other unnecessary sensitive personal information in a listing. We may reject or remove content that exposes such information. Where content or behaviour breaks these Terms, our listing rules, or the law, or harms other
          users. We may also act on reports from the community. Multiple distinct pending reports
          can automatically hide a listing temporarily before moderator review. A moderator can
          dismiss reports and restore the listing, or take further action. This report-threshold
          automation is a marketplace safety/moderation tool; the current service does not use it
          to make credit, employment, housing, insurance, education, or other similarly significant
          eligibility decisions about a person.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">6. Sponsored and paid promotions</h2>
        <p className="text-sm leading-6 text-neutral-700">
          If an ad is sponsored or is a paid promotion, you must tick{" "}
          <strong>Sponsored / paid promotion</strong> when you post or edit it. Do not make fake or
          misleading claims about products, prices, identity, or urgency. Undisclosed paid promotion
          may be reported and moderated. Buying a featured placement from us is disclosed
          automatically and does not replace your obligation to disclose outside sponsorship.
        </p>
        <p className="text-sm leading-6 text-neutral-700">
          Featured placement costs USD 10 for seven days, paid through Stripe. Payment submits
          the ad for admin review; it does not guarantee approval. The seven-day period starts
          when approved. Rejected requests, or paid promotions removed by an admin, receive a
          full refund to the original payment method; bank processing time varies. Featured ads
          receive priority only among matching browse/search results under the default relevance
          sort. Price and newest sorts are unchanged. Paid placements are marked “Ad · Featured”;
          complimentary grants are marked “Featured”. Featuring is not an endorsement and does
          not guarantee a particular position, impressions, clicks, leads or sales. Pausing,
          selling, hiding or expiring an ad stops priority while the promotion clock continues.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">7. Contact channels and off-platform conversations</h2>
        <p className="text-sm leading-6 text-neutral-700">
          Marketplace messaging is the default contact method for new listings. Sellers control whether a listing additionally offers direct phone or WhatsApp contact. When enabled, the provided phone number may be used for calls, SMS/text messages, and WhatsApp where available. Buyers may also use the marketplace Messenger when available.
        </p>
        <p className="text-sm leading-6 text-neutral-700">
          Before opening WhatsApp, a buyer must explicitly agree to receive WhatsApp replies from the named seller
          about that specific listing. That consent is scoped to the listing and does not authorize unrelated marketing.
          Sellers using WhatsApp for business communications remain responsible for following WhatsApp&apos;s policies,
          applicable law, opt-out requests, and any additional consent requirements for future or different categories of messages.
        </p>
        <p className="text-sm leading-6 text-neutral-700">
          If {site.name} enables the WhatsApp Business Platform, platform-originated messages are also subject to
          WhatsApp account quality, policy enforcement, messaging restrictions, and account suspension or disablement.
          We may automatically stop affected message categories, or all platform messaging, when a restriction is reported.
          Appeals and policy reviews remain Meta&apos;s process; an internal status shown by {site.name} does not override a Meta restriction.
        </p>
        <p className="text-sm leading-6 text-neutral-700">
          WhatsApp and phone conversations take place outside {site.name}. We cannot review or
          recover those conversations through the marketplace, so users should keep records needed
          for safety, payment, delivery, or dispute purposes. Third-party services have their own
          terms and privacy practices.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">8. Disputes</h2>
        <p className="text-sm leading-6 text-neutral-700">
          If you have a problem with another user or with the service, contact support first. If we
          cannot resolve it, the next step is{" "}
          <strong>[LAWYER TO CONFIRM]</strong> mediation before court proceedings, unless your local
          consumer law says otherwise. This draft does <strong>not</strong> include an arbitration
          clause or a class-action waiver — a lawyer will decide those points.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">9. Consumer law</h2>
        <p className="text-sm leading-6 text-neutral-700">
          You keep any rights your local consumer law gives you that cannot be limited or waived by
          contract. If a term conflicts with those rights, those rights prevail.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">10. Governing law</h2>
        <p className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-3 py-2 text-sm leading-6 text-neutral-700">
          <strong>[PLACEHOLDER — lawyer to decide]</strong> Governing law and venue are not set in
          this draft. Do not treat any country as the default governing law until counsel fills this
          in.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">11. Severability</h2>
        <p className="text-sm leading-6 text-neutral-700">
          If a court finds part of these Terms unenforceable, the rest still applies.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">12. Changes</h2>
        <p className="text-sm leading-6 text-neutral-700">
          When we change these Terms or the Privacy Policy, we update the version shown on this page
          and, when acceptance is required, present it at account creation or the next account-access boundary before protected features become available. We may also
          notify you by email or an in-product notice. Continued use after you accept means you agree
          to the updated versions.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Operator identity</h2>
        <p className="text-sm leading-6 text-neutral-700">
          {operator.complete ? (
            <>{operator.name} · {operator.address}</>
          ) : (
            <strong>[OPERATOR LEGAL NAME AND BUSINESS ADDRESS — configure before final legal approval]</strong>
          )}
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">13. Contact</h2>
        <p className="text-sm leading-6 text-neutral-700">
          {contactHref && site.supportEmail ? (
            <>
              Support:{" "}
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
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  )
}
