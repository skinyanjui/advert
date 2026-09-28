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

import { categories, type CategoryId } from "@/lib/types"

/** Every category id (plus "all") must have an icon — enforced by `satisfies`. */
export const categoryIcons = {
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
} as const satisfies Record<CategoryId | "all", LucideIcon>

export type CategoryIconId = keyof typeof categoryIcons

export { categories }
export type { CategoryId }
