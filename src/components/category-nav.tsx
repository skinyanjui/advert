"use client"

import {
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"

import { categoryIcons } from "@/lib/categories"
import { categories, categoryName, type CategoryId } from "@/lib/types"
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
  return (
    <nav aria-label="Categories" className="flex flex-col gap-0.5">
        <CategoryButton
          href={hrefForCategory(undefined)}
          icon={categoryIcons.all}
          label="All listings"
          count={total}
          active={!active}
          onNavigate={onNavigate}
        />
        {categories.map((category) => (
          <div key={category.id}>
            <CategoryButton
              href={hrefForCategory(category.id)}
              icon={categoryIcons[category.id]}
              label={categoryName(category.id)}
              count={counts[category.id]}
              active={active === category.id}
              onNavigate={onNavigate}
            />
            {active === category.id && types.length > 0 ? (
              <div className="ml-5 border-l border-neutral-200 pl-2">
                <Link href={hrefForType(undefined)} scroll={false} onClick={onNavigate} aria-current={!activeType ? "page" : undefined} className={cn("block rounded-lg px-2 py-1.5 text-[13px]", !activeType ? "bg-neutral-100 font-medium text-neutral-950" : "text-neutral-600 hover:bg-neutral-50")}>All types</Link>
                {types.map((type) => (
                  <Link key={type.id} href={hrefForType(type.id)} scroll={false} onClick={onNavigate} aria-current={activeType === type.id ? "page" : undefined} className={cn("flex items-center justify-between rounded-lg px-2 py-1.5 text-[13px]", activeType === type.id ? "bg-neutral-100 font-medium text-neutral-950" : "text-neutral-600 hover:bg-neutral-50")}>
                    <span>{type.name}</span><span className="text-xs opacity-60">{type.count}</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ))}
    </nav>
  )
}

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
        "flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm transition-colors",
        active
          ? "bg-neutral-100 font-medium text-neutral-950"
          : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="text-xs tabular-nums opacity-60">{count}</span>
    </Link>
  )
}
