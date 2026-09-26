"use client"

import { Check, ImagePlus } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react"
import { toast } from "sonner"

import { categoryIcons } from "@/components/category-nav"
import { CityField, type ChosenPlace } from "@/components/city-field"
import { ListingCard } from "@/components/listing-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { readPostingPlace } from "@/lib/active-place"
import { categoryImage } from "@/lib/catalog"
import { resolvePlace } from "@/lib/cities"
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
  const startingCountry = existing ? (canonicalCountry(existing.country) ?? "KE") : (urlCountry ?? "KE")
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
  const [currency, setCurrency] = useState(existing?.currency ?? getCountry(startingCountry)?.currencies[0]?.code ?? "USD")
  const [city, setCity] = useState(startingCity)
  const [place, setPlace] = useState<ChosenPlace | null>(placeFromListing(existing))
  const [description, setDescription] = useState(existing?.description ?? "")
  const [phone, setPhone] = useState(existing?.phone ?? "")
  const [image, setImage] = useState<string | null>(existing?.image ?? null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const appliedPlace = useRef(false)

  useLayoutEffect(() => {
    if (appliedPlace.current || existing || urlCountry) return
    appliedPlace.current = true
    const place = readPostingPlace()
    setCountry(place.country)
    setCity(place.city)
    setCurrency(getCountry(place.country)?.currencies[0]?.code ?? "USD")
    setPlace(locatedPlace(null, place.country, place.city))
  }, [existing, urlCountry])

  const plan = category ? categoryPlan(category) : null
  const subcategory = category ? findSubcategory(category, subcategoryId ?? undefined) : undefined
  const activePeriod = subcategory?.periods.includes(period) ? period : (subcategory?.periods[0] ?? period)
  const suffix = subcategory?.priceSuffix ?? pricePeriod(activePeriod).suffix
  const callingCode = getCountry(country)?.callingCode
  const currencies = currencyChoices(country, currency)

  const preview = useMemo<Listing>(() => {
    const nextCategory = category ?? "vehicles"
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
      image: image ?? categoryImage[nextCategory],
      badge: nextCategory === "jobs" ? "jobs" : undefined,
      description,
      condition: details.condition || subcategory?.name || "Listed",
      sellerName: existing?.sellerName ?? "Amina K.",
      sellerSince: existing?.sellerSince ?? "2024",
      phone: phone || callingCode || "+000",
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
    image,
    description,
    phone,
    callingCode,
    existing,
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
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setErrors((current) => ({ ...current, image: "Choose a JPEG, PNG, or WebP photo." }))
      return
    }
    if (file.size > 700_000) {
      setErrors((current) => ({ ...current, image: "Use a photo under 700KB." }))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImage(reader.result)
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
      phone: phone.trim().slice(0, 30),
      image: image ?? categoryImage[category],
      condition: keptDetails.condition || subcategory.name,
    }
    setSubmitting(true)
    const result = existing ? await updateListing(listing) : await addListing(listing)
    setSubmitting(false)
    if (!result.ok) {
      toast.error(result.reason)
      return
    }
    toast.success(existing ? "Changes saved" : "Your ad is live")
    router.push(`/listings/${listing.id}`)
  }

  useEffect(() => {
    document.title = `${existing ? "Edit your ad" : "Post an ad"} · africa classifieds`
  }, [existing])

  const placeLine = [city.trim(), countryName(country)].filter(Boolean).join(", ")
  const choiceLine = [category ? categoryName(category) : null, subcategory?.name].filter(Boolean).join(" · ")
  const summaryLine = [choiceLine, placeLine].filter(Boolean).join(" · ")

  return (
    <div className="mx-auto grid w-full max-w-[1100px] items-start gap-8 px-4 pt-6 pb-24 md:px-6 md:py-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{existing ? "Edit your ad" : "Post an ad"}</h1>
        {summaryLine ? <p className="mt-1 text-sm text-neutral-500">{summaryLine}</p> : null}

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
              <PhotoDrop image={image} invalid={Boolean(errors.image)} onFile={onFile} onClear={() => setImage(null)} />
              <p className="-mt-3 text-xs text-neutral-500">{plan.photoHint} A photo is optional.</p>
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
              <div className="grid grid-cols-2 gap-3">
                <Field label="Country">
                  <CountryField
                    country={country}
                    onChange={(code) => {
                      setCountry(code)
                      setCity("")
                      setPlace(null)
                      setCurrency(getCountry(code)?.currencies[0]?.code ?? "USD")
                      setErrors((current) => ({ ...current, city: undefined, currency: undefined }))
                    }}
                  />
                </Field>
                <Field label="City" required error={errors.city}>
                  <CityField
                    country={country}
                    city={city}
                    onCityChange={(value) => {
                      setCity(value)
                      setErrors((current) => ({ ...current, city: undefined }))
                    }}
                    onPlace={setPlace}
                  />
                </Field>
              </div>
              <Field label="Phone" required error={errors.phone} hint={plan.safety}>
                <Input
                  value={phone}
                  aria-invalid={Boolean(errors.phone)}
                  onChange={(event) => {
                    setPhone(event.target.value)
                    setErrors((current) => ({ ...current, phone: undefined }))
                  }}
                  placeholder={callingCode ? `${callingCode} 7XX XXX XXX` : "+254 7XX XXX XXX"}
                  className="h-10 bg-white"
                />
              </Field>
            </section>
          ) : null}

          {errors.form ? (
            <p data-field-error className="text-sm text-destructive">
              {errors.form}
            </p>
          ) : null}

          <div className="fixed inset-x-0 bottom-0 z-[45] flex items-center gap-3 border-t border-neutral-200 bg-background/95 px-4 py-3 backdrop-blur md:static md:inset-auto md:z-auto md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
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

function PhotoDrop({
  image,
  invalid,
  onFile,
  onClear,
}: {
  image: string | null
  invalid: boolean
  onFile: (file: File | undefined) => void
  onClear: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  function take(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDrag(false)
    onFile(event.dataTransfer.files?.[0])
  }

  return (
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
      {image ? (
        <div className="relative">
          <img src={image} alt="" className="h-44 w-full object-cover" />
          <div className="absolute right-2 bottom-2 flex gap-2">
            <Button type="button" variant="secondary" size="sm" className="rounded-full bg-white" onClick={() => inputRef.current?.click()}>
              Replace
            </Button>
            <Button type="button" variant="secondary" size="sm" className="rounded-full bg-white" onClick={onClear}>
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-36 w-full flex-col items-center justify-center gap-2 text-sm text-neutral-600"
        >
          <ImagePlus className="size-5" />
          Add a photo
        </button>
      )}
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
        value={open ? query : countryName(country)}
        role="combobox"
        aria-expanded={open}
        aria-controls="post-country-list"
        aria-autocomplete="list"
        placeholder="Search countries"
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
    <div className="grid gap-1.5">
      <Label>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {error ? (
        <span data-field-error className="text-xs text-destructive">
          {error}
        </span>
      ) : hint ? (
        <span className="text-xs text-neutral-500">{hint}</span>
      ) : null}
    </div>
  )
}
