import type { LucideIcon } from "lucide-react"
import {
  Bookmark,
  Home,
  Headphones,
  MessageCircle,
  Plus,
  Tag,
  UserRound,
} from "lucide-react"

export type NavItemId = "home" | "post" | "messages" | "saved" | "my-ads" | "profile" | "help" | "credits"

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
    id: "home",
    href: "/",
    label: "Home",
    shortLabel: "Home",
    icon: Home,
  },
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
    label: "Messenger",
    shortLabel: "Messenger",
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
    id: "help",
    href: "/help",
    label: "Help",
    shortLabel: "Help",
    icon: Headphones,
  },
  {
    id: "credits",
    href: "/contact",
    label: "Contact us",
    shortLabel: "Contact",
    icon: Headphones,
  },
]

export function navItem(id: NavItemId): NavItem {
  const item = navItems.find((entry) => entry.id === id)
  if (!item) throw new Error(`Unknown nav item: ${id}`)
  return item
}
