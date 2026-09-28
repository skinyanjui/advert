"use client"

import { Send } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { usePrefs } from "@/components/prefs-provider"
import { TermsNotice } from "@/components/terms-notice"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function ReplyForm({
  placeholder,
  sending,
  onSend,
}: {
  placeholder: string
  sending: boolean
  onSend: (draft: string) => Promise<boolean>
}) {
  const { t } = usePrefs()
  const [draft, setDraft] = useState("")
  const submitting = useRef(false)

  return (
    <form
      className="grid gap-2 border-t border-neutral-200 bg-white px-4 py-3 sm:px-5"
      onSubmit={(event) => {
        event.preventDefault()
        if (sending || submitting.current || draft.trim().length < 8) return
        submitting.current = true
        void onSend(draft)
          .then((ok) => {
            if (ok) setDraft("")
          })
          .catch(() => toast.error(t("inbox.toast.sendError")))
          .finally(() => {
            submitting.current = false
          })
      }}
    >
      <Textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder}
        aria-label={t("inbox.writeAria")}
        maxLength={1000}
        rows={2}
        className="resize-none rounded-xl"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TermsNotice />
        <Button type="submit" disabled={sending || draft.trim().length < 8} className="rounded-full">
          <Send className="size-4" aria-hidden="true" />
          {sending ? t("inbox.sending") : t("inbox.send")}
        </Button>
      </div>
    </form>
  )
}
