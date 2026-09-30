import type { Metadata } from "next"
import Link from "next/link"
import { headers } from "next/headers"

import { site, siteSupportMailto, SUPPORT_CONTACT_PLACEHOLDER } from "@/lib/site"

export const metadata: Metadata = { title: "Privacy choices" }
export const dynamic = "force-dynamic"

export default async function PrivacyChoicesPage() {
  const requestHeaders = await headers()
  const gpc = requestHeaders.get("sec-gpc") === "1"
  const dnt = requestHeaders.get("dnt") === "1"
  const contactHref = siteSupportMailto()

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 md:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Privacy choices</h1>
      <p className="mt-3 text-sm leading-6 text-neutral-700">
        {site.name} does not currently sell personal information or share it for cross-context
        behavioral advertising. We do not run third-party advertising pixels or behavioral-ad
        tracking in the current application.
      </p>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Global Privacy Control</h2>
        <p className="text-sm leading-6 text-neutral-700">
          {gpc
            ? "A Global Privacy Control (GPC) signal was detected on this request. We treat it as an opt-out signal where applicable."
            : "No Global Privacy Control (GPC) signal was detected on this request. If your browser sends one, we treat it as an opt-out signal where applicable."}
        </p>
        <p className="text-sm leading-6 text-neutral-700">
          Because the current service does not sell or share personal information for cross-context
          behavioral advertising, there is no additional sale/share opt-out state to save today.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Do Not Track</h2>
        <p className="text-sm leading-6 text-neutral-700">
          {dnt
            ? "A browser Do Not Track (DNT) signal was detected on this request."
            : "No browser Do Not Track (DNT) signal was detected on this request."}
          {" "}The current application does not use third-party behavioral advertising or track activity across unrelated websites for advertising. Because DNT does not create a separate app preference in the current product, we disclose the signal and current tracking practice here rather than claiming a special DNT mode.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Access, correct, download, or delete</h2>
        <p className="text-sm leading-6 text-neutral-700">
          Signed-in members can correct profile information, download a machine-readable JSON copy
          of account data, and delete their account from{" "}
          <Link href="/account" className="underline underline-offset-2">
            Profile
          </Link>
          .
        </p>
        <p className="text-sm leading-6 text-neutral-700">
          If you cannot access an account or need to make another privacy request, use the Privacy
          request form. Public and authorized-agent requests may require identity or authority
          verification before personal data is disclosed or changed. Do not upload identity
          documents into the request description.
        </p>
      </section>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/privacy/request"
          className="inline-flex h-10 items-center justify-center rounded-full bg-neutral-950 px-4 text-sm font-medium text-white"
        >
          Submit privacy request
        </Link>
        <Link
          href="/account"
          className="inline-flex h-10 items-center justify-center rounded-full border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-950"
        >
          Account privacy controls
        </Link>
      </div>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">California requests</h2>
        <p className="text-sm leading-6 text-neutral-700">
          Where the California Consumer Privacy Act applies, California residents may have rights to
          know, access, delete, and correct personal information; to opt out of sale or sharing; to
          limit certain uses of sensitive personal information; and to receive equal service when
          exercising those rights.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Other U.S. state requests</h2>
        <p className="text-sm leading-6 text-neutral-700">
          Where applicable, residents covered by laws such as Colorado, Oregon, Texas, or Indiana privacy
          laws may have rights to access, correct, delete, obtain a portable copy, and opt out of
          covered sale, targeted advertising, or certain profiling. The request form includes these
          choices and records the jurisdiction for review.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">African privacy requests</h2>
        <p className="text-sm leading-6 text-neutral-700">
          The request form also supports rights requests under privacy laws that may apply in Kenya,
          Nigeria, South Africa, Ghana, and other jurisdictions. Available rights and response rules
          depend on the applicable law and the circumstances of the request.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">EEA requests</h2>
        <p className="text-sm leading-6 text-neutral-700">
          Where the GDPR applies, individuals may have rights to access, rectify, erase, restrict,
          port, or object to processing and to complain to a competent supervisory authority.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Contact</h2>
        <p className="text-sm leading-6 text-neutral-700">
          {contactHref && site.supportEmail ? (
            <a href={contactHref} className="underline underline-offset-2">
              {site.supportEmail}
            </a>
          ) : (
            SUPPORT_CONTACT_PLACEHOLDER
          )}
        </p>
      </section>

      <p className="mt-10 text-sm text-neutral-500">
        Submit a{" "}
        <Link href="/privacy/request" className="underline underline-offset-2">
          privacy request
        </Link>
        {" "}or read the full{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  )
}
