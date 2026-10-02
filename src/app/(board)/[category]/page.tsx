import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { categoryHasPublicInventory } from "@/lib/search-discovery-store"
import { categories, categoryName, isCategoryId } from "@/lib/types"

export const dynamic = "force-dynamic"

export function generateStaticParams() {
  return categories.map((category) => ({ category: category.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>
}): Promise<Metadata> {
  const { category } = await params
  if (!isCategoryId(category)) return { title: "Listings", robots: { index: false, follow: false } }
  const title = categoryName(category)
  const hasInventory = await categoryHasPublicInventory(category)
  return {
    title,
    description: `Browse ${title.toLowerCase()} on Africa Classifieds. Compare prices, locations and listing details, and contact sellers about available ads.`,
    alternates: { canonical: `/${category}` },
    ...(hasInventory ? {} : { robots: { index: false, follow: true } }),
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  if (!isCategoryId(category)) notFound()
  return null
}
