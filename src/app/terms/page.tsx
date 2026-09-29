import type { Metadata } from "next"
import Link from "next/link"

import {
  LEGAL_EFFECTIVE_DATE,
  PRIVACY_VERSION,
  PROHIBITED_ITEM_SUMMARY,
  TERMS_VERSION,
} from "@/lib/legal"
import { SUPPORT_CONTACT_PLACEHOLDER, site, siteSupportMailto } from "@/lib/site"

export const metadata: Metadata = { title: "Terms of use" }

export default function TermsPage() {
  const contactHref = siteSupportMailto()
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 md:px-6">
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
        <h2 className="text-base font-medium text-neutral-950">1. The platform is not a party to sales</h2>
        <p className="text-sm leading-6 text-neutral-700">
          {site.name} helps people list and find goods and services. We are not the buyer or the
          seller. Buyers pay sellers directly. We do not hold purchase money, escrow payments, or
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
          content or behaviour breaks these Terms, our listing rules, or the law, or harms other
          users. We may also act on reports from the community.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">6. Sponsored and paid promotions</h2>
        <p className="text-sm leading-6 text-neutral-700">
          If an ad is sponsored or is a paid promotion, you must tick{" "}
          <strong>Sponsored / paid promotion</strong> when you post or edit it. Do not make fake or
          misleading claims about products, prices, identity, or urgency. Undisclosed paid promotion
          may be reported and moderated.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">7. Contact channels and off-platform conversations</h2>
        <p className="text-sm leading-6 text-neutral-700">
          Sellers control whether a listing offers WhatsApp or phone contact. If a seller enables
          those options, the seller authorizes us to use the provided phone number for that purpose.
          Buyers may also use marketplace messages when available.
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
