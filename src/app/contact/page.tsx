import { ExternalLink, Flag, HelpCircle, LockKeyhole, Mail, MessageCircle, ShieldAlert } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"

import { site, siteSupportMailto } from "@/lib/site"

export const metadata: Metadata = {
  title: "Contact us",
  description: "Get help with Africa Classifieds accounts, listings, safety, privacy, and legal matters.",
}

const departments = [
  {
    title: "Account & general help",
    body: "Questions about your account, signing in, posting, saved ads, or using the marketplace.",
    icon: HelpCircle,
    subject: "Account or general help",
  },
  {
    title: "Listings & moderation",
    body: "Questions about an ad you posted, moderation decisions, or marketplace rules.",
    icon: Flag,
    subject: "Listing or moderation help",
  },
  {
    title: "Safety & abuse",
    body: "For scams, suspicious activity, harassment, or an urgent marketplace safety concern. For a specific ad, Report on the listing sends the right context.",
    icon: ShieldAlert,
    subject: "Safety or abuse report",
  },
  {
    title: "Privacy",
    body: "Access, deletion, correction, opt-out, or other privacy-rights requests use the dedicated privacy request flow.",
    icon: LockKeyhole,
    href: "/privacy/choices",
    action: "Privacy & rights",
  },
] as const

function mailto(subject: string) {
  if (!site.supportEmail) return undefined
  return `mailto:${site.supportEmail}?subject=${encodeURIComponent(subject)}`
}

export default function ContactPage() {
  const support = siteSupportMailto()
  return (
    <main className="w-full px-3 py-6 md:px-4 md:py-8">
      <div className="mx-auto max-w-3xl">
        <header className="max-w-2xl">
          <p className="text-sm font-medium text-muted-foreground">Help</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Contact us</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Choose what you need help with. We’ll route you to the shortest path instead of making you search for the right department.
          </p>
        </header>

        {support ? (
          <a href={support} className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/20">
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted"><Mail className="size-4" aria-hidden /></span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">Email support</span>
                <span className="block truncate text-sm text-muted-foreground">{site.supportEmail}</span>
              </span>
            </span>
            <span className="text-sm font-medium">Email us</span>
          </a>
        ) : (
          <div className="mt-6 rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-sm font-medium">Support email is being configured</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              You can still use the in-product routes below for listing reports and privacy requests.
            </p>
          </div>
        )}

        <section className="mt-6 grid gap-3 sm:grid-cols-2" aria-label="Contact departments">
          {departments.map((department) => {
            const Icon = department.icon
            const href = "href" in department ? department.href : mailto(department.subject)
            const action = "action" in department ? department.action : "Email this team"
            const content = (
              <>
                <Icon className="size-5" aria-hidden />
                <div className="mt-4">
                  <h2 className="text-sm font-semibold">{department.title}</h2>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{department.body}</p>
                </div>
                <p className="mt-4 text-sm font-medium">{href ? action : "Email support unavailable"}</p>
              </>
            )
            return href ? (
              <Link key={department.title} href={href} className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/20">
                {content}
              </Link>
            ) : (
              <div key={department.title} className="rounded-xl border border-border bg-card p-4">{content}</div>
            )
          })}
        </section>

        <section className="mt-8 border-t border-border pt-6">
          <h2 className="text-sm font-semibold">Fastest routes</h2>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <Link href="/" className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted"><MessageCircle className="size-4" aria-hidden />Contact a seller from their listing</Link>
            <Link href="/privacy/choices" className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted"><LockKeyhole className="size-4" aria-hidden />Submit a privacy request</Link>
            <Link href="/terms" className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted"><ExternalLink className="size-4" aria-hidden />Terms and marketplace rules</Link>
            <Link href="/privacy" className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted"><ExternalLink className="size-4" aria-hidden />Privacy policy</Link>
          </div>
        </section>

        <p className="mt-8 text-xs leading-5 text-muted-foreground">
          Don’t send passwords, government ID numbers, banking information, or medical records by email.
        </p>
      </div>
    </main>
  )
}
