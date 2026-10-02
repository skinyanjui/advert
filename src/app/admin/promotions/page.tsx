import { PromotionsPage } from "@/components/promotions-page"
import { requirePromotionPage } from "@/lib/promotion-page-access"
export const metadata = { title: "Featured promotions" }
export const dynamic = "force-dynamic"
export default async function Page() {
  await requirePromotionPage("/admin/promotions", true)
  return <PromotionsPage admin />
}
