"use client"

import {
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"

import { usePrefs } from "@/components/prefs-provider"
import { categoryIcons } from "@/lib/categories"
import type { MessageKey } from "@/lib/i18n"
import { categories, type CategoryId } from "@/lib/types"
import { cn } from "@/lib/utils"

export { categoryIcons } from "@/lib/categories"

export type CategoryTypeChoice = {
  id: string
  name: string
  count: number
}

type CategoryNavProps = {
  active?: CategoryId
  counts: Record<CategoryId, number>
  total: number
  hrefForCategory: (category?: CategoryId) => string
  hrefForType: (type?: string) => string
  onNavigate?: () => void
  types?: CategoryTypeChoice[]
  activeType?: string
}

export function CategoryNav({
  active,
  counts,
  total,
  hrefForCategory,
  hrefForType,
  onNavigate,
  types = [],
  activeType,
}: CategoryNavProps) {
  const { t } = usePrefs()
  return (
    <nav aria-label={t("nav.categories")} className="flex flex-col gap-0.5">
        <CategoryButton
          href={hrefForCategory(undefined)}
          icon={categoryIcons.all}
          label={t("nav.allListings")}
          count={total}
          active={!active}
          onNavigate={onNavigate}
        />
        {categories.map((category) => (
          <div key={category.id}>
            <CategoryButton
              href={hrefForCategory(category.id)}
              icon={categoryIcons[category.id]}
              label={t(`category.${category.id}` as MessageKey)}
              count={counts[category.id]}
              active={active === category.id}
              onNavigate={onNavigate}
            />
            {active === category.id && types.length > 0 ? (
              <div className="ml-5 border-l border-sidebar-border pl-2">
                <Link href={hrefForType(undefined)} scroll={false} onClick={onNavigate} aria-current={!activeType ? "page" : undefined} className={cn(typeLinkClass, !activeType ? activeClass : inactiveClass)}>{t("nav.allTypes")}</Link>
                {types.map((type) => (
                  <Link key={type.id} href={hrefForType(type.id)} scroll={false} onClick={onNavigate} aria-current={activeType === type.id ? "page" : undefined} className={cn(typeLinkClass, activeType === type.id ? activeClass : inactiveClass)}>
                    <span className="min-w-0 flex-1 truncate">{t(`post.sub.${type.id}` as MessageKey)}</span><span className="shrink-0 text-xs tabular-nums opacity-60">{type.count}</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ))}
    </nav>
  )
}

const activeClass = "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
const inactiveClass = "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
const typeLinkClass = "flex min-h-11 items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-[13px] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring md:min-h-0"

function CategoryButton({
  href,
  icon: Icon,
  label,
  count,
  active,
  onNavigate,
}: {
  href: string
  icon: LucideIcon
  label: string
  count: number
  active: boolean
  onNavigate?: () => void
}) {
  return (
    <Link
      href={href}
      scroll={false}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring md:h-10 md:min-h-0",
        active ? activeClass : inactiveClass,
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="text-xs tabular-nums opacity-60">{count}</span>
    </Link>
  )
}
