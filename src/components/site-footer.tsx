import {
  Bookmark,
  Coins,
  Inbox,
  LayoutGrid,
  Plus,
  Tag,
  UserRound,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { PostLink } from "@/components/post-link"
import { cn } from "@/lib/utils"

const links: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Browse", icon: LayoutGrid },
  { href: "/messages", label: "Inbox", icon: Inbox },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/my-ads", label: "My ads", icon: Tag },
  { href: "/account", label: "Account", icon: UserRound },
  { href: "/credits", label: "Credits", icon: Coins },
]

export function SiteFooter({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <footer className="shrink-0 border-t border-sidebar-border bg-sidebar px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
      <PostLink
        onClick={onNavigate}
        className="mb-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-neutral-950 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
      >
        <Plus className="size-4" aria-hidden="true" />
        Post ad
      </PostLink>
      <nav aria-label="More pages" className="grid grid-cols-2 gap-0.5">
        {links.map((item) => (
          <FooterLink key={item.href} href={item.href} icon={item.icon} onNavigate={onNavigate}>
            {item.label}
          </FooterLink>
        ))}
      </nav>
      <p className="mt-3 px-1.5 text-[11px] tracking-wide text-neutral-400">africa classifieds</p>
    </footer>
  )
}

function FooterLink({
  href,
  icon: Icon,
  onNavigate,
  children,
}: {
  href: string
  icon: LucideIcon
  onNavigate?: () => void
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex h-9 items-center gap-2 rounded-lg px-2 text-sm text-neutral-600 transition-colors",
        "hover:bg-neutral-100 hover:text-neutral-950",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950",
      )}
    >
      <Icon className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
      <span className="truncate">{children}</span>
    </Link>
  )
}
