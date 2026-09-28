"use client"

import { usePrefs } from "@/components/prefs-provider"
import { cn } from "@/lib/utils"

/** Shown on legal pages when the UI language is not English. */
export function LegalEnglishOnlyNotice({ className }: { className?: string }) {
  const { language, t } = usePrefs()
  if (language === "en") return null
  return (
    <p
      role="status"
      className={cn(
        "mt-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700",
        className,
      )}
    >
      {t("prefs.legalEnglishOnly")}
    </p>
  )
}
