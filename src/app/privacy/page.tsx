import type { Metadata } from "next"
import Link from "next/link"

import { LEGAL_EFFECTIVE_DATE, PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal"
import { SUPPORT_CONTACT_PLACEHOLDER, site, siteSupportMailto } from "@/lib/site"

export const metadata: Metadata = { title: "Privacy Policy" }

export default function PrivacyPage() {
  const contactHref = siteSupportMailto()
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
          <li>Phone number you provide for buyer contact, plus the direct-contact options you enable</li>
          <li>Listings you post (title, description, photos, location, and related fields)</li>
          <li>Messages you send through the board</li>
          <li>Reports you submit about listings</li>
          <li>Contact-intent events such as listing views and clicks to message, call, or open WhatsApp</li>
          <li>WhatsApp consent records, including the listing, named seller, consent text/version, account or session identifier, and time</li>
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
        <h2 className="text-base font-medium text-neutral-950">Direct contact and WhatsApp</h2>
        <p className="text-sm leading-6 text-neutral-700">
          Sellers choose whether a listing allows WhatsApp and phone calls. If a seller enables a
          direct contact option, we use the phone number they provided to create that contact link.
          Buyers do not need to save the number before opening WhatsApp.
        </p>
        <p className="text-sm leading-6 text-neutral-700">
          Opening WhatsApp leaves {site.name} and uses WhatsApp&apos;s service. WhatsApp may receive
          information such as the phone numbers involved and technical information under its own
          terms and privacy policy. We do not receive the contents of WhatsApp conversations through
          this click-to-chat feature. Before opening WhatsApp, we ask the buyer to agree to receive WhatsApp replies from the named seller
          about that specific listing. We record that scoped consent and the wording/version shown at the time. The consent does not authorize
          unrelated marketing. We may also record that the WhatsApp button was clicked, but not the WhatsApp conversation or its contents.
          Marketplace messages sent through {site.name} remain separate and are stored by us as described in this policy.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Processors</h2>
        <p className="text-sm leading-6 text-neutral-700">
          We use <strong>Supabase</strong> (database, auth, and storage) and <strong>Vercel</strong>{" "}
          (hosting and edge delivery) as processors to run the service. When email sending is
          enabled, we also use <strong>Resend</strong> to deliver transactional email. They process
          data on our instructions to provide those functions.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-medium text-neutral-950">Retention</h2>
        <p className="text-sm leading-6 text-neutral-700">
          We keep account, listing, message, report, contact-intent, and WhatsApp consent records while your account is active and for
          a reasonable period afterward for safety, dispute, and legal reasons, then delete or
          anonymise them when they are no longer needed. Terms and Privacy acceptance records are
          deleted with your account.
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
