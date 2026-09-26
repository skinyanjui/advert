import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { Browse } from "@/components/browse"
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
  return (
    <Suspense fallback={<CategoryFallback />}>
      <Browse />
    </Suspense>
  )
}

function CategoryFallback() {
  return (
    <div className="mx-auto grid w-full max-w-[1720px] gap-3 px-4 py-6 sm:grid-cols-2 md:px-6 xl:grid-cols-5">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="aspect-[4/5] rounded-2xl bg-white" />
      ))}
    </div>
  )
}
