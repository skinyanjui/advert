"use client"

import { useState, type ReactNode } from "react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { trackListingContactEvent } from "@/lib/contact-events"
import { whatsappConsentStatement } from "@/lib/whatsapp-consent"

export function WhatsAppConsentAction({
  listingId,
  sellerName,
  listingTitle,
  href,
  className,
  ariaLabel,
  children,
}: {
  listingId: string
  sellerName: string
  listingTitle: string
  href: string
  className?: string
  ariaLabel?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const statement = whatsappConsentStatement(sellerName, listingTitle)

  async function continueToWhatsApp() {
    if (!checked || busy) return
    setBusy(true)
    try {
      const response = await fetch("/api/whatsapp-consent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listingId }),
      })
      const payload = (await response.json()) as { reason?: string }
      if (!response.ok) {
        toast.error(payload.reason ?? "Could not record WhatsApp consent.")
        return
      }
      trackListingContactEvent(listingId, "whatsapp_click")
      window.open(href, "_blank", "noopener,noreferrer")
      setOpen(false)
      setChecked(false)
    } catch {
      toast.error("Could not continue to WhatsApp.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className={className}
        aria-label={ariaLabel}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setChecked(false)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Continue to WhatsApp</DialogTitle>
            <DialogDescription>
              This opens WhatsApp to contact {sellerName} about this listing.
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-start gap-3 rounded-xl border border-neutral-200 p-3 text-sm leading-5 text-neutral-700">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 rounded border-neutral-300"
              checked={checked}
              onChange={(event) => setChecked(event.target.checked)}
            />
            <span>{statement}</span>
          </label>
          <p className="text-xs leading-5 text-neutral-500">
            The marketplace records this consent and the time it was given. WhatsApp conversations happen outside the marketplace.
          </p>
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!checked || busy} onClick={() => void continueToWhatsApp()}>
              {busy ? "Continuing…" : "Continue to WhatsApp"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
