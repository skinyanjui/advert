"use client"

import {
  Baby,
  Beef,
  Briefcase,
  Car,
  Cog,
  Droplets,
  GraduationCap,
  Hammer,
  HeartPulse,
  Home,
  LandPlot,
  LayoutGrid,
  Leaf,
  PawPrint,
  Shirt,
  Smartphone,
  Sofa,
  Store,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"

import { formatCount } from "@/lib/format"
import { categories, categoryName, type CategoryId } from "@/lib/types"
import { cn } from "@/lib/utils"

export const categoryIcons: Record<CategoryId | "all", LucideIcon> = {
  all: LayoutGrid,
  vehicles: Car,
  parts: Cog,
  property: Home,
  plots: LandPlot,
  electronics: Smartphone,
  home: Sofa,
  building: Hammer,
  water: Droplets,
  jobs: Briefcase,
  services: Wrench,
  business: Store,
  agriculture: Leaf,
  livestock: Beef,
  pets: PawPrint,
  babies: Baby,
  fashion: Shirt,
  health: HeartPulse,
  education: GraduationCap,
  community: Users,
}

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
            <div className="mt-0.5 mb-1 ml-4 flex flex-col gap-0.5 border-l border-neutral-200 pl-2">
              {types.map((type) => {
                const selected = activeType === type.id
                return (
                  <Link
                    key={type.id}
                    href={hrefForType(selected ? undefined : type.id)}
                    scroll={false}
                    onClick={onNavigate}
                    aria-current={selected ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px]",
                      selected
                        ? "bg-neutral-100 font-medium text-neutral-950"
                        : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{type.name}</span>
                    <span className={cn("text-xs tabular-nums", selected ? "text-neutral-700" : "text-neutral-400")}>
                      {formatCount(type.count)}
                    </span>
                  </Link>
                )
              })}
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
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
        active
          ? "bg-neutral-100 font-medium text-neutral-950"
          : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className={cn("text-xs tabular-nums", active ? "text-neutral-700" : "text-neutral-400")}>
        {formatCount(count)}
      </span>
    </Link>
  )
}
