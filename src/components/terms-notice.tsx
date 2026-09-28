"use client"

import Link from "next/link"

import { usePrefs } from "@/components/prefs-provider"
import { cn } from "@/lib/utils"

export function TermsNotice({ className }: { className?: string }) {
  const { t } = usePrefs()
  return (
    <p className={cn("text-xs text-neutral-500", className)}>
      {t("terms.mustFollowPrefix")}{" "}
      <Link href="/terms" className="underline underline-offset-2 hover:text-neutral-800">
        {t("auth.terms")}
      </Link>
      .
    </p>
  )
}
