"use client"

import type { User } from "@supabase/supabase-js"
import { Check, ChevronLeft, ChevronRight, ImagePlus } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react"
import { toast } from "sonner"

import { CityField, type ChosenPlace } from "@/components/city-field"
import { ContactPhoneField } from "@/components/contact-phone-field"
import { EmptyPanel } from "@/components/empty-panel"
import { FormField } from "@/components/form-field"
import { ListingCard } from "@/components/listing-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { readPostingPlace } from "@/lib/active-place"
import { useAuth } from "@/lib/auth"
import { signInHref } from "@/lib/auth-redirect"
import { categoryImage } from "@/lib/catalog"
import { categoryIcons } from "@/lib/categories"
import { resolvePlace } from "@/lib/cities"
import { normalizeContactPhone, prefillListingPhone } from "@/lib/contact-phone"
import { resolvePostingCountry } from "@/lib/posting-country"
import {
  canonicalCountry,
  countryName,
  currencyLabel,
  fold,
  getCountry,
  moreCountries,
  primaryCountries,
  type CountryRecord,
} from "@/lib/countries"
import { formatPrice } from "@/lib/format"
import { listingFieldErrors, type FieldErrors as RuleErrors } from "@/lib/listing-rules"
import { useMarketplace } from "@/lib/marketplace"
import { listingImages, maxListingPhotos, photoFileError, withCoverImage } from "@/lib/photos"
import { clearPostDraft, readPostDraft, writePostDraft } from "@/lib/post-draft"
import type { BoardProfile } from "@/lib/profile"
import { siteTitle } from "@/lib/site"
import {
  categoryPlan,
  findSubcategory,
  isPricePeriodId,
  periodForSuffix,
  postingPlans,
  pricePeriod,
  type DetailField,
  type PricePeriodId,
  type Subcategory,
} from "@/lib/posting"
import { categoryName, isCategoryId, type CategoryId, type Listing } from "@/lib/types"
import { cn } from "@/lib/utils"

const steps = ["Category", "Type", "Details", "Contact"] as const

type FieldErrors = RuleErrors

export function PostForm() {
  const searchParams = useSearchParams()
  const { listings, ready } = useMarketplace()
  const editId = searchParams.get("edit")?.trim() ?? ""
  if (!editId) return <AdForm existing={null} />
  if (!ready) return <p className="px-4 py-8 text-sm text-neutral-500">Loading your ad…</p>
  const existing = listings.find((item) => item.id === editId && item.mine)
  if (!existing) return <MissingAd />
  return <AdForm key={existing.id} existing={existing} />
}

function AdForm({ existing }: { existing: Listing | null }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlCountry = existing ? undefined : canonicalCountry(searchParams.get("country"))
  const startingCountry = existing
    ? (canonicalCountry(existing.country) ?? "")
    : (urlCountry ?? "")
  const startingCity = existing
    ? existing.city
    : urlCountry
      ? (searchParams.get("city") ?? "").trim().slice(0, 80)
      : ""
  const categoryParam = searchParams.get("category")
  const startingCategory = existing?.category ?? (isCategoryId(categoryParam) ? categoryParam : null)
  const seeded = existing
    ? findSubcategory(existing.category, existing.subcategory)
    : startingCategory
      ? findSubcategory(startingCategory, searchParams.get("type") ?? undefined)
      : undefined
  const { addListing, updateListing } = useMarketplace()
  const auth = useAuth()

  const [step, setStep] = useState(seeded ? 2 : startingCategory ? 1 : 0)
  const [category, setCategory] = useState<CategoryId | null>(startingCategory)
  const [subcategoryId, setSubcategoryId] = useState<string | null>(seeded?.id ?? null)
  const [title, setTitle] = useState(existing?.title ?? "")
  const [price, setPrice] = useState(existing ? String(existing.price) : "")
  const [period, setPeriod] = useState<PricePeriodId>(
    existing ? periodForSuffix(existing.priceSuffix, seeded?.periods ?? ["fixed"]) : (seeded?.periods[0] ?? "fixed"),
  )
  const [details, setDetails] = useState<Record<string, string>>({ ...(existing?.details ?? {}) })
  const [country, setCountry] = useState(startingCountry)
  const [currency, setCurrency] = useState(
    existing?.currency ?? getCountry(startingCountry)?.currencies[0]?.code ?? "USD",
  )
  const [city, setCity] = useState(startingCity)
  const [place, setPlace] = useState<ChosenPlace | null>(placeFromListing(existing))
  const [description, setDescription] = useState(existing?.description ?? "")
  const [phone, setPhone] = useState(existing?.phone ?? "")
  const [contactWhatsApp, setContactWhatsApp] = useState(existing?.contactWhatsApp !== false)
  const [contactPhone, setContactPhone] = useState(existing?.contactPhone !== false)
  const [sponsored, setSponsored] = useState(existing?.sponsored === true)
  const sponsoredLocked = existing?.sponsoredLocked === true
  const [photos, setPhotos] = useState<string[]>(existing ? listingImages(existing) : [])
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [draftUnlocked, setDraftUnlocked] = useState(false)
  const appliedPlace = useRef(false)
  const appliedProfile = useRef(Boolean(existing))
  const restoredDraft = useRef(false)
  const omittedPhotosToastShown = useRef(false)

  useLayoutEffect(() => {
    // Client-only: apply saved board/home place after hydration (no invented KE default).
    if (appliedPlace.current || existing || urlCountry || restoredDraft.current) return
    appliedPlace.current = true
    const saved = readPostingPlace()
    const nextCountry = resolvePostingCountry({
      urlCountry,
      savedPlaceCountry: saved.country,
    })
    if (!nextCountry) return
    /* eslint-disable react-hooks/set-state-in-effect -- hydrate saved place once on the client */
    setCountry(nextCountry)
    setCity(saved.city)
    setCurrency(getCountry(nextCountry)?.currencies[0]?.code ?? "USD")
    setPlace(locatedPlace(null, nextCountry, saved.city))
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [existing, urlCountry])

  useEffect(() => {
    if (existing || restoredDraft.current) return
    const draft = readPostDraft()
    if (!draft) return
    restoredDraft.current = true
    // Defer so restore is not a synchronous setState-in-effect cascade.
    const timer = window.setTimeout(() => {
      setDraftUnlocked(true)
      setStep(draft.step)
      setCategory(draft.category)
      setSubcategoryId(draft.subcategoryId)
      setTitle(draft.title)
      setPrice(draft.price)
      setPeriod(draft.period)
      setDetails(draft.details)
      setCountry(draft.country)
      setCurrency(draft.currency)
      setCity(draft.city)
      setDescription(draft.description)
      setPhone(draft.phone)
      setContactWhatsApp(draft.contactWhatsApp !== false)
      setContactPhone(draft.contactPhone !== false)
      setPhotos(draft.photos)
      setSponsored(draft.sponsored === true)
      setPlace(locatedPlace(null, draft.country, draft.city))
      if (auth.signedIn) toast.success("Restored your draft")
    }, 0)
    return () => window.clearTimeout(timer)
  }, [existing, auth.signedIn])

  useEffect(() => {
    if (existing || appliedProfile.current || !auth.ready) return
    if (!auth.signedIn) {
      appliedProfile.current = true
      return
    }
    let active = true
    void (async () => {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" })
        const payload = (await response.json()) as { ok?: boolean; profile?: BoardProfile }
        if (!active || !response.ok || !payload.profile) return
        appliedProfile.current = true
        const profile = payload.profile
        setPhone((current) => prefillListingPhone(current || null, profile.phone))
        setCountry((current) =>
          current
            ? current
            : resolvePostingCountry({
                urlCountry,
                profileCountry: profile.countryCode,
              }),
        )
      } catch {
        // Prefill is optional; seller can still choose country and phone.
      }
    })()
    return () => {
      active = false
    }
  }, [existing, auth.ready, auth.signedIn, urlCountry])

  const plan = category ? categoryPlan(category) : null
  const subcategory = category ? findSubcategory(category, subcategoryId ?? undefined) : undefined
  const activePeriod = subcategory?.periods.includes(period) ? period : (subcategory?.periods[0] ?? period)
  const suffix = subcategory?.priceSuffix ?? pricePeriod(activePeriod).suffix
  const callingCode = getCountry(country)?.callingCode
  const currencies = currencyChoices(country, currency)

  useEffect(() => {
    if (existing) return
    if (!draftUnlocked && !auth.signedIn) return
    const hasContent =
      Boolean(category) ||
      Boolean(subcategoryId) ||
      title.trim().length > 0 ||
      price.trim().length > 0 ||
      description.trim().length > 0 ||
      phone.trim().length > 0 ||
      photos.length > 0 ||
      Object.values(details).some((value) => value.trim().length > 0)
    if (!hasContent) return
    const timer = window.setTimeout(() => {
      const result = writePostDraft({
        step,
        category,
        subcategoryId,
        title,
        price,
        period: activePeriod,
        details,
        country,
        currency,
        city,
        description,
        phone,
        contactWhatsApp,
        contactPhone,
        photos,
        sponsored,
      })
      if (result.ok && result.omittedPhotos && !omittedPhotosToastShown.current) {
        omittedPhotosToastShown.current = true
        toast.message("Draft saved without photos — storage on this device is full.")
      }
    }, 400)
    return () => window.clearTimeout(timer)
  }, [
    existing,
    draftUnlocked,
    auth.signedIn,
    step,
    category,
    subcategoryId,
    title,
    price,
    activePeriod,
    details,
    country,
    currency,
    city,
    description,
    phone,
    contactWhatsApp,
    contactPhone,
    photos,
    sponsored,
  ])

  const preview = useMemo<Listing>(() => {
    const nextCategory = category ?? "vehicles"
    const cover = withCoverImage(photos.length > 0 ? photos : [categoryImage[nextCategory]])
    return {
      id: "preview",
      title: title.trim() || "Your listing title",
      price: Number(price) > 0 ? Number(price) : 0,
      currency,
      priceSuffix: suffix,
      category: nextCategory,
      subcategory: subcategory?.id,
      details,
      country,
      city: city.trim() || "City",
      latitude: place?.lat,
      longitude: place?.lng,
      timezone: place?.timezone,
      hoursAgo: 0,
      postedAt: new Date().toISOString(),
      image: cover.image,
      images: cover.images,
      badge: nextCategory === "jobs" ? "jobs" : undefined,
      description,
      condition: details.condition || subcategory?.name || "Listed",
      sellerName: existing?.sellerName ?? "Amina K.",
      sellerSince: existing?.sellerSince ?? sellerSinceFromUser(auth.user),
      phone: phone || callingCode || "+000",
      contactWhatsApp,
      contactPhone,
      sponsored: sponsoredLocked || sponsored || undefined,
      sponsoredLocked: sponsoredLocked || undefined,
      mine: true,
    }
  }, [
    title,
    price,
    currency,
    suffix,
    category,
    subcategory,
    details,
    country,
    city,
    place,
    photos,
    description,
    phone,
    callingCode,
    contactWhatsApp,
    contactPhone,
    sponsored,
    sponsoredLocked,
    existing,
    auth.user,
  ])

  function chooseCategory(id: CategoryId) {
    if (id !== category) {
      setSubcategoryId(null)
      setDetails({})
    }
    setCategory(id)
    setErrors({})
    moveTo(1)
  }

  function chooseSubcategory(next: Subcategory) {
    if (next.id !== subcategoryId) {
      setDetails({})
      setPeriod(next.periods[0])
    }
    setSubcategoryId(next.id)
    setErrors({})
    moveTo(2)
  }

  function setDetail(id: string, value: string) {
    setDetails((current) => ({ ...current, [id]: value }))
    setErrors((current) => ({ ...current, [id]: undefined }))
  }

  function onFile(file: File | undefined) {
    if (!file) return
    const reason = photoFileError(file)
    if (reason) {
      setErrors((current) => ({ ...current, image: reason }))
      return
    }
    if (photos.length >= maxListingPhotos) {
      setErrors((current) => ({ ...current, image: `You can add up to ${maxListingPhotos} photos.` }))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhotos((current) => [...current, reader.result as string].slice(0, maxListingPhotos))
        setErrors((current) => ({ ...current, image: undefined }))
      }
    }
    reader.readAsDataURL(file)
  }

  function currentErrors(): FieldErrors {
    return listingFieldErrors({
      title,
      price: Number(price),
      currency,
      priceSuffix: suffix,
      category,
      subcategoryId: subcategory?.id ?? null,
      details,
      country,
      city,
      description,
      phone,
      contactWhatsApp,
      contactPhone,
    })
  }

  function detailErrors(): FieldErrors {
    if (!subcategory || !plan) return { form: "Choose a type first." }
    const next = currentErrors()
    delete next.city
    delete next.phone
    return next
  }

  function contactErrors(): FieldErrors {
    const next = currentErrors()
    return { city: next.city, phone: next.phone }
  }

  function reachable(index: number): boolean {
    if (index <= 0) return true
    if (!category) return false
    if (index === 1) return true
    if (!subcategory) return false
    if (index === 2) return true
    return !Object.values(detailErrors()).some(Boolean)
  }

  function moveTo(next: number) {
    setStep(next)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function showErrors(next: FieldErrors) {
    setErrors(next)
    requestAnimationFrame(() => {
      document.querySelector("[data-field-error]")?.scrollIntoView({ block: "center", behavior: "smooth" })
    })
  }

  function openStep(index: number) {
    if (index === step) {
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }
    if (!reachable(index)) return
    setErrors({})
    moveTo(index)
  }

  function goNext() {
    if (step === 0) {
      if (!category) {
        showErrors({ form: "Choose a category." })
        return
      }
      moveTo(1)
      return
    }
    if (step === 1) {
      if (!subcategory) {
        showErrors({ form: "Choose a type." })
        return
      }
      moveTo(2)
      return
    }
    if (step === 2) {
      const next = detailErrors()
      if (Object.values(next).some(Boolean)) {
        showErrors(next)
        return
      }
      setErrors({})
      moveTo(3)
    }
  }

  async function submit() {
    if (!plan || !category || !subcategory) {
      setStep(category ? 1 : 0)
      return
    }
    const next = { ...detailErrors(), ...contactErrors() }
    if (Object.values(next).some(Boolean)) {
      const detailsInvalid = Object.values(detailErrors()).some(Boolean)
      if (detailsInvalid) setStep(2)
      showErrors(next)
      return
    }

    const amount = Number(price)
    const located = locatedPlace(place, country, city.trim())
    const keptDetails = Object.fromEntries(
      subcategory.fields.flatMap((field) => {
        const value = (details[field.id] ?? "").trim().slice(0, 80)
        return value ? [[field.id, value]] : []
      }),
    )
    const listing: Listing = {
      ...preview,
      id: existing?.id ?? `ad-${crypto.randomUUID()}`,
      title: title.trim().slice(0, 80),
      price: Math.round(amount),
      currency,
      priceSuffix: suffix,
      category,
      subcategory: subcategory.id,
      details: keptDetails,
      meta: undefined,
      city: located?.name ?? city.trim(),
      latitude: located?.lat,
      longitude: located?.lng,
      timezone: located?.timezone,
      hoursAgo: existing?.hoursAgo ?? 0,
      postedAt: existing?.postedAt ?? new Date().toISOString(),
      description: description.trim().slice(0, 2000),
      phone: normalizeContactPhone(phone, country),
      contactWhatsApp,
      contactPhone,
      image: preview.image,
      images: preview.images,
      condition: keptDetails.condition || subcategory.name,
      sold: existing?.sold,
      sponsored: sponsoredLocked || sponsored || undefined,
      sponsoredLocked: sponsoredLocked || undefined,
    }
    if (auth.configured && !auth.signedIn) {
      const draftResult = writePostDraft({
        step,
        category,
        subcategoryId,
        title,
        price,
        period: activePeriod,
        details,
        country,
        currency,
        city,
        description,
        phone,
        contactWhatsApp,
        contactPhone,
        photos,
        sponsored,
      })
      if (draftResult.ok && draftResult.omittedPhotos && !omittedPhotosToastShown.current) {
        omittedPhotosToastShown.current = true
        toast.message("Draft saved without photos — storage on this device is full.")
      }
      toast.error(existing ? "Sign in to edit this ad" : "Sign in to post an ad")
      router.push(signInHref(existing ? `/post?edit=${existing.id}` : "/post"))
      return
    }
    setSubmitting(true)
    const result = existing ? await updateListing(listing) : await addListing(listing)
    setSubmitting(false)
    if (!result.ok) {
      toast.error(result.reason)
      return
    }
    if (!existing) clearPostDraft()
    toast.success(existing ? "Changes saved" : "Your ad is live")
    router.push(`/listings/${listing.id}`)
  }

  useEffect(() => {
    document.title = siteTitle(existing ? "Edit your ad" : "Post an ad")
  }, [existing])

  const placeLine = [city.trim(), countryName(country)].filter(Boolean).join(", ")
  const choiceLine = [category ? categoryName(category) : null, subcategory?.name].filter(Boolean).join(" · ")
  const summaryLine = [choiceLine, placeLine].filter(Boolean).join(" · ")
  const needsSignIn = auth.ready && auth.configured && !auth.signedIn
  const showForm = !needsSignIn || draftUnlocked || Boolean(existing)

  if (needsSignIn && !showForm) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
        <EmptyPanel
          title="Sign in to post an ad"
          body="Drafts you start on this device are saved and restored after you sign in."
          actionHref={signInHref("/post")}
          actionLabel="Sign in"
          className="mt-0"
          headingLevel={1}
        >
          <Button
            type="button"
            variant="outline"
            className="mt-4 rounded-full"
            onClick={() => setDraftUnlocked(true)}
          >
            Start a draft on this device
          </Button>
        </EmptyPanel>
      </div>
    )
  }

  return (
    <div className="mx-auto grid w-full max-w-[1100px] items-start gap-8 px-4 pt-6 pb-24 md:px-6 md:py-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{existing ? "Edit your ad" : "Post an ad"}</h1>
        {summaryLine ? <p className="mt-1 text-sm text-neutral-500">{summaryLine}</p> : null}
        {needsSignIn ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {existing
              ? "Sign in to manage this ad. Ads from this browser move onto your account when you sign in. "
              : "Sign in before publishing. Your draft is saved on this device. "}
            <Link
              href={signInHref(existing ? `/post?edit=${existing.id}` : "/post")}
              className="font-medium underline underline-offset-2"
            >
              Sign in
            </Link>
          </p>
        ) : null}

        <ol className="mt-6 grid grid-cols-4 gap-2" aria-label="Posting steps">
          {steps.map((label, index) => {
            const current = index === step
            const open = index === step || reachable(index)
            return (
              <li key={label}>
                <button
                  type="button"
                  disabled={!open}
                  onClick={() => openStep(index)}
                  className="flex w-full min-w-0 cursor-pointer flex-col items-start gap-2 text-left disabled:cursor-default"
                  aria-current={current ? "step" : undefined}
                >
                  <span
                    className={cn(
                      "h-1 w-full rounded-full",
                      index <= step ? "bg-neutral-950" : open ? "bg-neutral-400" : "bg-neutral-200",
                    )}
                  />
                  <span
                    className={cn(
                      "truncate text-[11px] sm:text-xs",
                      current ? "font-medium text-neutral-950" : open ? "text-neutral-600" : "text-neutral-400",
                    )}
                  >
                    {label}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>

        <form
          className="mt-6 grid gap-5 max-md:[&_input]:scroll-mb-28 max-md:[&_textarea]:scroll-mb-28 max-md:[&_[data-field-error]]:scroll-mb-28"
          data-post-step={step}
          onSubmit={(event) => {
            event.preventDefault()
            if (submitting) return
            if (step < 3) goNext()
            else void submit()
          }}
        >
          {step === 0 ? (
            <div className="grid gap-3">
              <div>
                <h2 className="text-base font-medium">What are you listing?</h2>
                <p className="text-sm text-neutral-500">Choose a category. The type comes next.</p>
              </div>
              <div aria-label="Category" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {postingPlans().map((item) => {
                  const Icon = categoryIcons[item.id]
                  const selected = category === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => chooseCategory(item.id)}
                      className={cn(
                        "flex min-h-14 w-full cursor-pointer items-center gap-2.5 rounded-2xl border bg-white px-3 py-3 text-left text-sm transition-colors",
                        "hover:border-neutral-400 hover:bg-neutral-50 active:bg-neutral-100",
                        "focus-visible:border-neutral-950 focus-visible:ring-3 focus-visible:ring-neutral-950/20 focus-visible:outline-none",
                        "[&_svg]:pointer-events-none",
                        selected ? "border-neutral-950 bg-neutral-50 shadow-sm" : "border-neutral-200",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-xl",
                          selected ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-700",
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1 leading-tight">{categoryName(item.id)}</span>
                      {selected ? <Check className="size-4 shrink-0" /> : null}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          {step === 1 && plan && category ? (
            <div className="grid gap-3">
              <div>
                <h2 className="text-base font-medium">{categoryName(category)}</h2>
                <p className="text-sm text-neutral-500">{plan.prompt}</p>
              </div>
              <div aria-label={plan.prompt} className="grid gap-2">
              {plan.subcategories.map((item) => {
                const selected = subcategoryId === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => chooseSubcategory(item)}
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3 text-left transition-colors",
                      "hover:border-neutral-400 hover:bg-neutral-50 active:bg-neutral-100",
                      "focus-visible:border-neutral-950 focus-visible:ring-3 focus-visible:ring-neutral-950/20 focus-visible:outline-none",
                      "[&_svg]:pointer-events-none",
                      selected ? "border-neutral-950 bg-neutral-50 shadow-sm" : "border-neutral-200",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{item.name}</span>
                      <span className="mt-0.5 block text-xs text-neutral-500">{item.summary}</span>
                    </span>
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border",
                        selected ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300",
                      )}
                    >
                      {selected ? <Check className="size-3" /> : null}
                    </span>
                  </button>
                )
              })}
              </div>
            </div>
          ) : null}

          {step === 2 && plan && subcategory ? (
            <section className="grid gap-5 rounded-2xl border bg-white p-4 sm:p-5">
              <div>
                <h2 className="text-base font-medium">{plan.detailHeading}</h2>
                <p className="mt-1 text-sm text-neutral-500">{plan.intro}</p>
              </div>
              <PhotoGallery
                photos={photos}
                invalid={Boolean(errors.image)}
                onFile={onFile}
                onRemove={(index) => setPhotos((current) => current.filter((_, i) => i !== index))}
                onMove={(from, to) =>
                  setPhotos((current) => {
                    if (to < 0 || to >= current.length) return current
                    const next = [...current]
                    const [item] = next.splice(from, 1)
                    if (!item) return current
                    next.splice(to, 0, item)
                    return next
                  })
                }
                onCover={(index) =>
                  setPhotos((current) => {
                    if (index <= 0 || index >= current.length) return current
                    const next = [...current]
                    const [item] = next.splice(index, 1)
                    if (!item) return current
                    return [item, ...next]
                  })
                }
              />
              <p className="-mt-3 text-xs text-neutral-500">
                {plan.photoHint} Up to {maxListingPhotos} photos. The first photo is the cover. Photos are optional.
              </p>
              {errors.image ? (
                <span data-field-error className="-mt-3 text-xs text-destructive">
                  {errors.image}
                </span>
              ) : null}
              <Field label="Title" required error={errors.title}>
                <Input
                  value={title}
                  aria-invalid={Boolean(errors.title)}
                  onChange={(event) => {
                    setTitle(event.target.value)
                    setErrors((current) => ({ ...current, title: undefined }))
                  }}
                  placeholder={subcategory.titlePlaceholder}
                  className="h-10 bg-white"
                />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label={`${subcategory.priceLabel} (${currency})`} required error={errors.price}>
                  <Input
                    inputMode="decimal"
                    value={price}
                    aria-invalid={Boolean(errors.price)}
                    onChange={(event) => {
                      setPrice(event.target.value)
                      setErrors((current) => ({ ...current, price: undefined }))
                    }}
                    placeholder={subcategory.pricePlaceholder}
                    className="h-10 bg-white"
                  />
                </Field>
                <Field label="Currency" error={errors.currency}>
                  <ChoiceRow
                    value={currency}
                    options={currencies.map((code) => ({
                      id: code,
                      label: code,
                      title: `${code} · ${currencyLabel(code)}`,
                    }))}
                    onChange={(code) => {
                      if (currencies.includes(code)) setCurrency(code)
                      setErrors((current) => ({ ...current, currency: undefined }))
                    }}
                  />
                </Field>
              </div>
              {subcategory.periods.length > 1 ? (
                <Field label="Charged" error={errors.priceSuffix}>
                  <ChoiceRow
                    value={activePeriod}
                    options={subcategory.periods.map((id) => ({ id, label: pricePeriod(id).label }))}
                    onChange={(id) => {
                      if (isPricePeriodId(id) && subcategory.periods.includes(id)) setPeriod(id)
                    }}
                  />
                </Field>
              ) : null}
              <div className="grid gap-5 sm:grid-cols-2">
                {subcategory.fields.map((field) => (
                  <div
                    key={field.id}
                    className={cn(field.kind === "select" && (field.options?.length ?? 0) > 3 && "sm:col-span-2")}
                  >
                    <DetailControl
                      field={field}
                      value={details[field.id] ?? ""}
                      error={errors[field.id]}
                      onChange={(value) => setDetail(field.id, value)}
                    />
                  </div>
                ))}
              </div>
              <Field
                label={plan.descriptionLabel}
                required
                error={errors.description}
                hint={descriptionHint(description)}
              >
                <Textarea
                  value={description}
                  aria-invalid={Boolean(errors.description)}
                  onChange={(event) => {
                    setDescription(event.target.value)
                    setErrors((current) => ({ ...current, description: undefined }))
                  }}
                  rows={5}
                  placeholder={subcategory.descriptionPlaceholder ?? plan.descriptionPlaceholder}
                  className="bg-white"
                />
              </Field>
            </section>
          ) : null}

          {step === 3 && plan ? (
            <section className="grid gap-5 rounded-2xl border bg-white p-4 sm:p-5">
              <div>
                <h2 className="text-base font-medium">Where can people reach you?</h2>
                <p className="mt-1 text-sm text-neutral-500">{plan.phoneHint}</p>
              </div>
              <div className="rounded-xl bg-neutral-50 px-3 py-3">
                <p className="truncate text-sm font-medium">{title.trim() || "Add a title"}</p>
                <p className="mt-0.5 text-sm text-neutral-700">{Number(price) > 0 ? formatPrice(preview) : "Add a price"}</p>
                {choiceLine ? <p className="mt-0.5 truncate text-xs text-neutral-500">{choiceLine}</p> : null}
              </div>
              {!country ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                  Choose a country for this ad, or{" "}
                  <Link
                    href="/account"
                    className="font-medium underline underline-offset-2 hover:text-amber-900"
                  >
                    set your country on Profile
                  </Link>
                  .
                </p>
              ) : null}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Country" required>
                  <CountryField
                    country={country}
                    onChange={(code) => {
                      setCountry(code)
                      setCity("")
                      setPlace(null)
                      setCurrency(getCountry(code)?.currencies[0]?.code ?? "USD")
                      setErrors((current) => ({ ...current, city: undefined, currency: undefined, form: undefined }))
                    }}
                  />
                </Field>
                <Field label="City" required error={errors.city}>
                  {country ? (
                    <CityField
                      country={country}
                      city={city}
                      onCityChange={(value) => {
                        setCity(value)
                        setErrors((current) => ({ ...current, city: undefined }))
                      }}
                      onPlace={setPlace}
                    />
                  ) : (
                    <Input disabled placeholder="Choose a country first" aria-disabled="true" className="h-10 bg-white" />
                  )}
                </Field>
              </div>
              <ContactPhoneField
                id="listing-phone"
                value={phone}
                countryCode={country}
                required
                error={errors.phone}
                hint={plan.safety}
                onChange={(value) => {
                  setPhone(value)
                  setErrors((current) => ({ ...current, phone: undefined }))
                }}
              />
              <label className="flex items-start gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 rounded border-neutral-300"
                  checked={sponsoredLocked || sponsored}
                  disabled={sponsoredLocked}
                  onChange={(event) => {
                    if (sponsoredLocked) return
                    setSponsored(event.target.checked)
                  }}
                />
                <span>
                  Sponsored / paid promotion
                  <span className="mt-0.5 block text-xs text-neutral-500">
                    {sponsoredLocked
                      ? "This ad was marked as sponsored by moderation and cannot be unmarked."
                      : "Tick if you were paid to post this."}
                  </span>
                </span>
              </label>
              <div className="grid gap-2">
                <p className="text-xs font-medium text-neutral-700">Direct contact</p>
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-neutral-300"
                    checked={contactWhatsApp}
                    onChange={(event) => setContactWhatsApp(event.target.checked)}
                  />
                  WhatsApp
                </label>
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-neutral-300"
                    checked={contactPhone}
                    onChange={(event) => setContactPhone(event.target.checked)}
                  />
                  Phone calls
                </label>
                <p className="text-xs leading-5 text-neutral-500">
                  Buyers can always use marketplace messages. Your phone number is used only for the direct contact options you enable.
                  If you use WhatsApp for a business, make sure your seller/profile name clearly identifies that business. Buyers must consent
                  before we open WhatsApp, and that consent is limited to replies about the listing—not unrelated marketing.
                </p>
              </div>
            </section>
          ) : null}

          {errors.form ? (
            <p data-field-error className="text-sm text-destructive">
              {errors.form}
            </p>
          ) : null}

          <div className="fixed inset-x-0 bottom-0 z-[45] flex flex-col gap-2 border-t border-neutral-200 bg-background/95 px-4 py-3 backdrop-blur md:static md:inset-auto md:z-auto md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
            <div className="flex items-center gap-3">
            {step === 0 ? (
              <Button type="button" variant="ghost" onClick={() => router.push(existing ? `/listings/${existing.id}` : "/")}>
                Cancel
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={() => openStep(step - 1)}>
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button
                type="submit"
                className="h-10 rounded-full bg-neutral-950 px-5 text-white hover:bg-neutral-800"
              >
                Continue
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={submitting}
                className="h-10 rounded-full bg-neutral-950 px-5 text-white hover:bg-neutral-800"
              >
                {submitting ? (existing ? "Saving…" : "Publishing…") : existing ? "Save changes" : "Publish ad"}
              </Button>
            )}
            </div>
          </div>
        </form>
      </div>
      {category ? (
        <aside className="lg:sticky lg:top-[85px] lg:self-start">
          <p className="mb-2 text-xs font-medium tracking-wide text-neutral-500 uppercase">Preview</p>
          <ListingCard listing={preview} linked={false} saveable={false} />
        </aside>
      ) : null}
    </div>
  )
}

function PhotoGallery({
  photos,
  invalid,
  onFile,
  onRemove,
  onMove,
  onCover,
}: {
  photos: string[]
  invalid: boolean
  onFile: (file: File | undefined) => void
  onRemove: (index: number) => void
  onMove: (from: number, to: number) => void
  onCover: (index: number) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  function take(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDrag(false)
    onFile(event.dataTransfer.files?.[0])
  }

  return (
    <div className="grid gap-3">
      {photos.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <li key={`${index}-${photo.slice(0, 32)}`} className="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="" className="aspect-[4/3] w-full object-cover" />
              {index === 0 ? (
                <span className="absolute top-2 left-2 rounded-full bg-neutral-950 px-2 py-0.5 text-[10px] font-medium text-white">
                  Cover
                </span>
              ) : null}
              <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1 bg-gradient-to-t from-black/60 to-transparent p-2">
                {index > 0 ? (
                  <Button type="button" size="sm" variant="secondary" className="h-7 rounded-full bg-white px-2 text-xs" onClick={() => onCover(index)}>
                    Cover
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-7 rounded-full bg-white px-2 text-xs"
                  disabled={index === 0}
                  onClick={() => onMove(index, index - 1)}
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-7 rounded-full bg-white px-2 text-xs"
                  disabled={index === photos.length - 1}
                  onClick={() => onMove(index, index + 1)}
                >
                  <ChevronRight className="size-3.5" />
                </Button>
                <Button type="button" size="sm" variant="secondary" className="h-7 rounded-full bg-white px-2 text-xs" onClick={() => onRemove(index)}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {photos.length < maxListingPhotos ? (
        <div
          className={cn(
            "overflow-hidden rounded-2xl border border-dashed bg-neutral-50",
            drag ? "border-neutral-950 bg-white" : "border-neutral-300",
            invalid && "border-destructive",
          )}
          onDragOver={(event) => {
            event.preventDefault()
            setDrag(true)
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={take}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            tabIndex={-1}
            className="sr-only"
            onChange={(event) => {
              onFile(event.target.files?.[0])
              event.target.value = ""
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-36 w-full flex-col items-center justify-center gap-2 text-sm text-neutral-600"
          >
            <ImagePlus className="size-5" />
            {photos.length === 0 ? "Add a photo" : "Add another photo"}
          </button>
        </div>
      ) : null}
    </div>
  )
}

function ChoiceRow({
  value,
  options,
  onChange,
}: {
  value: string
  options: readonly { id: string; label: string; title?: string }[]
  onChange: (id: string) => void
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      variant="outline"
      spacing={2}
      className="flex-wrap justify-start"
      onValueChange={(next) => {
        if (next) onChange(next)
      }}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.id}
          value={option.id}
          title={option.title}
          aria-label={option.label}
          className="h-9 rounded-full px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

function CountryField({ country, onChange }: { country: string; onChange: (code: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const needle = fold(query)
  const featured = filterCountries(primaryCountries(), needle)
  const rest = filterCountries(moreCountries(), needle)
  const matches = [...featured, ...rest]
  const display = country ? countryName(country) : ""

  function pick(code: string) {
    onChange(code)
    setQuery("")
    setOpen(false)
    inputRef.current?.blur()
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={open ? query : display}
        role="combobox"
        aria-expanded={open}
        aria-controls="post-country-list"
        aria-autocomplete="list"
        placeholder="Choose country"
        className="h-10 bg-white"
        onClick={() => setOpen(true)}
        onFocus={() => {
          setQuery("")
          setOpen(true)
        }}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150)
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false)
            return
          }
          if (event.key !== "Enter" || !open) return
          event.preventDefault()
          const exact = matches.find(
            (item) => fold(item.name) === needle || item.code.toLowerCase() === query.trim().toLowerCase(),
          )
          const next = exact ?? (matches.length === 1 ? matches[0] : undefined)
          if (next) pick(next.code)
        }}
      />
      {open ? (
        <ul
          id="post-country-list"
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border bg-white p-1 shadow-md"
        >
          {matches.length === 0 ? (
            <li className="px-2 py-2 text-sm text-neutral-500">No country matches</li>
          ) : (
            <>
              {featured.map((item) => (
                <CountryOption key={item.code} item={item} selected={item.code === country} onPick={pick} />
              ))}
              {featured.length > 0 && rest.length > 0 ? <li className="my-1 border-t border-neutral-100" /> : null}
              {rest.map((item) => (
                <CountryOption key={item.code} item={item} selected={item.code === country} onPick={pick} />
              ))}
            </>
          )}
        </ul>
      ) : null}
    </div>
  )
}

function CountryOption({
  item,
  selected,
  onPick,
}: {
  item: CountryRecord
  selected: boolean
  onPick: (code: string) => void
}) {
  return (
    <li role="option" aria-selected={selected}>
      <button
        type="button"
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-neutral-100",
          selected && "font-medium",
        )}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onPick(item.code)}
      >
        <span className="truncate">{item.name}</span>
        {selected ? <Check className="size-3.5 shrink-0" /> : null}
      </button>
    </li>
  )
}

function filterCountries(list: CountryRecord[], needle: string): CountryRecord[] {
  if (!needle) return list
  return list.filter((item) => fold(item.name).includes(needle) || item.code.toLowerCase() === needle)
}

function DetailControl({
  field,
  value,
  error,
  onChange,
}: {
  field: DetailField
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  switch (field.kind) {
    case "select":
      return (
        <Field label={field.label} required={field.required} error={error}>
          <ChoiceRow
            value={value}
            options={(field.options ?? []).map((option) => ({ id: option, label: option }))}
            onChange={onChange}
          />
        </Field>
      )
    case "text":
      return (
        <Field label={field.label} required={field.required} error={error} hint={field.hint}>
          <Input
            value={value}
            aria-invalid={Boolean(error)}
            onChange={(event) => onChange(event.target.value)}
            placeholder={field.placeholder}
            className="h-10 bg-white"
          />
        </Field>
      )
    default: {
      const unreachable: never = field.kind
      throw new Error(`Unknown field kind: ${unreachable}`)
    }
  }
}

function currencyChoices(countryCode: string, extra?: string): string[] {
  const local = getCountry(countryCode)?.currencies.map((item) => item.code) ?? []
  const codes = local.includes("USD") ? local : [...local, "USD"]
  if (extra && !codes.includes(extra)) return [extra, ...codes]
  return codes
}

function placeFromListing(listing: Listing | null): ChosenPlace | null {
  if (!listing || typeof listing.latitude !== "number" || typeof listing.longitude !== "number" || !listing.timezone) {
    return null
  }
  return {
    name: listing.city,
    lat: listing.latitude,
    lng: listing.longitude,
    timezone: listing.timezone,
  }
}

function MissingAd() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-xl font-semibold tracking-tight">This ad is not yours</h1>
      <p className="mt-2 text-sm text-neutral-500">It may have been removed, or it was posted from another browser.</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button asChild className="rounded-full">
          <Link href="/my-ads">My ads</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/post">Post an ad</Link>
        </Button>
      </div>
    </div>
  )
}

function locatedPlace(chosen: ChosenPlace | null, country: string, city: string): ChosenPlace | null {
  if (chosen) return chosen
  const resolved = resolvePlace(country, city)
  if (!resolved.matched) return null
  return {
    name: resolved.name,
    lat: resolved.lat,
    lng: resolved.lng,
    timezone: resolved.timezone,
  }
}

function sellerSinceFromUser(user: User | null | undefined): string {
  if (user?.created_at) {
    const year = new Date(user.created_at).getFullYear()
    if (Number.isFinite(year)) return String(year)
  }
  return String(new Date().getFullYear())
}

function descriptionHint(value: string): string {
  const count = value.trim().length
  if (count >= 20) return `${count} characters`
  return `${count} / 20 characters`
}

function Field({
  label,
  error,
  required,
  hint,
  children,
}: {
  label: string
  error?: string
  required?: boolean
  hint?: string
  children: ReactNode
}) {
  return (
    <FormField label={label} error={error} required={required} hint={hint}>
      {children}
    </FormField>
  )
}
