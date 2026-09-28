"use client"

import { usePrefs } from "@/components/prefs-provider"

export function AdminDenied() {
  const { t } = usePrefs()
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("admin.reportsTitle")}</h1>
      <p className="mt-2 text-sm text-neutral-500">{t("admin.notAllowlisted")}</p>
    </div>
  )
}
