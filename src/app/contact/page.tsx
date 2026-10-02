import { ExternalLink, Flag, HelpCircle, LockKeyhole, Mail, MessageCircle, Scale, Shield, ShieldAlert } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"

import { SupportRequestForm } from "@/components/support-request-form"
import { site, siteSupportMailto } from "@/lib/site"

export const metadata: Metadata = {
  title: "Contact us",
  description: "Get help with Africa Classifieds accounts, listings, safety, privacy, security, and legal matters.",
}

const departments = [
  { title: "Account & general help", body: "Signing in, posting, saved ads, account access, or using the marketplace.", icon: HelpCircle },
  { title: "Listings & moderation", body: "An ad you posted, a moderation decision, marketplace rules, or an appeal.", icon: Flag },
  { title: "Safety & abuse", body: "Scams, suspicious activity, harassment, or a marketplace safety concern.", icon: ShieldAlert },
  { title: "Security", body: "Report a security vulnerability or a suspected account-security issue.", icon: Shield },
  { title: "Legal & compliance", body: "Legal notices, regulatory questions, compliance inquiries, or formal business requests.", icon: Scale },
] as const

export default function ContactPage() {
  const support = siteSupportMailto()
  return (
    <main className="w-full px-3 py-6 md:px-4 md:py-8">
      <div className="mx-auto max-w-3xl">
        <header className="max-w-2xl">
          <p className="text-sm font-medium text-muted-foreground">Help</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Contact us</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Public support intake works without an account. Choose a category in the form so the request reaches the right queue.
          </p>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2" aria-label="Support areas">
          {departments.map((department) => {
            const Icon = department.icon
            return (
              <a key={department.title} href="#support-request" className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/20">
                <Icon className="size-5" aria-hidden />
                <div className="mt-4">
                  <h2 className="text-sm font-semibold">{department.title}</h2>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{department.body}</p>
                </div>
                <p className="mt-4 text-sm font-medium">Open support form</p>
              </a>
            )
          })}
          <Link href="/privacy/choices" className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/20">
            <LockKeyhole className="size-5" aria-hidden />
            <div className="mt-4">
              <h2 className="text-sm font-semibold">Privacy</h2>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">Access, deletion, correction, opt-out, and other privacy-rights requests.</p>
            </div>
            <p className="mt-4 text-sm font-medium">Privacy & rights</p>
          </Link>
        </section>

        <div className="mt-6">
          <SupportRequestForm />
        </div>

        {support && site.supportEmail ? (
          <a href={support} className="mt-4 flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm">
            <Mail className="size-4" aria-hidden />
            <span><span className="font-medium">Email support:</span> {site.supportEmail}</span>
          </a>
        ) : null}

        <section className="mt-8 border-t border-border pt-6">
          <h2 className="text-sm font-semibold">Other routes</h2>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <Link href="/" className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted"><MessageCircle className="size-4" aria-hidden />Contact a seller from their listing</Link>
            <Link href="/privacy/choices" className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted"><LockKeyhole className="size-4" aria-hidden />Submit a privacy request</Link>
            <Link href="/terms" className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted"><ExternalLink className="size-4" aria-hidden />Terms and marketplace rules</Link>
            <Link href="/privacy" className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted"><ExternalLink className="size-4" aria-hidden />Privacy policy</Link>
          </div>
        </section>
      </div>
    </main>
  )
}
