"use client"

import { usePrefs } from "@/components/prefs-provider"
import type { MessageKey } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export function LoadingText({
  messageKey,
  className,
}: {
  messageKey: MessageKey
  className?: string
}) {
  const { t } = usePrefs()
  return <p className={cn("text-sm text-neutral-500", className)}>{t(messageKey)}</p>
}
