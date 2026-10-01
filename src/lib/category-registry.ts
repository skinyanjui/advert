export const categories = [
  { id: "vehicles", name: "Vehicles", labelKey: "category.vehicles" },
  { id: "parts", name: "Vehicle parts", labelKey: "category.parts" },
  { id: "property", name: "Property", labelKey: "category.property" },
  { id: "plots", name: "Plots", labelKey: "category.plots" },
  { id: "electronics", name: "Electronics", labelKey: "category.electronics" },
  { id: "home", name: "Home & garden", labelKey: "category.home" },
  { id: "building", name: "Building materials", labelKey: "category.building" },
  { id: "water", name: "Water", labelKey: "category.water" },
  { id: "transport", name: "Transport & logistics", labelKey: "category.transport" },
  { id: "energy", name: "Energy & power", labelKey: "category.energy" },
  { id: "food", name: "Food & market goods", labelKey: "category.food" },
  { id: "industrial", name: "Industrial & commercial", labelKey: "category.industrial" },
  { id: "jobs", name: "Jobs", labelKey: "category.jobs" },
  { id: "services", name: "Services", labelKey: "category.services" },
  { id: "business", name: "Business & equipment", labelKey: "category.business" },
  { id: "agriculture", name: "Agriculture", labelKey: "category.agriculture" },
  { id: "livestock", name: "Livestock", labelKey: "category.livestock" },
  { id: "pets", name: "Pets", labelKey: "category.pets" },
  { id: "babies", name: "Babies & kids", labelKey: "category.babies" },
  { id: "fashion", name: "Fashion & beauty", labelKey: "category.fashion" },
  { id: "health", name: "Health & wellness", labelKey: "category.health" },
  { id: "education", name: "Education", labelKey: "category.education" },
  { id: "community", name: "Community", labelKey: "category.community" },
] as const

export type CategoryId = (typeof categories)[number]["id"]
export type CategoryTranslationKey = (typeof categories)[number]["labelKey"]

const categoryIds = new Set<string>(categories.map((category) => category.id))

export function isCategoryId(value: string | null | undefined): value is CategoryId {
  return !!value && categoryIds.has(value)
}

export function categoryName(id: CategoryId): string {
  return categories.find((category) => category.id === id)?.name ?? id
}

export function categoryTranslationKey(id: CategoryId): CategoryTranslationKey {
  const record = categories.find((category) => category.id === id)
  return record ? record.labelKey : (`category.${id}` as CategoryTranslationKey)
}
