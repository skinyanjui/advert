import { detailFieldValueLabel, type Subcategory } from "@/lib/posting"
import type { CategoryId } from "@/lib/types"

type TitleInput = {
  category: CategoryId | null
  subcategory: Subcategory
  details: Record<string, string>
  city: string
}

export function suggestListingTitle({ category, subcategory, details, city }: TitleInput): string {
  const place = clean(city)
  const value = (key: string) => {
    const field = subcategory.fields.find((item) => item.id === key)
    return clean(field ? detailFieldValueLabel(field, details[key]) : details[key])
  }
  let lead: string[]
  let facts: string[]

  switch (category) {
    case "vehicles":
      lead = [value("year"), value("brand") || value("model") || subcategory.name]
      facts = [value("fuel"), value("transmission"), place]
      break
    case "property":
      lead = [value("bedrooms"), subcategory.name]
      facts = [value("furnished"), value("area") || place]
      break
    case "electronics":
      lead = [value("brand") || value("appliance") || value("kind") || subcategory.name]
      facts = [value("storage") || value("size") || value("output"), value("condition"), place]
      break
    case "home":
      lead = [value("piece") || value("appliance") || subcategory.name]
      facts = [value("condition"), place]
      break
    case "jobs":
      lead = [value("role") || value("position") || subcategory.name]
      facts = [value("workplace"), place]
      break
    case "services":
      lead = [value("service") || subcategory.name]
      facts = [place]
      break
    default: {
      const structured = subcategory.fields.map((field) => value(field.id)).filter(Boolean)
      lead = [structured[0] || subcategory.name]
      facts = [...structured.slice(1, 3), place]
    }
  }

  const heading = unique(lead).join(" ")
  const suffix = unique(facts).filter((item) => !heading.toLowerCase().includes(item.toLowerCase())).join(" · ")
  return [heading, suffix].filter(Boolean).join(" · ").slice(0, 80)
}

export function descriptionGuidance(category: CategoryId | null, subcategory: Subcategory): string[] {
  switch (category) {
    case "vehicles":
      return ["Service or ownership history", "Known faults or recent repairs", "Paperwork available", "Where and when buyers can inspect it"]
    case "property":
      return ["What the price includes", "Utilities, parking, and access", "Deposit or other required fees", "When the property is available"]
    case "jobs":
      return ["Main responsibilities", "Experience or qualifications required", "Hours or schedule", "How candidates should apply"]
    case "electronics":
      return ["Working condition and any faults", "Battery health or power requirements", "Accessories included", "Collection or delivery options"]
    case "services":
      return ["Exactly what is included", "Service area", "Typical turnaround time", "Anything the customer must provide"]
    default:
      return [
        `Condition of the ${subcategory.name.toLowerCase()}`,
        "What is included in the price",
        "Any faults, limits, or important details",
        "Collection, delivery, or handover information",
      ]
  }
}

function clean(value: string | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ")
}

function unique(values: string[]): string[] {
  const seen = new Set<string>()
  return values.filter((value) => {
    if (!value) return false
    const key = value.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
