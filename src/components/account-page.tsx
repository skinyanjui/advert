"use client"

import { ChevronRight, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { CityField } from "@/components/city-field"
import { EmptyPanel } from "@/components/empty-panel"
import { NavBadge } from "@/components/nav-badge"
import { KeepAdsPrompt } from "@/components/sign-in-form"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { navCountAriaLabel, useNavCounts } from "@/hooks/use-nav-counts"
import { postAdHref } from "@/lib/active-place"
import { useAuth } from "@/lib/auth"
import { canonicalCountry, countries } from "@/lib/countries"
import { writeHomePlace } from "@/lib/home-place"
import { useMarketplace } from "@/lib/marketplace"
import { messageThreads, unreadMessageCount } from "@/lib/messages"
import { navItem } from "@/lib/nav"
import {
  avatarFileError,
  cityError,
  displayNameError,
  memberSinceYear,
  type BoardProfile,
} from "@/lib/profile"
import { useRememberedPlace } from "@/lib/use-remembered-place"

export function AccountPage() {
  const auth = useAuth()
  const { admin } = useMarketplace()
  const isAdmin = auth.signedIn && admin

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 md:px-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        {auth.ready ? (
          auth.signedIn ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Signed in as {auth.email}. Your ads, saves, and messages stay with this account.
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Guest on this browser. Sign in to keep ads after clearing cookies or on another device.
            </p>
          )
        ) : null}
      </header>

      {!auth.ready ? (
        <ProfileSkeleton />
      ) : !auth.signedIn ? (
        <>
          <EmptyPanel
            title="Sign in to edit your Profile"
            body="Email code sign-in. No password. Keep ads, saves, and messages on this account."
            actionHref="/sign-in"
            actionLabel="Sign in"
            className="mt-0"
          >
            <KeepAdsPrompt className="mx-auto mt-4 max-w-sm rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm text-amber-950" />
          </EmptyPanel>
          <ProfileShortcuts isAdmin={false} />
        </>
      ) : (
        <>
          <SignedInProfile
            email={auth.email}
            createdAt={auth.user?.created_at ?? null}
            signOut={() => auth.signOut()}
          />
          <ProfileShortcuts isAdmin={isAdmin} />
        </>
      )}
    </div>
  )
}

function ProfileShortcuts({ isAdmin }: { isAdmin: boolean }) {
  const auth = useAuth()
  const { ready, listings, savedIds, messages } = useMarketplace()
  const navCounts = useNavCounts()
  const unread = unreadMessageCount(messages)
  const sellerUnread = unreadMessageCount(messages.filter((item) => item.viewerIsSeller))
  const threads = messageThreads(messages)
  const mine = listings.filter((listing) => listing.mine).length
  const postHref = postAdHref(useRememberedPlace())
  const messagesNav = navItem("messages")
  const myAdsNav = navItem("my-ads")
  const savedNav = navItem("saved")
  const postNav = navItem("post")

  return (
    <section aria-label="Shortcuts" className="space-y-2">
      {!ready ? <p className="text-sm text-muted-foreground">Loading your shortcuts…</p> : null}
      <ul className="grid gap-2">
        <ProfileLink
          href={messagesNav.href}
          title={messagesNav.label}
          detail={messageDetail(threads.length, unread)}
          badge={navCounts.messages ?? 0}
          ariaLabel={navCountAriaLabel(messagesNav.label, "messages", navCounts)}
        />
        <ProfileLink
          href={savedNav.href}
          title={savedNav.label}
          detail={countDetail(savedIds.length, "saved ad", "saved ads")}
        />
        <ProfileLink
          href={myAdsNav.href}
          title={myAdsNav.label}
          detail={myAdsDetail(mine, sellerUnread, auth.signedIn)}
          badge={navCounts["my-ads"] ?? 0}
          ariaLabel={navCountAriaLabel(myAdsNav.label, "my-ads", navCounts)}
        />
        <ProfileLink
          href={postHref}
          title={postNav.label}
          detail="Cars, houses, jobs, and everything else on the board."
        />
        {isAdmin ? (
          <ProfileLink href="/admin/reports" title="Reports" detail="Review reported ads as an admin." />
        ) : null}
      </ul>
    </section>
  )
}

function ProfileLink({
  href,
  title,
  detail,
  badge = 0,
  ariaLabel,
}: {
  href: string
  title: string
  detail: string
  badge?: number
  ariaLabel?: string
}) {
  return (
    <li>
      <Link
        href={href}
        aria-label={ariaLabel}
        className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-card-foreground ring-1 ring-foreground/10 hover:bg-muted/40"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-sm font-medium">{title}</span>
            <NavBadge count={badge} placement="inline" />
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  )
}

function messageDetail(threads: number, unread: number): string {
  if (threads === 0) return "No conversations yet. Write to a seller from a listing."
  if (unread === 0) return threads === 1 ? "1 conversation" : `${threads} conversations`
  return unread === 1 ? "1 unread reply" : `${unread} unread replies`
}

function countDetail(count: number, singular: string, plural: string): string {
  if (count === 0) return `No ${plural} yet`
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`
}

function myAdsDetail(mine: number, sellerUnread: number, signedIn: boolean): string {
  const base = countDetail(
    mine,
    signedIn ? "ad on your account" : "ad on this browser",
    signedIn ? "ads on your account" : "ads on this browser",
  )
  if (sellerUnread === 0) return base
  return `${base} · ${sellerUnread === 1 ? "1 unread message" : `${sellerUnread} unread messages`}`
}

function SignedInProfile({
  email,
  createdAt,
  signOut,
}: {
  email: string | null
  createdAt: string | null
  signOut: () => Promise<void>
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState<BoardProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [city, setCity] = useState("")
  const [countryCode, setCountryCode] = useState<string>("")
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [errors, setErrors] = useState<{ displayName?: string; city?: string; country?: string }>({})
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" })
        const payload = (await response.json()) as { ok?: boolean; profile?: BoardProfile; reason?: string }
        if (!active) return
        if (!response.ok || !payload.profile) {
          toast.error(payload.reason ?? "Could not load your profile.")
          setLoading(false)
          return
        }
        setProfile(payload.profile)
        setDisplayName(payload.profile.displayName ?? "")
        setCity(payload.profile.city ?? "")
        setCountryCode(payload.profile.countryCode ?? "")
        setAvatarPreview(payload.profile.avatarUrl)
        setLoading(false)
      } catch {
        if (!active) return
        toast.error("Could not load your profile.")
        setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const sinceYear = memberSinceYear(profile?.createdAt ?? createdAt)
  const initials = (displayName.trim() || email || "?").slice(0, 2).toUpperCase()
  const dirty =
    Boolean(profile) &&
    (displayName.trim() !== (profile?.displayName ?? "") ||
      city.trim() !== (profile?.city ?? "") ||
      (countryCode || "") !== (profile?.countryCode ?? "") ||
      avatarDataUrl !== null ||
      removeAvatar)

  async function onPickAvatar(file: File | undefined) {
    if (!file) return
    const reason = avatarFileError(file)
    if (reason) {
      toast.error(reason)
      return
    }
    const dataUrl = await readFileAsDataUrl(file)
    setAvatarDataUrl(dataUrl)
    setAvatarPreview(dataUrl)
    setRemoveAvatar(false)
  }

  async function saveProfile() {
    const nameReason = displayNameError(displayName)
    const placeReason = cityError(city)
    const countryReason =
      city.trim() && !countryCode ? "Choose a country for your city." : undefined
    setErrors({ displayName: nameReason, city: placeReason, country: countryReason })
    if (nameReason || placeReason || countryReason) return

    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        displayName: displayName.trim(),
        city: city.trim() || null,
        countryCode: countryCode ? canonicalCountry(countryCode) ?? null : null,
      }
      if (avatarDataUrl) body.avatarUrl = avatarDataUrl
      else if (removeAvatar) body.avatarUrl = null

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      const payload = (await response.json()) as { ok?: boolean; profile?: BoardProfile; reason?: string }
      if (!response.ok || !payload.profile) {
        toast.error(payload.reason ?? "Could not save your profile.")
        return
      }
      setProfile(payload.profile)
      setDisplayName(payload.profile.displayName ?? "")
      setCity(payload.profile.city ?? "")
      setCountryCode(payload.profile.countryCode ?? "")
      setAvatarPreview(payload.profile.avatarUrl)
      setAvatarDataUrl(null)
      setRemoveAvatar(false)
      if (payload.profile.countryCode) {
        writeHomePlace({
          country: payload.profile.countryCode,
          ...(payload.profile.city ? { city: payload.profile.city } : {}),
        })
      }
      toast.success("Profile saved")
    } catch {
      toast.error("Could not save your profile.")
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (deleteConfirm !== "DELETE") {
      toast.error("Type DELETE to confirm.")
      return
    }
    setDeleting(true)
    try {
      const response = await fetch("/api/profile", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      })
      const payload = (await response.json()) as { ok?: boolean; reason?: string }
      if (!response.ok) {
        toast.error(payload.reason ?? "Could not delete your account.")
        return
      }
      setDeleteOpen(false)
      toast.success("Account deleted")
      await signOut()
      router.replace("/")
      router.refresh()
    } catch {
      toast.error("Could not delete your account.")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <ProfileSkeleton />

  return (
    <>
      <Card>
        <CardHeader>
          <CardDescription>
            Your display name and photo are shown on your ads and in messages.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar size="lg" className="size-16">
              {avatarPreview ? <AvatarImage src={avatarPreview} alt="" /> : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => void onPickAvatar(event.target.files?.[0])}
              />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                Change photo
              </Button>
              {avatarPreview ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setAvatarPreview(null)
                    setAvatarDataUrl(null)
                    setRemoveAvatar(true)
                  }}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="display-name">Display name</Label>
            <Input
              id="display-name"
              value={displayName}
              autoComplete="nickname"
              aria-invalid={Boolean(errors.displayName)}
              aria-describedby={errors.displayName ? "display-name-error" : undefined}
              onChange={(event) => {
                setDisplayName(event.target.value)
                setErrors((current) => ({ ...current, displayName: undefined }))
              }}
            />
            {errors.displayName ? (
              <p id="display-name-error" className="text-sm text-destructive">
                {errors.displayName}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="profile-country">Country</Label>
              <Select
                value={countryCode || undefined}
                onValueChange={(value) => {
                  setCountryCode(value)
                  setCity("")
                  setErrors((current) => ({ ...current, country: undefined, city: undefined }))
                }}
              >
                <SelectTrigger id="profile-country" className="w-full" aria-invalid={Boolean(errors.country)}>
                  <SelectValue placeholder="Choose country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.country ? <p className="text-sm text-destructive">{errors.country}</p> : null}
            </div>
            <div className="grid gap-2">
              <Label>City</Label>
              {countryCode ? (
                <CityField
                  country={countryCode}
                  city={city}
                  onCityChange={(value) => {
                    setCity(value)
                    setErrors((current) => ({ ...current, city: undefined }))
                  }}
                  onPlace={() => undefined}
                />
              ) : (
                <Input disabled placeholder="Choose a country first" aria-disabled="true" />
              )}
              {errors.city ? <p className="text-sm text-destructive">{errors.city}</p> : null}
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button type="button" disabled={!dirty || saving} onClick={() => void saveProfile()}>
            {saving ? <Loader2 className="animate-spin" /> : null}
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Sign-in email for this account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="account-email">Email</Label>
            <Input id="account-email" value={email ?? ""} readOnly aria-readonly="true" />
          </div>
          {sinceYear ? (
            <p className="text-sm text-muted-foreground">Member since {sinceYear}</p>
          ) : null}
        </CardContent>
        <CardFooter className="justify-between gap-2">
          <Button type="button" variant="outline" onClick={() => void signOut()}>
            Sign out
          </Button>
        </CardFooter>
      </Card>

      <Card className="ring-destructive/20">
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>
            Permanently delete your account, ads, and messages. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
            Delete account
          </Button>
        </CardFooter>
      </Card>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open)
          if (!open) setDeleteConfirm("")
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account?</DialogTitle>
            <DialogDescription>
              Your ads, saved items, and conversations will be removed. Type DELETE to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="delete-confirm">Confirmation</Label>
            <Input
              id="delete-confirm"
              value={deleteConfirm}
              autoComplete="off"
              onChange={(event) => setDeleteConfirm(event.target.value)}
              placeholder="DELETE"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting || deleteConfirm !== "DELETE"}
              onClick={() => void confirmDelete()}
            >
              {deleting ? <Loader2 className="animate-spin" /> : null}
              {deleting ? "Deleting…" : "Delete account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ProfileSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="size-16 rounded-full" />
            <Skeleton className="h-8 w-28" />
          </div>
          <Skeleton className="h-8 w-full" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
      <span className="sr-only">Loading profile</span>
    </div>
  )
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the file."))
    reader.readAsDataURL(file)
  })
}
