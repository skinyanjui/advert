import type { LucideIcon } from "lucide-react"
import {
  Bookmark,
  Coins,
  MessageCircle,
  Plus,
  Tag,
  UserRound,
} from "lucide-react"

export type NavItemId = "post" | "messages" | "saved" | "my-ads" | "profile" | "credits"

export type NavItem = {
  id: NavItemId
  href: string
  label: string
  shortLabel: string
  icon: LucideIcon
}

/** Shared primary nav used by header, profile menu, and compact footer. */
export const navItems: NavItem[] = [
  {
    id: "post",
    href: "/post",
    label: "Post an ad",
    shortLabel: "Post ad",
    icon: Plus,
  },
  {
    id: "messages",
    href: "/messages",
    label: "Messages",
    shortLabel: "Messages",
    icon: MessageCircle,
  },
  {
    id: "saved",
    href: "/saved",
    label: "Saved ads",
    shortLabel: "Saved",
    icon: Bookmark,
  },
  {
    id: "my-ads",
    href: "/my-ads",
    label: "My ads",
    shortLabel: "My ads",
    icon: Tag,
  },
  {
    id: "profile",
    href: "/account",
    label: "Profile",
    shortLabel: "Profile",
    icon: UserRound,
  },
  {
    id: "credits",
    href: "/credits",
    label: "Credits",
    shortLabel: "Credits",
    icon: Coins,
  },
]

export function navItem(id: NavItemId): NavItem {
  const item = navItems.find((entry) => entry.id === id)
  if (!item) throw new Error(`Unknown nav item: ${id}`)
  return item
}
