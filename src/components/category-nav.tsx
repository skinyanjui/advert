"use client"

import {
  Briefcase,
  Car,
  GraduationCap,
  HeartPulse,
  Home,
  LayoutGrid,
  Leaf,
  Shirt,
  Smartphone,
  Sofa,
  Store,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react"

import { formatCount } from "@/lib/format"
import { categories, categoryName, type CategoryId } from "@/lib/types"
import { cn } from "@/lib/utils"

const icons: Record<CategoryId | "all", LucideIcon> = {
  all: LayoutGrid,
  vehicles: Car,
  property: Home,
  electronics: Smartphone,
  home: Sofa,
  jobs: Briefcase,
  services: Wrench,
  business: Store,
  agriculture: Leaf,
  fashion: Shirt,
  health: HeartPulse,
  education: GraduationCap,
  community: Users,
}

type CategoryNavProps = {
  active?: CategoryId
  counts: Record<CategoryId, number>
  total: number
  onSelect: (category?: CategoryId) => void
}

export function CategoryNav({ active, counts, total, onSelect }: CategoryNavProps) {
  return (
    <nav aria-label="Categories" className="flex flex-col gap-0.5">
      <CategoryButton
        icon={icons.all}
        label="All listings"
        count={total}
        active={!active}
        onClick={() => onSelect(undefined)}
      />
      {categories.map((category) => (
        <CategoryButton
          key={category.id}
          icon={icons[category.id]}
          label={categoryName(category.id)}
          count={counts[category.id]}
          active={active === category.id}
          onClick={() => onSelect(category.id)}
        />
      ))}
    </nav>
  )
}

function CategoryButton({
  icon: Icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: LucideIcon
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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
    </button>
  )
}
