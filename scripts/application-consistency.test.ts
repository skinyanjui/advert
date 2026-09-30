import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { test } from "node:test"

function source(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

test("shared navigation and Messenger terminology stay consistent", () => {
  const nav = source("src/lib/nav.ts")
  const en = source("src/lib/i18n/messages/en.ts")
  const fr = source("src/lib/i18n/messages/fr.ts")
  const sw = source("src/lib/i18n/messages/sw.ts")

  assert.match(nav, /label: "Messenger"/)
  assert.doesNotMatch(nav, /label: "Messages"/)
  for (const messages of [en, fr, sw]) {
    assert.match(messages, /"nav\.messages": "Messenger"/)
    assert.match(messages, /"inbox\.title": "Messenger"/)
    assert.match(messages, /"messages\.title": "Messenger"/)
  }
})

test("member-only pages enforce sign-in at their own route boundary", () => {
  const saved = source("src/components/collections.tsx")
  const myAds = source("src/components/my-ads-page.tsx")
  const messenger = source("src/components/messages-page.tsx")
  const menu = source("src/components/profile-menu.tsx")

  assert.match(saved, /router\.replace\(signInHref\("\/saved"\)\)/)
  assert.match(myAds, /router\.replace\(signInHref\("\/my-ads"\)\)/)
  assert.match(messenger, /router\.replace\(signInHref\("\/messages"\)\)/)
  assert.match(menu, /auth\.signedIn \? \(\s*<>[\s\S]*href="\/messages"[\s\S]*href="\/saved"/)
})

test("legal acceptance stays at onboarding and account access boundaries", () => {
  const post = source("src/components/post-form.tsx")
  const reply = source("src/components/inbox/reply-form.tsx")
  const signIn = source("src/components/sign-in-form.tsx")
  const reaccept = source("src/components/terms-reaccept-dialog.tsx")

  assert.equal(existsSync(new URL("../src/components/terms-notice.tsx", import.meta.url)), false)
  assert.doesNotMatch(post, /TermsNotice/)
  assert.doesNotMatch(reply, /TermsNotice/)
  assert.match(signIn, /auth\.ageConfirm/)
  assert.match(signIn, /auth\.legalAgreementPrefix/)
  assert.match(signIn, /auth\.legalAgreementPrivacy/)
  assert.match(signIn, /auth\.mustAgree/)
  assert.match(reaccept, /terms\.reacceptTitle/)
  assert.match(reaccept, /terms\.reacceptBody/)
})

test("Messenger has no demo inbox fallback", () => {
  const page = source("src/components/messages-page.tsx")
  const list = source("src/components/inbox/conversation-list.tsx")
  const panel = source("src/components/inbox/conversation-panel.tsx")

  assert.equal(existsSync(new URL("../src/lib/sample-conversations.ts", import.meta.url)), false)
  assert.doesNotMatch(page, /sampleThreads|showingSamples|demo=/)
  assert.match(list, /t\("inbox\.title"\)/)
  assert.match(panel, /t\("inbox\.replyPlaceholder"\)/)
})

test("listing contact actions behave consistently across layouts", () => {
  const detail = source("src/components/listing-detail.tsx")

  assert.match(detail, /smsHref\(listing\.phone, listing\.title\)/)
  assert.match(detail, /href=\{whatsappHref\(listing\.phone, listing\.title\)\}/)
  assert.match(detail, /onClick=\{revealAndCall\}/)
  assert.match(detail, /id="listing-message-composer"/)
  assert.doesNotMatch(detail, /<Dialog open=\{messageOpen && contactOpen\}/)
  assert.doesNotMatch(detail, />Listing ID \{listing\.id\}</)
})

test("onboarding no longer promises guest access to protected posting", () => {
  const signIn = source("src/components/sign-in-form.tsx")
  const readme = source("README.md")

  assert.doesNotMatch(signIn, /Until then you can still post with this browser session/)
  assert.match(signIn, /Protected account actions stay unavailable|auth\.notConfiguredBody/)
  assert.match(readme, /not considered deployed until the corresponding Vercel deployment is confirmed `READY`/)
})


test("Vercel automatic Git deployments are production-only", () => {
  const config = JSON.parse(source("vercel.json")) as {
    git?: { deploymentEnabled?: Record<string, boolean> }
  }
  assert.equal(config.git?.deploymentEnabled?.["**"], false)
  assert.equal(config.git?.deploymentEnabled?.main, true)
})


test("marketplace surfaces prioritize listing value over duplicate controls", () => {
  const card = source("src/components/listing-card.tsx")
  const detail = source("src/components/listing-detail.tsx")
  const city = source("src/components/board-place.tsx")
  const saved = source("src/components/collections.tsx")
  const inbox = source("src/components/inbox/conversation-list.tsx")
  const panel = source("src/components/inbox/conversation-panel.tsx")
  const myAds = source("src/components/my-ads-page.tsx")
  const header = source("src/components/site-header.tsx")

  assert.doesNotMatch(card, /WhatsAppConsentAction/)
  assert.match(card, /countryCode.*away/)
  assert.ok(card.includes("border border-border/70 bg-card"))
  assert.match(detail, /Manage listing/)
  assert.match(detail, /lg:top-16/)
  assert.match(city, /border-input bg-background/)
  assert.doesNotMatch(saved, /\{description\}<\/p>/)
  assert.match(inbox, /formatPrice\(listing\)/)
  assert.match(inbox, /t\("inbox\.emptyBody"\)/)
  assert.match(panel, /thread\.viewerIsSeller \? t\("inbox\.buyer"\) : t\("inbox\.seller"\)/)
  assert.match(myAds, /mine\.some\(\(listing\) => listing\.hidden\)/)
  assert.match(myAds, /mine\.length > 0/)
  assert.match(header, /grid h-14 w-full/)
})


test("listing detail uses a progressive transaction hierarchy", () => {
  const detail = source("src/components/listing-detail.tsx")
  assert.match(detail, /gallery\.length >= 4/)
  assert.match(detail, /navigator\.share/)
  assert.match(detail, /line-clamp-6/)
  assert.match(detail, /function ListingStatus/)
  assert.match(detail, /labels\.slice\(0, 2\)/)
  assert.match(detail, /flex flex-wrap gap-2/)
  assert.doesNotMatch(detail, /\) : <span \/>/)
  assert.match(detail, /More contact options/)
  assert.match(detail, /relatedListings\(listings, ad\)\.slice\(0, 4\)/)
  assert.doesNotMatch(detail, /useClientTime/)
  assert.doesNotMatch(detail, /listingGridClassNameLoose/)
  assert.doesNotMatch(detail, /bg-white/)
})


test("listing detail follow-up removes residual layout placeholders and chrome", () => {
  const detail = source("src/components/listing-detail.tsx")
  assert.doesNotMatch(detail, /\) : <span \/>/)
  assert.match(detail, /h-10 w-full rounded-full.*openMessageComposer/)
  assert.match(detail, /border-t border-border pt-3/)
  assert.doesNotMatch(detail, /bg-neutral-200|bg-neutral-100/)
})


test("stale navigation utilities and starter assets stay removed", () => {
  const browse = source("src/components/browse.tsx")
  const countries = source("src/lib/countries.ts")

  assert.doesNotMatch(browse, /categoryName/)
  assert.doesNotMatch(browse, /const place = query\.country/)
  assert.doesNotMatch(countries, /formatLocalTime/)

  for (const path of [
    "../src/components/nav-icon-link.tsx",
    "../src/components/ui/scroll-area.tsx",
    "../src/lib/use-client-time.ts",
    "../public/file.svg",
    "../public/globe.svg",
    "../public/next.svg",
    "../public/vercel.svg",
    "../public/window.svg",
    "../assets/cf65a445-3137-4124-aed3-919df71da402.png",
  ]) {
    assert.equal(existsSync(new URL(path, import.meta.url)), false)
  }
})


test("country helpers expose only live marketplace utilities", () => {
  const countries = source("src/lib/countries.ts")
  assert.doesNotMatch(countries, /export function isCountryId/)
  assert.doesNotMatch(countries, /export function languageLabel/)
})


test("primary marketplace surfaces share one full-width spacing system", () => {
  const header = source("src/components/site-header.tsx")
  const browse = source("src/components/browse.tsx")
  const fallback = source("src/components/board-shell.tsx")
  const collections = source("src/components/collections.tsx")
  const messages = source("src/components/messages-page.tsx")
  const myAds = source("src/components/my-ads-page.tsx")

  assert.match(header, /grid h-14 w-full/)
  assert.match(header, /px-3/)
  assert.match(browse, /<div className="w-full">/)
  assert.match(browse, /px-3 pt-0 pb-16 md:px-4/)
  assert.match(fallback, /w-full px-3 py-4 md:px-4/)
  for (const page of [collections, messages, myAds]) {
    assert.doesNotMatch(page, /max-w-\[1720px\]/)
    assert.match(page, /w-full px-3/)
    assert.match(page, /md:px-4/)
  }
})


test("desktop marketplace spacing follows the shared 248px and 16px rhythm", () => {
  const header = source("src/components/site-header.tsx")
  const categories = source("src/components/category-nav.tsx")
  const categoryShell = source("src/components/category-top-nav.tsx")
  const card = source("src/components/listing-card.tsx")
  const sidebar = source("src/components/ui/sidebar.tsx")

  assert.match(header, /md:grid-cols-\[15\.5rem_minmax\(0,1fr\)_auto\]/)
  assert.match(header, /md:px-0/)
  assert.match(header, /md:px-4/)
  assert.match(header, /className="h-8 rounded-full border-input/)
  assert.match(sidebar, /SIDEBAR_WIDTH = "15\.5rem"/)
  assert.match(categories, /flex h-10 w-full/)
  assert.match(categoryShell, /shrink-0 border-t border-sidebar-border px-2 py-2/)
  assert.doesNotMatch(categoryShell, /absolute bottom-2 left-1\/2/)
  assert.match(card, /border border-border\/70 bg-card/)
  assert.match(card, /px-3 py-2\.5/)
  assert.match(card, /mt-1\.5 flex min-w-0 items-center/)
})


test("footer routes people to a useful contact hub instead of sources", () => {
  const footer = source("src/components/site-footer.tsx")
  const contact = source("src/app/contact/page.tsx")
  const mobileLegal = source("src/components/mobile-legal-links.tsx")
  const nav = source("src/lib/nav.ts")

  assert.match(footer, /href="\/help"/)
  assert.match(footer, />Help</)
  assert.match(footer, /href="\/contact"/)
  assert.match(footer, />Contact us</)
  assert.doesNotMatch(footer, /credits|Sources/)
  assert.match(mobileLegal, /href="\/help"/)
  assert.match(mobileLegal, /href="\/contact"/)
  assert.match(nav, /href: "\/help"/)
  assert.match(nav, /label: "Help"/)
  assert.match(nav, /href: "\/contact"/)
  assert.match(nav, /label: "Contact us"/)
  assert.match(contact, /Account & general help/)
  assert.match(contact, /Listings & moderation/)
  assert.match(contact, /Safety & abuse/)
  assert.match(contact, /Privacy/)
  assert.match(contact, /\/privacy\/choices/)
  assert.match(contact, /Report on the listing/)
  assert.doesNotMatch(contact, /government ID numbers.*banking information.*medical records.*form/i)
})


test("profile menu keeps high-value actions and routes support through Help", () => {
  const menu = source("src/components/profile-menu.tsx")
  assert.match(menu, /href="\/help"/)
  assert.match(menu, />Help</)
  assert.match(menu, /href="\/account"/)
  assert.match(menu, /href="\/my-ads"/)
  assert.match(menu, /href="\/messages"/)
  assert.match(menu, /href="\/saved"/)
  assert.doesNotMatch(menu, /href="\/terms"/)
  assert.doesNotMatch(menu, /href="\/privacy\/choices"/)
})
