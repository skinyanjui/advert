"use client"

import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { CityField } from "@/components/city-field"
import { ContactPhoneField } from "@/components/contact-phone-field"
import { EmptyPanel } from "@/components/empty-panel"
import { FormField } from "@/components/form-field"
import { LanguageCurrencyFields } from "@/components/language-currency-fields"
import { usePrefs } from "@/components/prefs-provider"
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
import { useAuth } from "@/lib/auth"
import { canonicalCountry, countries } from "@/lib/countries"
import { writeHomePlace } from "@/lib/home-place"
import { useMarketplace } from "@/lib/marketplace"
import { contactPhoneError } from "@/lib/contact-phone"
import {
  passwordError,
  passwordStrength,
  passwordStrengthLabel,
  passwordsMatchError,
} from "@/lib/password"
import {
  avatarFileError,
  cityError,
  displayNameError,
  memberSinceYear,
  type BoardProfile,
} from "@/lib/profile"

export function AccountPage() {
  const auth = useAuth()
  const { t } = usePrefs()
  const { admin } = useMarketplace()
  const isAdmin = auth.signedIn && admin

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 md:px-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("profile.title")}</h1>
        {auth.ready ? (
          auth.signedIn ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {t("profile.signedInAs", { email: auth.email ?? "" })}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              {t("profile.guestBlurb")}
            </p>
          )
        ) : null}
      </header>

      {!auth.ready ? (
        <ProfileSkeleton />
      ) : !auth.signedIn ? (
        <>
          <Card size="sm">
            <CardHeader>
              <CardTitle>{t("profile.languageCurrencyTitle")}</CardTitle>
              <CardDescription>
                {t("profile.languageCurrencyGuestBody")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LanguageCurrencyFields />
            </CardContent>
          </Card>
          <EmptyPanel
            title={t("profile.signInTitle")}
            body={t("profile.signInBody")}
            actionHref="/sign-in"
            actionLabel={t("auth.signIn")}
            className="mt-0"
          >
            <KeepAdsPrompt className="mx-auto mt-4 max-w-sm rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm text-amber-950" />
          </EmptyPanel>
        </>
      ) : (
        <SignedInProfile
          email={auth.email}
          pendingEmail={auth.pendingEmail}
          createdAt={auth.user?.created_at ?? null}
          signOut={() => auth.signOut()}
          signOutAll={() => auth.signOutAll()}
          updatePassword={(password, nonce) => auth.updatePassword(password, nonce)}
          updateEmail={(email) => auth.updateEmail(email)}
        />
      )}

      {isAdmin ? (
        <Card size="sm">
          <CardContent className="pt-(--card-spacing)">
            <Button asChild variant="outline">
              <Link href="/admin/reports">{t("profile.reports")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function SignedInProfile({
  email,
  pendingEmail,
  createdAt,
  signOut,
  signOutAll,
  updatePassword,
  updateEmail,
}: {
  email: string | null
  pendingEmail: string | null
  createdAt: string | null
  signOut: () => Promise<void>
  signOutAll: () => Promise<void>
  updatePassword: (
    password: string,
    nonce?: string,
  ) => Promise<{ ok: true } | { ok: false; reason: string; needsReauth?: boolean }>
  updateEmail: (email: string) => Promise<{ ok: true } | { ok: false; reason: string }>
}) {
  const router = useRouter()
  const { t } = usePrefs()
  const fileRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState<BoardProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingContact, setSavingContact] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [city, setCity] = useState("")
  const [countryCode, setCountryCode] = useState<string>("")
  const [phone, setPhone] = useState("")
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [errors, setErrors] = useState<{
    displayName?: string
    city?: string
    country?: string
    phone?: string
  }>({})
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [savingEmail, setSavingEmail] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordNonce, setPasswordNonce] = useState("")
  const [needsPasswordReauth, setNeedsPasswordReauth] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [signingOutAll, setSigningOutAll] = useState(false)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" })
        const payload = (await response.json()) as { ok?: boolean; profile?: BoardProfile; reason?: string }
        if (!active) return
        if (!response.ok || !payload.profile) {
          toast.error(payload.reason ?? t("profile.toast.loadError"))
          setLoading(false)
          return
        }
        setProfile(payload.profile)
        setDisplayName(payload.profile.displayName ?? "")
        setCity(payload.profile.city ?? "")
        setCountryCode(payload.profile.countryCode ?? "")
        setPhone(payload.profile.phone ?? "")
        setAvatarPreview(payload.profile.avatarUrl)
        setLoading(false)
      } catch {
        if (!active) return
        toast.error(t("profile.toast.loadError"))
        setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [t])

  const sinceYear = memberSinceYear(profile?.createdAt ?? createdAt)
  const initials = (displayName.trim() || email || "?").slice(0, 2).toUpperCase()
  const dirty =
    Boolean(profile) &&
    (displayName.trim() !== (profile?.displayName ?? "") ||
      city.trim() !== (profile?.city ?? "") ||
      (countryCode || "") !== (profile?.countryCode ?? "") ||
      avatarDataUrl !== null ||
      removeAvatar)
  const contactDirty = Boolean(profile) && phone.trim() !== (profile?.phone ?? "")

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
      city.trim() && !countryCode ? t("profile.countryRequiredForCity") : undefined
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
        toast.error(payload.reason ?? t("profile.toast.saveError"))
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
      toast.success(t("profile.toast.saved"))
    } catch {
      toast.error(t("profile.toast.saveError"))
    } finally {
      setSaving(false)
    }
  }

  async function saveContact() {
    const phoneReason = contactPhoneError(phone, { required: false })
    setErrors((current) => ({ ...current, phone: phoneReason }))
    if (phoneReason) return

    setSavingContact(true)
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() || null }),
      })
      const payload = (await response.json()) as { ok?: boolean; profile?: BoardProfile; reason?: string }
      if (!response.ok || !payload.profile) {
        toast.error(payload.reason ?? t("profile.toast.contactError"))
        return
      }
      setProfile(payload.profile)
      setPhone(payload.profile.phone ?? "")
      toast.success(t("profile.toast.contactSaved"))
    } catch {
      toast.error(t("profile.toast.contactError"))
    } finally {
      setSavingContact(false)
    }
  }

  async function confirmDelete() {
    if (deleteConfirm !== "DELETE") {
      toast.error(t("profile.toast.typeDelete"))
      return
    }
    setDeleting(true)
    try {
      const response = await fetch("/api/profile", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      })
      const payload = (await response.json()) as {
        ok?: boolean
        reason?: string
        authDeleted?: boolean
      }
      if (!response.ok) {
        // Auth user may already be gone — clear local session either way when flagged.
        if (payload.authDeleted) {
          toast.error(
            payload.reason ??
              t("profile.toast.partialDelete"),
          )
          setDeleteOpen(false)
          await signOut()
          router.replace("/")
          router.refresh()
          return
        }
        toast.error(payload.reason ?? t("profile.toast.deleteError"))
        return
      }
      setDeleteOpen(false)
      toast.success(t("profile.toast.deleted"))
      await signOut()
      router.replace("/")
      router.refresh()
    } catch {
      toast.error(t("profile.toast.deleteError"))
    } finally {
      setDeleting(false)
    }
  }

  async function saveEmail() {
    setSavingEmail(true)
    const result = await updateEmail(newEmail)
    setSavingEmail(false)
    if (!result.ok) {
      toast.error(result.reason)
      return
    }
    setNewEmail("")
    toast.success(t("profile.toast.emailConfirm"))
  }

  async function savePassword() {
    const reason = passwordError(newPassword) ?? passwordsMatchError(newPassword, confirmPassword)
    if (reason) {
      toast.error(reason)
      return
    }
    if (needsPasswordReauth && !passwordNonce.trim()) {
      toast.error(t("profile.toast.enterCode"))
      return
    }
    setSavingPassword(true)
    const result = await updatePassword(
      newPassword,
      needsPasswordReauth ? passwordNonce.trim() : undefined,
    )
    setSavingPassword(false)
    if (!result.ok) {
      if (result.needsReauth) {
        setNeedsPasswordReauth(true)
        toast.message(t("profile.toast.checkCode"))
      }
      toast.error(result.reason)
      return
    }
    setNewPassword("")
    setConfirmPassword("")
    setPasswordNonce("")
    setNeedsPasswordReauth(false)
    toast.success(t("profile.toast.passwordSaved"))
  }

  async function onSignOutAll() {
    setSigningOutAll(true)
    await signOutAll()
    setSigningOutAll(false)
    router.replace("/")
    router.refresh()
  }

  if (loading) return <ProfileSkeleton />

  const passwordHint = newPassword ? passwordStrengthLabel(passwordStrength(newPassword)) : undefined

  return (
    <>
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("profile.languageCurrencyTitle")}</CardTitle>
          <CardDescription>
            {t("profile.languageCurrencyBody")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LanguageCurrencyFields />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>
            {t("profile.displayHint")}
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
                {t("profile.changePhoto")}
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
                  {t("profile.removePhoto")}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="display-name">{t("profile.displayName")}</Label>
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
              <Label htmlFor="profile-country">{t("profile.country")}</Label>
              <Select
                value={countryCode || undefined}
                onValueChange={(value) => {
                  setCountryCode(value)
                  setCity("")
                  setErrors((current) => ({ ...current, country: undefined, city: undefined }))
                }}
              >
                <SelectTrigger id="profile-country" className="w-full" aria-invalid={Boolean(errors.country)}>
                  <SelectValue placeholder={t("profile.chooseCountry")} />
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
              <Label>{t("profile.city")}</Label>
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
                <Input disabled placeholder={t("profile.chooseCountryFirst")} aria-disabled="true" />
              )}
              {errors.city ? <p className="text-sm text-destructive">{errors.city}</p> : null}
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button type="button" disabled={!dirty || saving} onClick={() => void saveProfile()}>
            {saving ? <Loader2 className="animate-spin" /> : null}
            {saving ? t("profile.saving") : t("profile.saveChanges")}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("profile.buyerContact")}</CardTitle>
          <CardDescription>
            {t("profile.buyerContactBody")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ContactPhoneField
            id="buyer-contact-phone"
            value={phone}
            countryCode={countryCode || null}
            error={errors.phone}
            hint={t("profile.buyerContactHint")}
            onChange={(value) => {
              setPhone(value)
              setErrors((current) => ({ ...current, phone: undefined }))
            }}
          />
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button
            type="button"
            disabled={!contactDirty || savingContact}
            onClick={() => void saveContact()}
          >
            {savingContact ? <Loader2 className="animate-spin" /> : null}
            {savingContact ? t("profile.saving") : t("profile.saveContact")}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("profile.account")}</CardTitle>
          <CardDescription>{t("profile.accountBody")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="account-email">{t("profile.email")}</Label>
            <Input id="account-email" value={email ?? ""} readOnly aria-readonly="true" />
          </div>
          {pendingEmail ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
              {t("profile.pendingEmail", { email: pendingEmail })}
            </p>
          ) : null}
          <FormField
            label={t("profile.newEmail")}
            htmlFor="account-new-email"
            hint={t("profile.newEmailHint")}
          >
            <Input
              id="account-new-email"
              type="email"
              autoComplete="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              placeholder="new@example.com"
            />
          </FormField>
          {sinceYear ? (
            <p className="text-sm text-muted-foreground" suppressHydrationWarning>
              {t("profile.memberSince", { year: sinceYear })}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="flex-wrap justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => void signOut()}>
              {t("auth.signOut")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={signingOutAll}
              onClick={() => void onSignOutAll()}
            >
              {signingOutAll ? <Loader2 className="animate-spin" /> : null}
              {t("profile.signOutAll")}
            </Button>
          </div>
          <Button
            type="button"
            disabled={!newEmail.trim() || savingEmail}
            onClick={() => void saveEmail()}
          >
            {savingEmail ? <Loader2 className="animate-spin" /> : null}
            {savingEmail ? t("profile.sending") : t("profile.changeEmail")}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("profile.password")}</CardTitle>
          <CardDescription>
            {t("profile.passwordBody")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <FormField label={t("profile.newPassword")} htmlFor="account-password" hint={passwordHint}>
            <Input
              id="account-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </FormField>
          <FormField label={t("profile.confirmPassword")} htmlFor="account-password-confirm">
            <Input
              id="account-password-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </FormField>
          {needsPasswordReauth ? (
            <FormField
              label={t("profile.verificationCode")}
              htmlFor="account-password-nonce"
              hint={t("profile.verificationCodeHint")}
            >
              <Input
                id="account-password-nonce"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={passwordNonce}
                onChange={(event) => setPasswordNonce(event.target.value)}
              />
            </FormField>
          ) : null}
        </CardContent>
        <CardFooter className="justify-end">
          <Button
            type="button"
            disabled={!newPassword || savingPassword}
            onClick={() => void savePassword()}
          >
            {savingPassword ? <Loader2 className="animate-spin" /> : null}
            {savingPassword ? t("profile.saving") : needsPasswordReauth ? t("profile.confirmAndSave") : t("profile.savePassword")}
          </Button>
        </CardFooter>
      </Card>

      <Card className="ring-destructive/20">
        <CardHeader>
          <CardTitle>{t("profile.dangerZone")}</CardTitle>
          <CardDescription>
            {t("profile.dangerZoneBody")}
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
            {t("profile.deleteAccount")}
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
            <DialogTitle>{t("profile.deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("profile.deleteConfirmBody")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="delete-confirm">{t("profile.deleteConfirmLabel")}</Label>
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
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting || deleteConfirm !== "DELETE"}
              onClick={() => void confirmDelete()}
            >
              {deleting ? <Loader2 className="animate-spin" /> : null}
              {deleting ? t("profile.deleting") : t("profile.deleteAccount")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ProfileSkeleton() {
  const { t } = usePrefs()
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
      <span className="sr-only">{t("profile.loading")}</span>
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
