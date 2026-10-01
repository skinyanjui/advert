"use client"

import Link from "next/link"
import { usePrefs } from "@/components/prefs-provider"
import { helpCopy } from "@/lib/help-copy"

export function HelpPageContent() {
  const { language, t } = usePrefs()
  const copy = helpCopy[language]
  return (
    <main className="mx-auto w-full max-w-4xl px-3 py-6 pb-24 md:px-4 md:py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.intro}</p>
      </header>
      <nav aria-label={copy.title} className="mt-6 flex flex-wrap gap-2">
        {copy.sections.map((section) => <a key={section.id} href={`#${section.id}`} className="inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">{section.title}</a>)}
      </nav>
      <div className="mt-8 space-y-8">
        {copy.sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24 border-t border-border pt-6">
            <h2 className="text-base font-semibold">{section.title}</h2>
            <ul className="mt-3 list-disc space-y-3 pl-5 text-sm leading-6 text-muted-foreground">
              {section.steps.map((step) => <li key={step}>{step}</li>)}
            </ul>
          </section>
        ))}
      </div>
      <section className="mt-8 border-t border-border pt-6">
        <h2 className="text-base font-semibold">{copy.contact}</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy.contactBody}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {([{ href: "/contact", key: "nav.contact" }, { href: "/account", key: "nav.profile" }, { href: "/messages", key: "nav.messages" }, { href: "/privacy/request", key: "nav.privacyRights" }, { href: "/credits", key: "nav.sources" } ] as const).map((link) => <Link key={link.href} href={link.href} className="inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted">{t(link.key)}</Link>)}
        </div>
      </section>
    </main>
  )
}
