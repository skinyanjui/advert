"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { categoryIcons } from "@/components/category-nav"
import { CityField, type ChosenPlace } from "@/components/city-field"
import { ListingCard } from "@/components/listing-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { categoryImage } from "@/lib/catalog"
import { resolvePlace } from "@/lib/cities"
import {
  canonicalCountry,
  countries,
  countryName,
  currencyLabel,
  getCountry,
} from "@/lib/countries"
import { listingFieldErrors, type FieldErrors as RuleErrors } from "@/lib/listing-rules"
import { useMarketplace } from "@/lib/marketplace"
import {
  cardFactLabels,
  categoryPlan,
  findSubcategory,
  isPricePeriodId,
  listingMeta,
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
  const startingCountry = existing
    ? (canonicalCountry(existing.country) ?? "KE")
    : (canonicalCountry(searchParams.get("country")) ?? "KE")
  const startingCity = existing ? existing.city : (searchParams.get("city") ?? "").trim().slice(0, 80)
  const categoryParam = searchParams.get("category")
  const startingCategory = existing?.category ?? (isCategoryId(categoryParam) ? categoryParam : null)
  const seeded = existing
    ? findSubcategory(existing.category, existing.subcategory)
    : startingCategory
      ? findSubcategory(startingCategory, searchParams.get("type") ?? undefined)
      : undefined
  const { addListing, updateListing } = useMarketplace()

  const [step, setStep] = useState(seeded ? 2 : existing ? 1 : 0)
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

  const plan = category ? categoryPlan(category) : null
  const subcategory = category ? findSubcategory(category, subcategoryId ?? undefined) : undefined
  const activePeriod = subcategory?.periods.includes(period) ? period : (subcategory?.periods[0] ?? period)
  const suffix = subcategory?.priceSuffix ?? pricePeriod(activePeriod).suffix
  const prefilledPlace = !existing && Boolean(searchParams.get("country") || searchParams.get("city"))
  const callingCode = getCountry(country)?.callingCode
  const currencies = currencyChoices(country, currency)
  const countryOptions = [...countries].sort((a, b) => a.name.localeCompare(b.name))

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
  }

  function chooseSubcategory(next: Subcategory) {
    if (next.id !== subcategoryId) setDetails({})
    setSubcategoryId(next.id)
    setPeriod(next.periods[0])
    setErrors({})
  }

  function setDetail(id: string, value: string) {
    setDetails((current) => ({ ...current, [id]: value }))
    setErrors((current) => ({ ...current, [id]: undefined }))
  }

  function onFile(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setErrors((current) => ({ ...current, image: "Choose a photo." }))
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
    const errors = currentErrors()
    delete errors.city
    delete errors.phone
    return errors
  }

  function contactErrors(): FieldErrors {
    const errors = currentErrors()
    return { city: errors.city, phone: errors.phone }
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

  function goNext() {
    if (step === 0) {
      if (!category) return
      moveTo(1)
      return
    }
    if (step === 1) {
      if (!subcategory) return
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

  const cardLine = subcategory ? listingMeta(preview) : undefined

  return (
    <div className="mx-auto grid w-full max-w-[1100px] gap-8 px-4 py-8 md:px-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{existing ? "Edit your ad" : "Post an ad"}</h1>
        <p className="mt-1 max-w-xl text-sm text-neutral-500">
          {existing
            ? "Change the type, the facts, or the phone number. This ad stays on the board."
            : "Four steps. The type you pick decides the questions, the line on the card, and the headings on the listing."}
        </p>
        <ol className="mt-5 flex flex-wrap gap-2" aria-label="Posting steps">
          {steps.map((label, index) => (
            <li key={label}>
              <button
                type="button"
                disabled={!existing && index > step}
                onClick={() => moveTo(index)}
                className={cn(
                  "inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs whitespace-nowrap",
                  index === step
                    ? "bg-neutral-950 font-medium text-white"
                    : "bg-neutral-100 text-neutral-600 hover:text-neutral-950 disabled:hover:text-neutral-600",
                )}
                aria-current={index === step ? "step" : undefined}
              >
                <span>{index + 1}</span>
                {label}
              </button>
            </li>
          ))}
        </ol>

        <form
          className="mt-6 grid gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            if (step < 3 && !existing) goNext()
            else submit()
          }}
        >
          {step === 0 ? (
            <section className="grid gap-4">
              <ol className="grid gap-2 text-sm text-neutral-600">
                <li><span className="font-medium text-neutral-950">1. Category.</span> Vehicles, property, jobs, and the rest of the board.</li>
                <li><span className="font-medium text-neutral-950">2. Type.</span> A car is not a pickup, and a monthly rental is not a job.</li>
                <li><span className="font-medium text-neutral-950">3. Details.</span> Only the facts for that type. They are saved on the card and the listing.</li>
                <li><span className="font-medium text-neutral-950">4. Place and phone.</span> The city, and a number people can actually use.</li>
              </ol>
              {prefilledPlace ? (
                <p className="rounded-xl bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
                  Starting in {city.trim() || "the city you choose"}, {countryName(country)}. You can change the place on the last step.
                </p>
              ) : null}
              <h2 className="text-sm font-medium">Start with a category</h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                        "flex items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm",
                        selected ? "border-neutral-950 bg-neutral-50 font-medium" : "border-neutral-200 hover:border-neutral-400",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      {categoryName(item.id)}
                    </button>
                  )
                })}
              </div>
            </section>
          ) : null}

          {step === 1 && plan ? (
            <section className="grid gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">{plan.prompt}</h2>
                <p className="mt-1 text-sm text-neutral-500">{plan.intro}</p>
              </div>
              <div className="grid gap-2">
                {plan.subcategories.map((item) => {
                  const selected = subcategoryId === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => chooseSubcategory(item)}
                      className={cn(
                        "rounded-xl border px-3 py-3 text-left",
                        selected ? "border-neutral-950 bg-neutral-50" : "border-neutral-200 hover:border-neutral-400",
                      )}
                    >
                      <span className="block text-sm font-medium">{item.name}</span>
                      <span className="mt-0.5 block text-xs text-neutral-500">{item.summary}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          ) : null}

          {step === 2 && plan && subcategory ? (
            <section className="grid gap-5">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">{categoryName(plan.id)} · {subcategory.name}</h2>
                <p className="mt-1 text-sm text-neutral-500">{subcategory.summary}</p>
                <p className="mt-2 text-xs text-neutral-500">
                  On the card: {subcategory.name}
                  {cardFactLabels(subcategory).length > 0 ? ` · ${cardFactLabels(subcategory).join(" · ")}` : ""}.
                  The other answers, and your paragraph, stay on the listing page under {plan.detailHeading} and {plan.aboutHeading}.
                </p>
              </div>
              <Field label="Photo" hint={plan.photoHint} error={errors.image}>
                <Input type="file" accept="image/*" onChange={(event) => onFile(event.target.files?.[0])} className="h-10 cursor-pointer" />
              </Field>
              <Field label="Title" error={errors.title}>
                <Input
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value)
                    setErrors((current) => ({ ...current, title: undefined }))
                  }}
                  placeholder={subcategory.titlePlaceholder}
                  className="h-10"
                />
              </Field>
              <div className={cn("grid gap-5", subcategory.periods.length > 1 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
                <Field label={`${subcategory.priceLabel} (${currency})`} error={errors.price}>
                  <Input
                    inputMode="decimal"
                    value={price}
                    onChange={(event) => {
                      setPrice(event.target.value)
                      setErrors((current) => ({ ...current, price: undefined }))
                    }}
                    placeholder={subcategory.pricePlaceholder}
                    className="h-10"
                  />
                </Field>
                <Field label="Currency" error={errors.currency}>
                  <Select
                    value={currency}
                    onValueChange={(value) => {
                      if (value && currencies.includes(value)) setCurrency(value)
                      setErrors((current) => ({ ...current, currency: undefined }))
                    }}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((code) => (
                        <SelectItem key={code} value={code}>
                          {code} · {currencyLabel(code)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                {subcategory.periods.length > 1 ? (
                  <Field label="Charged" error={errors.priceSuffix}>
                    <Select
                      value={period}
                      onValueChange={(value) => {
                        if (isPricePeriodId(value) && subcategory.periods.includes(value)) setPeriod(value)
                      }}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {subcategory.periods.map((id) => (
                          <SelectItem key={id} value={id}>
                            {pricePeriod(id).label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                ) : null}
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                {subcategory.fields.map((field) => (
                  <DetailControl
                    key={field.id}
                    field={field}
                    value={details[field.id] ?? ""}
                    error={errors[field.id]}
                    onChange={(value) => setDetail(field.id, value)}
                  />
                ))}
              </div>
              <Field label={plan.descriptionLabel} error={errors.description}>
                <Textarea
                  value={description}
                  onChange={(event) => {
                    setDescription(event.target.value)
                    setErrors((current) => ({ ...current, description: undefined }))
                  }}
                  rows={5}
                  placeholder={subcategory.descriptionPlaceholder ?? plan.descriptionPlaceholder}
                />
              </Field>
              {cardLine ? (
                <p className="text-xs text-neutral-500">
                  Card line: <span className="font-medium text-neutral-800">{cardLine}</span>
                </p>
              ) : null}
              <div className="lg:hidden">
                <ListingCard listing={preview} linked={false} saveable={false} />
              </div>
            </section>
          ) : null}

          {step === 3 && plan ? (
            <section className="grid gap-5">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Where is it, and how do people reach you?</h2>
                <p className="mt-1 text-sm text-neutral-500">{plan.phoneHint}</p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Country">
                  <Select
                    value={country}
                    onValueChange={(value) => {
                      const code = canonicalCountry(value)
                      if (!code) return
                      setCountry(code)
                      setCity("")
                      setPlace(null)
                      setCurrency(getCountry(code)?.currencies[0]?.code ?? "USD")
                    }}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countryOptions.map((item) => (
                        <SelectItem key={item.code} value={item.code}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="City" error={errors.city} hint="Pick a GeoNames city, or search the map.">
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
              <Field label="Phone" error={errors.phone} hint={callingCode ? `Calling code ${callingCode}.` : undefined}>
                <Input
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value)
                    setErrors((current) => ({ ...current, phone: undefined }))
                  }}
                  placeholder={callingCode ? `${callingCode} 7XX XXX XXX` : "+254 7XX XXX XXX"}
                  className="h-10"
                />
              </Field>
              <div className="lg:hidden">
                <ListingCard listing={preview} linked={false} saveable={false} />
              </div>
            </section>
          ) : null}

          <div className="flex items-center gap-3">
            {step === 0 ? (
              <Button type="button" variant="ghost" onClick={() => router.push(existing ? `/listings/${existing.id}` : "/")}>
                Cancel
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={() => moveTo(Math.max(0, step - 1))}>
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button
                type={existing ? "button" : "submit"}
                className="h-10 rounded-full px-5"
                disabled={(step === 0 && !category) || (step === 1 && !subcategory)}
                onClick={existing ? goNext : undefined}
              >
                Continue
              </Button>
            ) : null}
            {existing || step === 3 ? (
              <Button type="submit" disabled={submitting} className="h-10 rounded-full px-5">
                {existing ? "Save changes" : "Publish ad"}
              </Button>
            ) : null}
          </div>
        </form>
      </div>
      <aside className="hidden lg:block">
        <p className="mb-3 text-xs font-medium tracking-wide text-neutral-500 uppercase">Card preview</p>
        <div className="sticky top-[85px]">
          {category ? (
            <ListingCard listing={preview} linked={false} saveable={false} />
          ) : (
            <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-8 text-sm text-neutral-500">
              The card appears here after you choose a category.
            </p>
          )}
        </div>
      </aside>
    </div>
  )
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
        <Field label={field.label} hint={field.hint} error={error}>
          <Select
            value={value || undefined}
            onValueChange={(next) => {
              if (next) onChange(next)
            }}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder={`Choose ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )
    case "text":
      return (
        <Field label={field.label} hint={field.hint} error={error}>
          <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder} className="h-10" />
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

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
      {error ? (
        <span data-field-error className="text-xs text-destructive">
          {error}
        </span>
      ) : null}
      {!error && hint ? <span className="text-xs text-neutral-500">{hint}</span> : null}
    </div>
  )
}
