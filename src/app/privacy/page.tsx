import type { Metadata } from "next"
import Link from "next/link"

import { LEGAL_EFFECTIVE_DATE, PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal"
import { site, siteSupportMailto } from "@/lib/site"

export const metadata: Metadata = { title: "Privacy Policy" }

export default function PrivacyPage() {
  const contact = site.supportEmail ?? "samuel.kinyanjui.sk@gmail.com"
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 md:px-6">
      <div
        role="status"
        className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
      >
        Draft — pending legal review
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Version {PRIVACY_VERSION} · Effective {LEGAL_EFFECTIVE_DATE} · Terms version {TERMS_VERSION}
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
          <li>Phone number you provide for buyers to reach you</li>
          <li>Listings you post (title, description, photos, location, and related fields)</li>
          <li>Messages you send through the board</li>
          <li>Reports you submit about listings</li>
          <li>
            IP address and user agent when we record Terms and Privacy acceptance, so we can show
            when and how you agreed
          </li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Processors</h2>
        <p className="text-sm leading-6 text-neutral-700">
          We use <strong>Supabase</strong> (database, auth, and storage) and <strong>Vercel</strong>{" "}
          (hosting and edge delivery) as processors to run the service. They process data on our
          instructions to provide those functions.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Retention</h2>
        <p className="text-sm leading-6 text-neutral-700">
          We keep account, listing, message, report, and acceptance records while your account is
          active and for a reasonable period afterward for safety, dispute, and legal reasons, then
          delete or anonymise them when they are no longer needed.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Deletion</h2>
        <p className="text-sm leading-6 text-neutral-700">
          You can delete your account from <Link href="/account" className="underline underline-offset-2">Profile</Link>
          . That removes or de-identifies personal data we hold for the account, subject to records
          we must keep for legal or safety reasons (for example, recent moderation logs).
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Contact</h2>
        <p className="text-sm leading-6 text-neutral-700">
          Privacy questions:{" "}
          <a href={siteSupportMailto()} className="underline underline-offset-2">
            {contact}
          </a>
          .
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
