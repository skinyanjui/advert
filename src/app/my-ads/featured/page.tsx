import { PromotionsPage } from "@/components/promotions-page"
import { requirePromotionPage } from "@/lib/promotion-page-access"
export const metadata = { title: "Feature an ad" }
export const dynamic = "force-dynamic"
export default async function Page() {
  await requirePromotionPage("/my-ads/featured")
  return <PromotionsPage />
}
