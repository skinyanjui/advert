import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { categories, categoryName, isCategoryId } from "@/lib/types"

export function generateStaticParams() {
  return categories.map((category) => ({ category: category.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>
}): Promise<Metadata> {
  const { category } = await params
  if (!isCategoryId(category)) return { title: "Listings" }
  return { title: categoryName(category) }
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  if (!isCategoryId(category)) notFound()
  return null
}
