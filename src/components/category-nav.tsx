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
import { useEffect, useRef } from "react"

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
  const categoryStrip = useRef<HTMLElement>(null)

  useEffect(() => {
    const strip = categoryStrip.current
    const selected = strip?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!strip || !selected) return
    strip.scrollTo({ left: selected.offsetLeft - strip.offsetLeft - (strip.clientWidth - selected.clientWidth) / 2 })
  }, [active])

  return (
    <div>
      <nav ref={categoryStrip} aria-label="Categories" className="flex items-center gap-1 overflow-x-auto px-3 py-2 md:px-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <CategoryButton
        href={hrefForCategory(undefined)}
        icon={categoryIcons.all}
        label="All listings"
        count={total}
        active={!active}
        onNavigate={onNavigate}
      />
        {categories.map((category) => (
          <CategoryButton
            key={category.id}
            href={hrefForCategory(category.id)}
            icon={categoryIcons[category.id]}
            label={categoryName(category.id)}
            count={counts[category.id]}
            active={active === category.id}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
      {active && types.length > 0 ? (
        <nav aria-label="Types" className="flex items-center gap-1 overflow-x-auto border-t border-neutral-100 px-3 py-2 md:px-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link href={hrefForType(undefined)} scroll={false} aria-current={!activeType ? "page" : undefined} className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs", !activeType ? "bg-neutral-950 text-white" : "text-neutral-600 hover:bg-neutral-100")}>All types</Link>
          {types.map((type) => (
            <Link key={type.id} href={hrefForType(type.id)} scroll={false} onClick={onNavigate} aria-current={activeType === type.id ? "page" : undefined} className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs", activeType === type.id ? "bg-neutral-950 text-white" : "text-neutral-600 hover:bg-neutral-100")}>
              {type.name} <span className="opacity-60">{type.count}</span>
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
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
        "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-left text-[13px] whitespace-nowrap transition-colors",
        active
          ? "bg-neutral-100 font-medium text-neutral-950"
          : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span>{label}</span>
      <span className="text-xs tabular-nums opacity-60">{count}</span>
    </Link>
  )
}
