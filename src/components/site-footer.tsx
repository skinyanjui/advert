import Link from "next/link"

import { PostLink } from "@/components/post-link"
import { categories } from "@/lib/types"

const pages = [
  { href: "/", label: "All listings" },
  ...categories.map((category) => ({ href: `/${category.id}`, label: category.name })),
  { href: "/post", label: "Post ad" },
  { href: "/account", label: "Profile" },
  { href: "/messages", label: "Messages" },
  { href: "/saved", label: "Saved" },
  { href: "/my-ads", label: "My ads" },
]

export function SiteFooter() {
  return (
    <footer className="relative z-40 border-t border-neutral-200/80 bg-white">
      <div className="mx-auto flex max-w-[1720px] flex-col gap-4 px-4 py-6 text-xs leading-5 text-neutral-500 md:px-6">
        <nav aria-label="Pages" className="flex flex-wrap gap-x-4 gap-y-2">
          {pages.map((page) =>
            page.href === "/post" ? (
              <PostLink key={page.href} className="text-neutral-700 hover:text-neutral-950">
                {page.label}
              </PostLink>
            ) : (
              <Link key={page.href} href={page.href} className="text-neutral-700 hover:text-neutral-950">
                {page.label}
              </Link>
            ),
          )}
        </nav>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <p>africa classifieds · sample listings for a pan-African board.</p>
        <p className="max-w-xl md:text-right">
          Countries are ISO 3166 from an open snapshot. Cities and zones are GeoNames and IANA. Currency and language names are Unicode CLDR. Maps use OpenStreetMap. Photos: Unsplash, Pexels, and Wikimedia Commons (Toyota HiAce by Lawrence Ruiz; generator by Biswarup Ganguly, CC BY-SA). Ads, saves, and messages are stored in the database and tied to this browser session.
        </p>
        </div>
      </div>
    </footer>
  )
}
