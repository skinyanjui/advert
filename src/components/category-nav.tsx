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

export const categoryIcons: Record<CategoryId | "all", LucideIcon> = {
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

export type CategoryTypeChoice = {
  id: string
  name: string
  count: number
}

type CategoryNavProps = {
  active?: CategoryId
  counts: Record<CategoryId, number>
  total: number
  onSelect: (category?: CategoryId) => void
  types?: CategoryTypeChoice[]
  activeType?: string
  onSelectType?: (type?: string) => void
}

export function CategoryNav({
  active,
  counts,
  total,
  onSelect,
  types = [],
  activeType,
  onSelectType,
}: CategoryNavProps) {
  return (
    <nav aria-label="Categories" className="flex flex-col gap-0.5">
      <CategoryButton
        icon={categoryIcons.all}
        label="All listings"
        count={total}
        active={!active}
        onClick={() => onSelect(undefined)}
      />
      {categories.filter((category) => counts[category.id] > 0 || category.id === active).map((category) => (
        <div key={category.id}>
          <CategoryButton
            icon={categoryIcons[category.id]}
            label={categoryName(category.id)}
            count={counts[category.id]}
            active={active === category.id}
            onClick={() => onSelect(category.id)}
          />
          {active === category.id && types.length > 0 ? (
            <div className="mt-0.5 mb-1 ml-4 flex flex-col gap-0.5 border-l border-neutral-200 pl-2">
              {types.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => onSelectType?.(activeType === type.id ? undefined : type.id)}
                  aria-current={activeType === type.id ? "page" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px]",
                    activeType === type.id
                      ? "bg-neutral-100 font-medium text-neutral-950"
                      : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{type.name}</span>
                  <span className={cn("text-xs tabular-nums", activeType === type.id ? "text-neutral-700" : "text-neutral-400")}>
                    {formatCount(type.count)}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
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
