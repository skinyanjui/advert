import type { Metadata } from "next"
import Link from "next/link"
import { headers } from "next/headers"

import { site, siteSupportMailto, SUPPORT_CONTACT_PLACEHOLDER } from "@/lib/site"

export const metadata: Metadata = { title: "Privacy choices" }
export const dynamic = "force-dynamic"

export default async function PrivacyChoicesPage() {
  const requestHeaders = await headers()
  const gpc = requestHeaders.get("sec-gpc") === "1"
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
          If you cannot access an account or need to make another privacy request, contact us. We may
          need to verify your identity before disclosing or changing account data.
        </p>
      </section>

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
        Read the full{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  )
}
