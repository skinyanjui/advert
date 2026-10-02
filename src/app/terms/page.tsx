import type { Metadata } from "next"\nimport type { ReactNode } from "react"\nimport Link from "next/link"

import { LEGAL_EFFECTIVE_DATE, PRIVACY_VERSION, PROHIBITED_ITEM_SUMMARY, TERMS_VERSION } from "@/lib/legal"
import { dmcaAgentConfiguration, legalPublicationConfiguration } from "@/lib/legal-config"
import { site, siteSupportMailto } from "@/lib/site"

export const metadata: Metadata = { title: "Terms of use" }

export default function TermsPage() {
  const publication = legalPublicationConfiguration()
  const support = siteSupportMailto()
  const dmca = dmcaAgentConfiguration()

  if (!publication.ready) {
    return (
      <main className="w-full px-3 py-8 md:px-4">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-tight">Terms of use</h1>
          <div role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            The production Terms are not open for acceptance while required operator publication details or approval are incomplete. Public browsing remains available; protected account features fail closed until the reviewed document is published.
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            For help, use the <Link href="/contact#support-request" className="font-medium underline underline-offset-2">public support form</Link>.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="w-full px-3 py-8 md:px-4">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight">Terms of use</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Version {TERMS_VERSION} · Effective {LEGAL_EFFECTIVE_DATE} · Privacy version {PRIVACY_VERSION}
        </p>
        <p className="mt-4 text-sm leading-6 text-neutral-700">
          These Terms govern use of {site.name}, operated by <strong>{publication.name}</strong>, {publication.address}.
        </p>

        <Section title="Account access and eligibility">
          <p>Browsing public listings does not require an account. Saving, messaging, direct seller contact, posting, reporting, profile tools, and administrative functions require the applicable signed-in role and server-side authorization. Account holders must be at least 18 years old and must provide accurate account information.</p>
        </Section>

        <Section title="Marketplace role">
          <p>{site.name} provides classified listings and user-to-user communication. Unless a product flow expressly says otherwise, the platform is not the buyer or seller, does not hold purchase money in escrow, and does not guarantee that a listing is accurate or that a transaction will complete. Users are responsible for evaluating counterparties, goods, services, payment methods, delivery, and applicable taxes or permits.</p>
        </Section>

        <Section title="Listings and prohibited conduct">
          <p>Listings must be accurate, lawful, and not deceptive. Do not publish passwords, payment-card details, government identification numbers, medical information, or other unnecessary sensitive personal information. Do not list or promote prohibited items or services, including:</p>
          <ul className="list-disc space-y-1 pl-5">{PROHIBITED_ITEM_SUMMARY.map((item) => <li key={item}>{item}</li>)}</ul>
          <p>Housing and employment advertisements must comply with applicable anti-discrimination law. Covered property and job listings require the product&apos;s fair-access attestation before publication.</p>
        </Section>

        <Section title="Your content">
          <p>You retain ownership of content you submit. You grant the operator a worldwide, non-exclusive, royalty-free license to host, reproduce, display, distribute, format, moderate, and promote that content as needed to operate the service, including search, previews, caches, abuse review, and listing promotion. You represent that you have the rights needed to submit the content.</p>
        </Section>

        <Section title="Moderation, suspension, and appeals">
          <p>We may reject, hide, remove, or restrict content, and may suspend or end account access, when content or activity violates these Terms, marketplace rules, law, security requirements, or creates material risk to users or the service. Automated thresholds may temporarily restrict a listing before human review. Where the product provides an appeal or redress path, use that path to request review.</p>
        </Section>

        <Section title="Contact channels">
          <p>Marketplace messaging is the default contact method. Sellers may separately enable phone or WhatsApp contact for a listing. A signed-in buyer receives direct seller contact only for the selected listing and subject to access controls and abuse limits. WhatsApp, SMS, and phone calls leave the platform and are governed by the applicable third-party service and law.</p>
        </Section>

        <Section title="Paid and featured placement">
          <p>Paid or sponsored content must be disclosed. When paid featuring is offered, checkout terms shown at purchase govern the price, duration, review, refund, and placement mechanics for that purchase. Featuring changes presentation or ranking only as disclosed and is not an endorsement or a guarantee of impressions, contacts, leads, or sales.</p>
        </Section>

        <Section title="Copyright">
          <p>Do not upload content that infringes copyright. Copyright concerns can be submitted through the public support intake.</p>
          {dmca.registered && dmca.contactComplete ? (
            <p><strong>Designated DMCA agent:</strong> {dmca.name} · {dmca.email} · {dmca.address}{dmca.phone ? <> · {dmca.phone}</> : null}</p>
          ) : (
            <p>The operator does not represent on this page that a U.S. statutory DMCA designated-agent registration is active.</p>
          )}
        </Section>

        <Section title="Disclaimers and liability">
          <p>To the extent permitted by applicable law, the service is provided without guarantees about user content, counterparties, availability, or transaction outcomes. Nothing in these Terms excludes or limits rights or liabilities that applicable law does not permit the parties to exclude or limit.</p>
        </Section>

        <Section title="Changes and acceptance">
          <p>When these Terms or the Privacy Policy materially change, we update the published version and effective date. When renewed acceptance is required, protected account features remain unavailable until the current published versions are accepted. Acceptance records retain the exact Terms version, Privacy version, disclosure version, context, and time.</p>
        </Section>

        <Section title="Governing law and venue">
          <p>Subject to mandatory consumer protections or other non-waivable law, these Terms are governed by <strong>{publication.governingLaw}</strong>, and disputes may be brought in <strong>{publication.venue}</strong>.</p>
        </Section>

        <Section title="Contact">
          <p>
            Use the <Link href="/contact#support-request" className="underline underline-offset-2">public support form</Link>
            {support && site.supportEmail ? <> or email <a href={support} className="underline underline-offset-2">{site.supportEmail}</a></> : null}.
          </p>
        </Section>

        <p className="mt-10 text-sm text-neutral-500">See also the <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.</p>
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8 space-y-3">
      <h2 className="text-base font-medium text-neutral-950">{title}</h2>
      <div className="space-y-3 text-sm leading-6 text-neutral-700">{children}</div>
    </section>
  )
}
