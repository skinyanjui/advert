import { countryName, type Listing } from "@/lib/types"

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatPrice(listing: Pick<Listing, "price" | "priceSuffix">): string {
  const money = formatMoney(listing.price)
  return listing.priceSuffix ? `${money} ${listing.priceSuffix}` : money
}

export function hoursAgoOf(listing: Pick<Listing, "hoursAgo" | "postedAt">, now = Date.now()): number {
  if (!listing.postedAt) return listing.hoursAgo
  const posted = new Date(listing.postedAt).getTime()
  if (Number.isNaN(posted)) return listing.hoursAgo
  return Math.max(0, (now - posted) / 3_600_000)
}

export function formatPosted(hoursAgo: number): string {
  if (hoursAgo < 1) return "Just now"
  if (hoursAgo < 24) {
    const hours = Math.max(1, Math.round(hoursAgo))
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`
  }
  const days = Math.max(1, Math.round(hoursAgo / 24))
  return days === 1 ? "1 day ago" : `${days} days ago`
}

export function formatPlace(listing: Pick<Listing, "city" | "country">): string {
  return `${listing.city}, ${countryName(listing.country)}`
}

export function formatCount(count: number): string {
  if (count < 1000) return String(count)
  const compact = count / 1000
  const digits = compact >= 10 ? 0 : 1
  return `${compact.toFixed(digits).replace(/\.0$/, "")}k`
}

export function whatsappHref(phone: string, title: string): string {
  const digits = phone.replace(/[^\d]/g, "")
  const text = encodeURIComponent(`Hello, I saw your listing "${title}" on africa classifieds.`)
  return `https://wa.me/${digits}?text=${text}`
}

export function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean)
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "")
  return letters.join("") || "AC"
}
