import type { Metadata } from "next"
import { AlertTriangle, BadgeHelp, Bookmark, KeyRound, ListChecks, LockKeyhole, MessageCircle, Search, ShieldAlert, Tag, UserRound } from "lucide-react"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Help",
  description: "Practical help for buying, selling, listings, messages, account access, safety, and privacy.",
}

const topics = [
  { title: "Buy safely", body: "Check the listing carefully, ask specific questions, inspect items before paying, and be cautious when someone pressures you to move off-platform.", icon: Search, href: "/help#buying" },
  { title: "Sell & manage ads", body: "Post accurate details, use your saved country as the posting default, respond to buyers, edit your ad, and manage ads that need attention.", icon: Tag, href: "/my-ads" },
  { title: "Messages", body: "Keep marketplace conversations attached to the listing. Use Messenger to ask questions and keep useful context together.", icon: MessageCircle, href: "/messages" },
  { title: "Account access", body: "Sign in, update your profile and contact details, or review account preferences.", icon: UserRound, href: "/account" },
  { title: "Safety & scams", body: "Recognize suspicious payment requests, phishing, impersonation, unsafe meetups, and attempts to collect sensitive information.", icon: ShieldAlert, href: "/help#safety" },
  { title: "Privacy & data", body: "Understand your privacy choices and submit access, correction, deletion, or other applicable rights requests.", icon: LockKeyhole, href: "/privacy/choices" },
] as const

const sellerSteps = [
  "A new ad uses the country saved during onboarding or in Settings. A location-specific Post link can override it for that ad, while drafts and edits keep their saved location.",
  "Use clear photos and describe faults or important conditions accurately.",
  "Keep unnecessary personal information out of the listing. Never post passwords, payment-card details, government IDs, or medical information.",
  "Marketplace messaging works without sharing a phone number. Enable phone or WhatsApp only when you want those contact methods.",
  "If an ad is sold, mark it sold so buyers do not keep contacting you.",
]

const buyerSteps = [
  "Read the full listing and ask specific questions before agreeing to buy.",
  "For local transactions, inspect the item and confirm important documents or ownership before paying.",
  "Treat urgent payment demands, unexpected payment links, verification-code requests, and requests for banking credentials as warning signs.",
  "Use marketplace Messenger when possible so the conversation stays connected to the listing.",
]

export default function HelpPage() {
  return (
    <main className="w-full px-3 py-6 md:px-4 md:py-8">
      <div className="mx-auto max-w-4xl">
        <header className="max-w-2xl">
          <p className="text-sm font-medium text-muted-foreground">Support</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">How can we help?</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Start with the problem you are trying to solve. These routes cover the marketplace actions we support today.
          </p>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Help topics">
          {topics.map(({ title, body, icon: Icon, href }) => (
            <Link key={title} href={href} className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/20">
              <Icon className="size-5" aria-hidden />
              <h2 className="mt-4 text-sm font-semibold">{title}</h2>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">{body}</p>
            </Link>
          ))}
        </section>

        <section id="safety" className="mt-8 rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
            <div>
              <h2 className="text-base font-semibold">Something feels wrong</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Stop the transaction if someone asks for passwords, verification codes, banking credentials, payment-card details, or an unexpected payment or verification fee. Do not follow suspicious links. For a suspicious listing, use Report on that listing so the report includes the right context. If there is immediate danger, contact local emergency services first.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section id="buying">
            <div className="flex items-center gap-2"><BadgeHelp className="size-4" aria-hidden /><h2 className="text-base font-semibold">Buying</h2></div>
            <ol className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
              {buyerSteps.map((step, index) => <li key={step} className="flex gap-3"><span className="font-medium text-foreground">{index + 1}.</span><span>{step}</span></li>)}
            </ol>
          </section>
          <section>
            <div className="flex items-center gap-2"><ListChecks className="size-4" aria-hidden /><h2 className="text-base font-semibold">Selling</h2></div>
            <ol className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
              {sellerSteps.map((step, index) => <li key={step} className="flex gap-3"><span className="font-medium text-foreground">{index + 1}.</span><span>{step}</span></li>)}
            </ol>
          </section>
        </div>

        <section className="mt-8 border-t border-border pt-6">
          <h2 className="text-base font-semibold">Fix it directly</h2>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <Link href="/post" className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted"><Tag className="size-4" aria-hidden />Post an ad</Link>
            <Link href="/my-ads" className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted"><ListChecks className="size-4" aria-hidden />Manage my ads</Link>
            <Link href="/messages" className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted"><MessageCircle className="size-4" aria-hidden />Open Messenger</Link>
            <Link href="/saved" className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted"><Bookmark className="size-4" aria-hidden />Saved ads</Link>
            <Link href="/sign-in" className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted"><KeyRound className="size-4" aria-hidden />Sign in</Link>
            <Link href="/account/moderation" className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted"><ShieldAlert className="size-4" aria-hidden />Moderation decisions & appeals</Link>
          </div>
        </section>

        <section className="mt-8 rounded-xl bg-muted/40 p-4">
          <h2 className="text-sm font-semibold">Still need help?</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Contact the team for account, listing, safety, security, privacy, or legal support. The contact page routes each issue to the appropriate path.</p>
          <Link href="/contact" className="mt-3 inline-flex text-sm font-medium underline underline-offset-4">Contact us</Link>
        </section>
      </div>
    </main>
  )
}
