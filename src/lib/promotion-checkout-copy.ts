import { translate } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n/locales"

/** Stripe hosted Checkout supports French and English, but not Kiswahili.
 * Keep the seller's product language and disclose the English controls before checkout. */
export function promotionCheckoutCopy(language: Locale, days: number) {
  return {
    locale: language === "fr" ? "fr" : "en",
    name: translate(language, "promotion.productName", { days }),
    description: translate(language, "promotion.productDescription"),
  }
}
