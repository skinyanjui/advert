"use client"

import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { AccountSettingsNav } from "@/components/account-settings-nav"
import { CityField } from "@/components/city-field"
import { ContactPhoneField } from "@/components/contact-phone-field"
import { EmptyPanel } from "@/components/empty-panel"
import { FormField } from "@/components/form-field"
import { LanguageCurrencyFields } from "@/components/language-currency-fields"
import { usePrefs } from "@/components/prefs-provider"
import { KeepAdsPrompt } from "@/components/sign-in-form"
import { ThemeChoices } from "@/components/theme-choices"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/lib/auth"
import { contactPhoneError } from "@/lib/contact-phone"
import { canonicalCountry, countries } from "@/lib/countries"
import { writeHomePlace } from "@/lib/home-place"
import { useMarketplace } from "@/lib/marketplace"
import { passwordError, passwordStrength, passwordStrengthLabel, passwordsMatchError } from "@/lib/password"
import { avatarFileError, cityError, displayNameError, memberSinceYear, type BoardProfile } from "@/lib/profile"

export function AccountPage() {
  const auth = useAuth()
  const { t } = usePrefs()
  const { admin } = useMarketplace()
  const isAdmin = auth.signedIn && admin

  return (
    <div data-mobile-form-surface className="mx-auto w-full max-w-6xl px-3 py-5 md:px-6 md:py-8">
      <header className="mb-5 border-b border-border pb-5 md:mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Account</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Settings</h1>
        {auth.ready ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {auth.signedIn ? `Manage your profile, preferences, security, and privacy${auth.email ? ` for ${auth.email}` : ""}.` : t("profile.guestBlurb")}
          </p>
        ) : null}
      </header>

      {!auth.ready ? (
        <ProfileSkeleton />
      ) : !auth.signedIn ? (
        <div className="space-y-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>{t("prefs.sectionBody")}</CardDescription>
            </CardHeader>
            <CardContent><LanguageCurrencyFields /></CardContent>
          </Card>
          <EmptyPanel title={t("profile.signInTitle")} body={t("profile.signInBody")} actionHref="/sign-in" actionLabel={t("nav.signIn")} className="mt-0">
            <KeepAdsPrompt className="mx-auto mt-4 max-w-sm rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm text-amber-950" />
          </EmptyPanel>
        </div>
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
        <section className="mt-8 border-t border-border pt-6" aria-labelledby="admin-tools-title">
          <div className="mb-3">
            <h2 id="admin-tools-title" className="text-sm font-semibold">Administration</h2>
            <p className="mt-1 text-sm text-muted-foreground">Operational tools are separate from personal account settings.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link href="/admin/promotions">Featured promotions</Link></Button>
            <Button asChild variant="outline"><Link href="/admin/reports">{t("profile.reports")}</Link></Button>
            <Button asChild variant="outline"><Link href="/admin/privacy">{t("profile.privacyRequestsAdmin")}</Link></Button>
            <Button asChild variant="outline"><Link href="/admin/compliance">{t("profile.complianceAdmin")}</Link></Button>
            <Button asChild variant="outline"><Link href="/admin/moderation-appeals">Moderation appeals</Link></Button>
            <Button asChild variant="outline"><Link href="/admin/incidents">Compliance incidents</Link></Button>
          </div>
        </section>
      ) : null}
    </div>
  )
}

function SignedInProfile({ email, pendingEmail, createdAt, signOut, signOutAll, updatePassword, updateEmail }: {
  email: string | null
  pendingEmail: string | null
  createdAt: string | null
  signOut: () => Promise<void>
  signOutAll: () => Promise<void>
  updatePassword: (password: string, nonce?: string) => Promise<{ ok: true } | { ok: false; reason: string; needsReauth?: boolean }>
  updateEmail: (email: string) => Promise<{ ok: true } | { ok: false; reason: string }>
}) {
  const { t } = usePrefs()
  const router = useRouter()
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
  const [errors, setErrors] = useState<{ displayName?: string; city?: string; country?: string; phone?: string }>({})
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [downloadingData, setDownloadingData] = useState(false)
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
          toast.error(payload.reason ?? "Could not load your profile.")
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
        toast.error("Could not load your profile.")
        setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  const sinceYear = memberSinceYear(profile?.createdAt ?? createdAt)
  const initials = (displayName.trim() || email || "?").slice(0, 2).toUpperCase()
  const dirty = Boolean(profile) && (displayName.trim() !== (profile?.displayName ?? "") || city.trim() !== (profile?.city ?? "") || (countryCode || "") !== (profile?.countryCode ?? "") || avatarDataUrl !== null || removeAvatar)
  const contactDirty = Boolean(profile) && phone.trim() !== (profile?.phone ?? "")

  async function onPickAvatar(file: File | undefined) {
    if (!file) return
    const reason = avatarFileError(file)
    if (reason) { toast.error(reason); return }
    const dataUrl = await readFileAsDataUrl(file)
    setAvatarDataUrl(dataUrl)
    setAvatarPreview(dataUrl)
    setRemoveAvatar(false)
  }

  async function saveProfile() {
    const nameReason = displayNameError(displayName)
    const placeReason = cityError(city)
    const countryReason = city.trim() && !countryCode ? "Choose a country for your city." : undefined
    setErrors({ displayName: nameReason, city: placeReason, country: countryReason })
    if (nameReason || placeReason || countryReason) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = { displayName: displayName.trim(), city: city.trim() || null, countryCode: countryCode ? canonicalCountry(countryCode) ?? null : null }
      if (avatarDataUrl) body.avatarUrl = avatarDataUrl
      else if (removeAvatar) body.avatarUrl = null
      const response = await fetch("/api/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
      const payload = (await response.json()) as { ok?: boolean; profile?: BoardProfile; reason?: string }
      if (!response.ok || !payload.profile) { toast.error(payload.reason ?? "Could not save your profile."); return }
      setProfile(payload.profile)
      setDisplayName(payload.profile.displayName ?? "")
      setCity(payload.profile.city ?? "")
      setCountryCode(payload.profile.countryCode ?? "")
      setAvatarPreview(payload.profile.avatarUrl)
      setAvatarDataUrl(null)
      setRemoveAvatar(false)
      if (payload.profile.countryCode) writeHomePlace({ country: payload.profile.countryCode, ...(payload.profile.city ? { city: payload.profile.city } : {}) })
      toast.success("Profile saved")
    } catch { toast.error("Could not save your profile.") } finally { setSaving(false) }
  }

  async function saveContact() {
    const phoneReason = contactPhoneError(phone, { required: false })
    setErrors((current) => ({ ...current, phone: phoneReason }))
    if (phoneReason) return
    setSavingContact(true)
    try {
      const response = await fetch("/api/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: phone.trim() || null }) })
      const payload = (await response.json()) as { ok?: boolean; profile?: BoardProfile; reason?: string }
      if (!response.ok || !payload.profile) { toast.error(payload.reason ?? t("profile.toast.contactError")); return }
      setProfile(payload.profile)
      setPhone(payload.profile.phone ?? "")
      toast.success(t("profile.toast.contactSaved"))
    } catch { toast.error(t("profile.toast.contactError")) } finally { setSavingContact(false) }
  }

  async function downloadPrivacyData() {
    if (downloadingData) return
    setDownloadingData(true)
    try {
      const response = await fetch("/api/privacy/export", { cache: "no-store" })
      if (!response.ok) { const payload = (await response.json().catch(() => ({}))) as { reason?: string }; toast.error(payload.reason ?? t("profile.downloadError")); return }
      const blob = await response.blob()
      const disposition = response.headers.get("content-disposition") ?? ""
      const match = /filename="([^"]+)"/i.exec(disposition)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = match?.[1] ?? "account-data.json"
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url)
    } catch { toast.error(t("profile.downloadError")) } finally { setDownloadingData(false) }
  }

  async function confirmDelete() {
    if (deleteConfirm !== "DELETE") { toast.error("Type DELETE to confirm."); return }
    setDeleting(true)
    try {
      const response = await fetch("/api/profile", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm: "DELETE" }) })
      const payload = (await response.json()) as { ok?: boolean; reason?: string; authDeleted?: boolean }
      if (!response.ok) {
        if (payload.authDeleted) {
          toast.error(payload.reason ?? "Your account was deleted, but some data couldn't be cleaned up. We'll remove it.")
          setDeleteOpen(false); await signOut(); router.replace("/"); router.refresh(); return
        }
        toast.error(payload.reason ?? "Could not delete your account."); return
      }
      setDeleteOpen(false); toast.success("Account deleted"); await signOut(); router.replace("/"); router.refresh()
    } catch { toast.error("Could not delete your account.") } finally { setDeleting(false) }
  }

  async function saveEmail() {
    setSavingEmail(true)
    const result = await updateEmail(newEmail)
    setSavingEmail(false)
    if (!result.ok) { toast.error(result.reason); return }
    setNewEmail("")
    toast.success("Confirm the new email from your inbox")
  }

  async function savePassword() {
    const reason = passwordError(newPassword) ?? passwordsMatchError(newPassword, confirmPassword)
    if (reason) { toast.error(reason); return }
    if (needsPasswordReauth && !passwordNonce.trim()) { toast.error("Enter the verification code from your email."); return }
    setSavingPassword(true)
    const result = await updatePassword(newPassword, needsPasswordReauth ? passwordNonce.trim() : undefined)
    setSavingPassword(false)
    if (!result.ok) {
      if (result.needsReauth) { setNeedsPasswordReauth(true); toast.message("Check your email for a verification code, then enter it below.") }
      toast.error(result.reason); return
    }
    setNewPassword(""); setConfirmPassword(""); setPasswordNonce(""); setNeedsPasswordReauth(false); toast.success("Password saved")
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
      <div className="grid items-start gap-6 md:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
        <aside>
          <AccountSettingsNav />
        </aside>

        <div className="min-w-0 space-y-8">
          <section id="profile" className="scroll-mt-28 space-y-3" aria-labelledby="profile-section-title">
            <div>
              <h2 id="profile-section-title" className="text-lg font-semibold tracking-tight">Profile</h2>
              <p className="mt-1 text-sm text-muted-foreground">How you appear to people and how buyers can reach you.</p>
            </div>
            <Card>
              <CardContent className="space-y-5 pt-(--card-spacing)">
                <div className="flex flex-wrap items-center gap-4">
                  <Avatar size="lg" className="size-16">{avatarPreview ? <AvatarImage src={avatarPreview} alt="" /> : null}<AvatarFallback>{initials}</AvatarFallback></Avatar>
                  <div className="flex min-w-0 flex-wrap gap-2">
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void onPickAvatar(event.target.files?.[0])} />
                    <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>Change photo</Button>
                    {avatarPreview ? <Button type="button" variant="ghost" onClick={() => { setAvatarPreview(null); setAvatarDataUrl(null); setRemoveAvatar(true) }}>Remove</Button> : null}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="display-name">Display name</Label>
                  <Input id="display-name" value={displayName} autoComplete="nickname" aria-invalid={Boolean(errors.displayName)} aria-describedby={errors.displayName ? "display-name-error" : undefined} onChange={(event) => { setDisplayName(event.target.value); setErrors((current) => ({ ...current, displayName: undefined })) }} />
                  {errors.displayName ? <p id="display-name-error" className="text-sm text-destructive">{errors.displayName}</p> : null}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="profile-country">Country</Label>
                    <Select value={countryCode || undefined} onValueChange={(value) => { setCountryCode(value); setCity(""); setErrors((current) => ({ ...current, country: undefined, city: undefined })) }}>
                      <SelectTrigger id="profile-country" className="w-full" aria-invalid={Boolean(errors.country)}><SelectValue placeholder="Choose country" /></SelectTrigger>
                      <SelectContent>{countries.map((country) => <SelectItem key={country.code} value={country.code}>{country.name}</SelectItem>)}</SelectContent>
                    </Select>
                    {errors.country ? <p className="text-sm text-destructive">{errors.country}</p> : null}
                  </div>
                  <div className="grid gap-2">
                    <Label>City</Label>
                    {countryCode ? <CityField country={countryCode} city={city} onCityChange={(value) => { setCity(value); setErrors((current) => ({ ...current, city: undefined })) }} onPlace={() => undefined} /> : <Input disabled placeholder="Choose a country first" aria-disabled="true" />}
                    {errors.city ? <p className="text-sm text-destructive">{errors.city}</p> : null}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-between gap-3">
                <p className="text-xs text-muted-foreground" aria-live="polite">{dirty ? "Unsaved profile changes" : "Profile is up to date"}</p>
                <Button type="button" disabled={!dirty || saving} onClick={() => void saveProfile()}>{saving ? <Loader2 className="animate-spin" /> : null}{saving ? "Saving…" : "Save profile"}</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader><CardTitle>{t("profile.buyerContact")}</CardTitle><CardDescription>{t("profile.buyerContactBody")}</CardDescription></CardHeader>
              <CardContent><ContactPhoneField id="buyer-contact-phone" value={phone} countryCode={countryCode || null} error={errors.phone} hint={t("profile.buyerContactHint")} onChange={(value) => { setPhone(value); setErrors((current) => ({ ...current, phone: undefined })) }} /></CardContent>
              <CardFooter className="justify-between gap-3"><p className="text-xs text-muted-foreground" aria-live="polite">{contactDirty ? "Unsaved contact change" : "Contact is up to date"}</p><Button type="button" disabled={!contactDirty || savingContact} onClick={() => void saveContact()}>{savingContact ? <Loader2 className="animate-spin" /> : null}{savingContact ? "Saving…" : "Save contact"}</Button></CardFooter>
            </Card>
          </section>

          <section id="preferences" className="scroll-mt-28 space-y-3" aria-labelledby="preferences-section-title">
            <div><h2 id="preferences-section-title" className="text-lg font-semibold tracking-tight">Preferences</h2><p className="mt-1 text-sm text-muted-foreground">Choose how the marketplace looks and formats information.</p></div>
            <Card size="sm"><CardContent className="space-y-5 pt-(--card-spacing)"><div className="space-y-2"><Label>Appearance</Label><ThemeChoices /></div><LanguageCurrencyFields /></CardContent></Card>
          </section>

          <section id="security" className="scroll-mt-28 space-y-3" aria-labelledby="security-section-title">
            <div><h2 id="security-section-title" className="text-lg font-semibold tracking-tight">Security</h2><p className="mt-1 text-sm text-muted-foreground">Manage sign-in details, password, and active sessions.</p></div>
            <Card>
              <CardHeader><CardTitle>Email and sessions</CardTitle><CardDescription>Your sign-in email and session controls.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2"><Label htmlFor="account-email">Current email</Label><Input id="account-email" value={email ?? ""} readOnly aria-readonly="true" /></div>
                {pendingEmail ? <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">Pending confirmation for <span className="font-medium">{pendingEmail}</span>. Check that inbox and your current email if secure email change is enabled.</p> : null}
                <FormField label="New email" htmlFor="account-new-email" hint="We’ll send a confirmation link before the change takes effect."><Input id="account-new-email" type="email" autoComplete="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="new@example.com" /></FormField>
                {sinceYear ? <p className="text-sm text-muted-foreground">Member since {sinceYear}</p> : null}
              </CardContent>
              <CardFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => void signOut()}>Sign out</Button><Button type="button" variant="ghost" disabled={signingOutAll} onClick={() => void onSignOutAll()}>{signingOutAll ? <Loader2 className="animate-spin" /> : null}Sign out of all devices</Button></div>
                <Button type="button" disabled={!newEmail.trim() || savingEmail} onClick={() => void saveEmail()}>{savingEmail ? <Loader2 className="animate-spin" /> : null}{savingEmail ? "Sending…" : "Change email"}</Button>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader><CardTitle>Password</CardTitle><CardDescription>Add or change a password. Email-link sign-in remains available.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                <FormField label="New password" htmlFor="account-password" hint={passwordHint}><Input id="account-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></FormField>
                <FormField label="Confirm password" htmlFor="account-password-confirm"><Input id="account-password-confirm" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></FormField>
                {needsPasswordReauth ? <FormField label="Email verification code" htmlFor="account-password-nonce" hint="Sent to your current email when secure password change is enabled."><Input id="account-password-nonce" inputMode="numeric" autoComplete="one-time-code" value={passwordNonce} onChange={(event) => setPasswordNonce(event.target.value)} /></FormField> : null}
              </CardContent>
              <CardFooter className="justify-end"><Button type="button" disabled={!newPassword || savingPassword} onClick={() => void savePassword()}>{savingPassword ? <Loader2 className="animate-spin" /> : null}{savingPassword ? "Saving…" : needsPasswordReauth ? "Confirm and save" : "Save password"}</Button></CardFooter>
            </Card>
          </section>

          <section id="privacy" className="scroll-mt-28 space-y-3" aria-labelledby="privacy-section-title">
            <div><h2 id="privacy-section-title" className="text-lg font-semibold tracking-tight">Privacy</h2><p className="mt-1 text-sm text-muted-foreground">Control your data, privacy choices, and moderation records.</p></div>
            <Card>
              <CardContent className="divide-y divide-border p-0">
                <SettingsAction title={t("profile.downloadData")} description="Download a copy of your account data."><Button type="button" variant="outline" disabled={downloadingData} onClick={() => void downloadPrivacyData()}>{downloadingData ? <Loader2 className="animate-spin" /> : null}{downloadingData ? t("profile.downloadingData") : t("profile.downloadData")}</Button></SettingsAction>
                <SettingsAction title={t("profile.privacyChoices")} description="Review privacy and data-use choices."><Button type="button" variant="ghost" asChild><Link href="/privacy/choices" aria-label={`Open ${t("profile.privacyChoices")}`}>Open</Link></Button></SettingsAction>
                <SettingsAction title={t("profile.privacyRequest")} description="Submit an access, correction, or deletion request."><Button type="button" variant="ghost" asChild><Link href="/privacy/request" aria-label={`Open ${t("profile.privacyRequest")}`}>Open</Link></Button></SettingsAction>
                <SettingsAction title="Moderation decisions" description="Review moderation actions and available appeals."><Button type="button" variant="ghost" asChild><Link href="/account/moderation" aria-label="Open moderation decisions">Open</Link></Button></SettingsAction>
              </CardContent>
            </Card>
          </section>

          <section id="account-management" className="scroll-mt-28 space-y-3 border-t border-border pt-7" aria-labelledby="account-management-title">
            <div><h2 id="account-management-title" className="text-lg font-semibold tracking-tight">Account management</h2><p className="mt-1 text-sm text-muted-foreground">Permanent account actions are kept separate from everyday settings.</p></div>
            <Card className="border-destructive/25">
              <CardHeader><CardTitle>Delete account</CardTitle><CardDescription>Permanently delete your account, ads, and messages. This cannot be undone.</CardDescription></CardHeader>
              <CardFooter><Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>Delete account</Button></CardFooter>
            </Card>
          </section>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={(open) => { setDeleteOpen(open); if (!open) setDeleteConfirm("") }}>
        <DialogContent data-mobile-form-surface>
          <DialogHeader><DialogTitle>Delete account?</DialogTitle><DialogDescription>Your account, ads, saved items, conversations, submitted reports, authenticated contact events, and account-linked WhatsApp consent records will be removed from active application data. Narrow privacy-request case records may be retained when reasonably needed to document request handling or satisfy legal obligations. Provider backups may persist for their limited backup-retention period. Type DELETE to confirm.</DialogDescription></DialogHeader>
          <div className="grid gap-2"><Label htmlFor="delete-confirm">Confirmation</Label><Input id="delete-confirm" value={deleteConfirm} autoComplete="off" onChange={(event) => setDeleteConfirm(event.target.value)} placeholder="DELETE" /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button><Button type="button" variant="destructive" disabled={deleting || deleteConfirm !== "DELETE"} onClick={() => void confirmDelete()}>{deleting ? <Loader2 className="animate-spin" /> : null}{deleting ? "Deleting…" : "Delete account"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function SettingsAction({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-sm font-medium text-foreground">{title}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p></div><div className="shrink-0">{children}</div></div>
}

function ProfileSkeleton() {
  return <div className="grid gap-6 md:grid-cols-[13rem_minmax(0,1fr)]" aria-busy="true" aria-live="polite"><div className="hidden md:block"><Skeleton className="h-44 w-full" /></div><div className="space-y-4"><Card><CardHeader><Skeleton className="h-4 w-40" /></CardHeader><CardContent className="space-y-4"><div className="flex items-center gap-4"><Skeleton className="size-16 rounded-full" /><Skeleton className="h-8 w-28" /></div><Skeleton className="h-11 w-full" /><div className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-full" /></div></CardContent></Card><span className="sr-only">Loading settings</span></div></div>
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the file."))
    reader.readAsDataURL(file)
  })
}
