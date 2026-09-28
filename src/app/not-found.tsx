"use client"

import Link from "next/link"

import { usePrefs } from "@/components/prefs-provider"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  const { t } = usePrefs()
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-xl font-semibold tracking-tight">{t("notFound.title")}</h1>
      <p className="mt-2 text-sm text-neutral-500">{t("notFound.body")}</p>
      <Button asChild className="mt-5 rounded-full">
        <Link href="/">{t("notFound.back")}</Link>
      </Button>
    </div>
  )
}
