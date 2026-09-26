import { categories, categoryName, type CategoryId, type Listing } from "@/lib/types"

export const pricePeriods = [
  { id: "fixed", label: "Fixed price", suffix: undefined },
  { id: "month", label: "Per month", suffix: "/ month" },
  { id: "week", label: "Per week", suffix: "/ week" },
  { id: "day", label: "Per day", suffix: "/ day" },
  { id: "night", label: "Per night", suffix: "/ night" },
  { id: "hour", label: "Per hour", suffix: "/ hour" },
] as const

export type PricePeriodId = (typeof pricePeriods)[number]["id"]

const periodIds = new Set<string>(pricePeriods.map((period) => period.id))

export function isPricePeriodId(value: string | null | undefined): value is PricePeriodId {
  return !!value && periodIds.has(value)
}

export function pricePeriod(id: PricePeriodId) {
  const match = pricePeriods.find((period) => period.id === id)
  return match ?? pricePeriods[0]
}

/** The period that produced a stored suffix, falling back to a one-off price. */
export function periodForSuffix(suffix: string | undefined, periods: readonly PricePeriodId[]): PricePeriodId {
  const allowed = periods.length > 0 ? periods : (["fixed"] as const)
  if (suffix) {
    const match = pricePeriods.find((period) => period.suffix === suffix && allowed.includes(period.id))
    if (match) return match.id
  }
  if (allowed.includes("fixed")) return "fixed"
  return allowed[0]
}

export type DetailField = {
  id: string
  label: string
  kind: "text" | "select"
  placeholder?: string
  hint?: string
  options?: readonly string[]
  required?: boolean
  /** Included on the listing card, after the type name. */
  onCard?: boolean
}

export type Subcategory = {
  id: string
  name: string
  summary: string
  titlePlaceholder: string
  priceLabel: string
  pricePlaceholder: string
  periods: readonly PricePeriodId[]
  /** Used when the charge is not one of the standard periods, for example “/ visit”. */
  priceSuffix?: string
  fields: readonly DetailField[]
  descriptionPlaceholder?: string
}

export type CategoryPlan = {
  id: CategoryId
  prompt: string
  intro: string
  detailHeading: string
  aboutHeading: string
  messageLabel: string
  messagePlaceholder: string
  dialogLead: string
  safety: string
  phoneHint: string
  photoHint: string
  descriptionLabel: string
  descriptionPlaceholder: string
  subcategories: readonly Subcategory[]
}

export type ListingVoice = {
  typeName?: string
  detailHeading: string
  aboutHeading: string
  messageLabel: string
  messagePlaceholder: string
  dialogLead: string
  safety: string
}

const condition = ["New", "Like new", "Used"] as const
const fuel = ["Petrol", "Diesel", "Hybrid", "Electric"] as const
const furnished = ["Furnished", "Unfurnished", "Partly furnished"] as const
const beds = ["Studio", "1 bed", "2 bed", "3 bed", "4 bed", "5+ bed"] as const

function text(
  id: string,
  label: string,
  placeholder: string,
  extra?: Pick<DetailField, "hint" | "required" | "onCard">,
): DetailField {
  return { id, label, kind: "text", placeholder, ...extra }
}

function select(
  id: string,
  label: string,
  options: readonly string[],
  extra?: Pick<DetailField, "hint" | "required" | "onCard">,
): DetailField {
  return { id, label, kind: "select", options, ...extra }
}

const plans = {
  vehicles: {
    id: "vehicles",
    prompt: "What kind of vehicle?",
    intro: "Year, fuel, and body type are the facts buyers compare. Those show on the card. Service history and where to view it belong in the description.",
    detailHeading: "Vehicle details",
    aboutHeading: "About this vehicle",
    messageLabel: "Message seller",
    messagePlaceholder: "Is this still available? I can view it this week.",
    dialogLead: "Ask about this vehicle.",
    safety: "Meet in a public place. Check the logbook and the engine before you pay.",
    phoneHint: "Buyers will call or WhatsApp this number to arrange a viewing.",
    photoHint: "Show the outside, the cabin, and any damage.",
    descriptionLabel: "Description",
    descriptionPlaceholder: "Service history, what comes with it, papers, and the neighbourhood where someone can view it.",
    subcategories: [
      {
        id: "cars",
        name: "Car",
        summary: "Saloon, hatchback, or SUV for sale.",
        titlePlaceholder: "Toyota Corolla 2016, one owner",
        priceLabel: "Price",
        pricePlaceholder: "8500",
        periods: ["fixed"],
        fields: [
          text("year", "Year", "2016", { required: true, onCard: true }),
          text("mileage", "Mileage", "86,000 km", { hint: "Write the unit, such as km or miles." }),
          select("fuel", "Fuel", fuel, { required: true, onCard: true }),
          select("transmission", "Transmission", ["Manual", "Automatic"]),
          select("condition", "Condition", condition, { required: true }),
        ],
      },
      {
        id: "motorcycles",
        name: "Motorcycle",
        summary: "Bike, scooter, or boda.",
        titlePlaceholder: "Honda CRF 250L",
        priceLabel: "Price",
        pricePlaceholder: "2100",
        periods: ["fixed"],
        fields: [
          text("year", "Year", "2019"),
          text("engine", "Engine", "250cc", { required: true, onCard: true }),
          text("mileage", "Mileage", "18,000 km"),
          select("condition", "Condition", condition, { required: true, onCard: true }),
        ],
      },
      {
        id: "vans",
        name: "Van or bus",
        summary: "Passenger van, minibus, or coach.",
        titlePlaceholder: "Toyota Hiace 2018, 14 seats",
        priceLabel: "Price",
        pricePlaceholder: "14500",
        periods: ["fixed"],
        fields: [
          text("year", "Year", "2018", { required: true, onCard: true }),
          text("seats", "Seats", "14 seats", { required: true, onCard: true }),
          select("fuel", "Fuel", fuel),
          select("condition", "Condition", condition, { required: true }),
        ],
      },
      {
        id: "pickups",
        name: "Pickup",
        summary: "Single cab, double cab, or 4x4 bakkie.",
        titlePlaceholder: "Toyota Hilux 2014, double cab",
        priceLabel: "Price",
        pricePlaceholder: "12000",
        periods: ["fixed"],
        fields: [
          text("year", "Year", "2014", { onCard: true }),
          select("cab", "Cab", ["Single cab", "Double cab", "Extended cab"], { onCard: true }),
          select("fuel", "Fuel", fuel, { required: true, onCard: true }),
          text("mileage", "Mileage", "140,000 km"),
          select("condition", "Condition", condition, { required: true }),
        ],
      },
    ],
  },
  property: {
    id: "property",
    prompt: "What kind of place?",
    intro: "A house for sale, a monthly rental, a shop, and a nightly stay do not share a form. Bedrooms and whether it is furnished show on the card.",
    detailHeading: "Property details",
    aboutHeading: "About this place",
    messageLabel: "Message about this place",
    messagePlaceholder: "Is this still available? I would like to view it.",
    dialogLead: "Ask about this place.",
    safety: "View it in person. Confirm who holds the title or the keys before you pay a deposit.",
    phoneHint: "People will call or WhatsApp to book a viewing.",
    photoHint: "Show the front, the main room, and the kitchen or work area.",
    descriptionLabel: "Description",
    descriptionPlaceholder: "What is included, the neighbourhood, parking, and when someone can move in or check in.",
    subcategories: [
      {
        id: "sale",
        name: "House for sale",
        summary: "A home with a sale price, not a monthly rent.",
        titlePlaceholder: "3 bedroom house in East Legon",
        priceLabel: "Asking price",
        pricePlaceholder: "95000",
        periods: ["fixed"],
        fields: [
          select("bedrooms", "Bedrooms", beds, { required: true, onCard: true }),
          select("bathrooms", "Bathrooms", ["1", "2", "3", "4+"]),
          select("furnished", "Furnished", furnished, { onCard: true }),
          select("title", "Title", ["Title deed", "Leasehold", "Still confirming"], {
            hint: "Say what you can show a buyer.",
          }),
        ],
      },
      {
        id: "rent",
        name: "House for rent",
        summary: "A house or cottage let by the month.",
        titlePlaceholder: "2 bedroom house in Kiyovu",
        priceLabel: "Monthly rent",
        pricePlaceholder: "450",
        periods: ["month"],
        fields: [
          select("bedrooms", "Bedrooms", beds, { required: true, onCard: true }),
          select("bathrooms", "Bathrooms", ["1", "2", "3", "4+"]),
          select("furnished", "Furnished", furnished, { required: true, onCard: true }),
          text("available", "Available", "1 April"),
        ],
      },
      {
        id: "apartment",
        name: "Apartment",
        summary: "A flat or studio, for sale or for rent.",
        titlePlaceholder: "Studio apartment in Ikeja",
        priceLabel: "Price",
        pricePlaceholder: "280",
        periods: ["month", "fixed"],
        descriptionPlaceholder: "Say if this is a sale or a let, what is included, and which floor it is on.",
        fields: [
          select("bedrooms", "Bedrooms", beds, { required: true, onCard: true }),
          select("furnished", "Furnished", furnished, { required: true, onCard: true }),
          text("area", "Area", "Ikeja"),
        ],
      },
      {
        id: "commercial",
        name: "Office or shop",
        summary: "A place to work or trade from.",
        titlePlaceholder: "Small office in Woodstock",
        priceLabel: "Monthly rent",
        pricePlaceholder: "600",
        periods: ["month"],
        fields: [
          select("use", "Use", ["Office", "Shop", "Warehouse", "Mixed"], { required: true, onCard: true }),
          text("size", "Size", "42 m²", { onCard: true }),
          select("furnished", "Furnished", furnished),
        ],
      },
      {
        id: "stay",
        name: "Short stay",
        summary: "A room, cottage, or guesthouse by the night.",
        titlePlaceholder: "Guest cottage in Klein Windhoek",
        priceLabel: "Price per night",
        pricePlaceholder: "65",
        periods: ["night"],
        descriptionPlaceholder: "What is included, how many people fit, and how check-in works.",
        fields: [
          text("sleeps", "Sleeps", "2 guests", { required: true, onCard: true }),
          select("place", "Place", ["Room", "Cottage", "Apartment", "Guesthouse"], { required: true, onCard: true }),
          text("beds", "Beds", "1 double"),
        ],
      },
    ],
  },
  electronics: {
    id: "electronics",
    prompt: "What kind of device?",
    intro: "A phone, a laptop, a television, and a solar kit are checked in different ways. Storage, size, or output shows on the card.",
    detailHeading: "Device details",
    aboutHeading: "About this device",
    messageLabel: "Message seller",
    messagePlaceholder: "Is this still available? Can I see it switched on?",
    dialogLead: "Ask about this device.",
    safety: "See it powered on before you pay. Agree how it will be handed over.",
    phoneHint: "Buyers will call or WhatsApp to arrange a handover.",
    photoHint: "Photograph the item switched on, plus the charger or accessories.",
    descriptionLabel: "Description",
    descriptionPlaceholder: "Battery health, what is in the box, faults, and whether you can post it.",
    subcategories: [
      {
        id: "phones",
        name: "Phone",
        summary: "A handset for sale.",
        titlePlaceholder: "iPhone 14 Pro, 256GB",
        priceLabel: "Price",
        pricePlaceholder: "420",
        periods: ["fixed"],
        fields: [
          text("brand", "Model", "iPhone 14 Pro", { required: true }),
          select("storage", "Storage", ["64GB", "128GB", "256GB", "512GB", "1TB"], { required: true, onCard: true }),
          select("condition", "Condition", condition, { required: true, onCard: true }),
        ],
      },
      {
        id: "computers",
        name: "Computer",
        summary: "A laptop or desktop.",
        titlePlaceholder: "MacBook Pro M2, 16GB",
        priceLabel: "Price",
        pricePlaceholder: "750",
        periods: ["fixed"],
        fields: [
          text("brand", "Model", "MacBook Pro M2", { required: true }),
          text("memory", "Memory", "16GB", { required: true, onCard: true }),
          text("storage", "Storage", "512GB", { required: true, onCard: true }),
          select("condition", "Condition", condition, { required: true }),
        ],
      },
      {
        id: "screens",
        name: "TV or audio",
        summary: "A television, speaker, or sound system.",
        titlePlaceholder: "Samsung 55 inch TV",
        priceLabel: "Price",
        pricePlaceholder: "220",
        periods: ["fixed"],
        fields: [
          text("brand", "Brand", "Samsung"),
          text("size", "Size", "55 inch", { required: true, onCard: true }),
          select("condition", "Condition", condition, { required: true, onCard: true }),
        ],
      },
      {
        id: "power",
        name: "Solar or power",
        summary: "A panel, inverter, battery, or starter kit.",
        titlePlaceholder: "Solar starter kit for a small shop",
        priceLabel: "Price",
        pricePlaceholder: "180",
        periods: ["fixed"],
        fields: [
          text("output", "Output", "550W", { required: true, onCard: true }),
          select("kind", "Kind", ["Panel", "Inverter", "Battery", "Kit"], { required: true, onCard: true }),
          select("condition", "Condition", condition, { required: true }),
        ],
      },
    ],
  },
  home: {
    id: "home",
    prompt: "What are you listing?",
    intro: "Furniture, appliances, and home solar each need a different fact on the card: the piece, the appliance, or the output.",
    detailHeading: "Item details",
    aboutHeading: "About this item",
    messageLabel: "Message seller",
    messagePlaceholder: "Is this still available? Can I collect it?",
    dialogLead: "Ask about this item.",
    safety: "Look it over on collection. Agree who moves it before you pay.",
    phoneHint: "Buyers will call or WhatsApp about collection.",
    photoHint: "Photograph the whole item, and any mark or wear.",
    descriptionLabel: "Description",
    descriptionPlaceholder: "Dimensions, what is included, and whether the buyer collects it.",
    subcategories: [
      {
        id: "furniture",
        name: "Furniture",
        summary: "A sofa, bed, table, or other piece.",
        titlePlaceholder: "Sofa, like new, grey fabric",
        priceLabel: "Price",
        pricePlaceholder: "180",
        periods: ["fixed"],
        fields: [
          text("piece", "Piece", "3-seater sofa", { required: true, onCard: true }),
          text("material", "Material", "Fabric"),
          select("condition", "Condition", condition, { required: true, onCard: true }),
        ],
      },
      {
        id: "appliances",
        name: "Appliance",
        summary: "A fridge, cooker, washer, or similar.",
        titlePlaceholder: "Double-door fridge",
        priceLabel: "Price",
        pricePlaceholder: "160",
        periods: ["fixed"],
        fields: [
          text("appliance", "Appliance", "Double-door fridge", { required: true, onCard: true }),
          select("condition", "Condition", condition, { required: true, onCard: true }),
        ],
      },
      {
        id: "solar",
        name: "Home solar",
        summary: "A panel or small kit for a house.",
        titlePlaceholder: "550W solar panel",
        priceLabel: "Price",
        pricePlaceholder: "90",
        periods: ["fixed"],
        fields: [
          text("output", "Output", "550W", { required: true, onCard: true }),
          select("condition", "Condition", condition, { required: true, onCard: true }),
        ],
      },
    ],
  },
  jobs: {
    id: "jobs",
    prompt: "What kind of role?",
    intro: "Pay is monthly. The card shows full-time, part-time, or contract, plus where the work happens. The description is the work itself.",
    detailHeading: "Role details",
    aboutHeading: "About this role",
    messageLabel: "Message employer",
    messagePlaceholder: "Is this role still open? I can start next month.",
    dialogLead: "Ask about this role.",
    safety: "A real employer will not ask you to pay a fee to be hired.",
    phoneHint: "Candidates will call this number. Do not ask them to pay.",
    photoHint: "Optional. A workplace or team photo is enough. Skip it if you prefer.",
    descriptionLabel: "The work",
    descriptionPlaceholder: "The duties, the experience you need, the hours, and how to apply.",
    subcategories: [
      {
        id: "full-time",
        name: "Full-time",
        summary: "A permanent role with a monthly salary.",
        titlePlaceholder: "Logistics coordinator, Nairobi",
        priceLabel: "Monthly pay",
        pricePlaceholder: "900",
        periods: ["month"],
        fields: [
          select("workplace", "Workplace", ["On site", "Hybrid", "Remote"], { required: true, onCard: true }),
          text("experience", "Experience", "2 years in freight", { required: true }),
        ],
      },
      {
        id: "part-time",
        name: "Part-time",
        summary: "Fewer days or hours, still paid by the month.",
        titlePlaceholder: "Shop assistant, three days a week",
        priceLabel: "Monthly pay",
        pricePlaceholder: "250",
        periods: ["month"],
        fields: [
          text("days", "Days", "3 days a week", { required: true, onCard: true }),
          select("workplace", "Workplace", ["On site", "Hybrid", "Remote"], { required: true }),
        ],
      },
      {
        id: "contract",
        name: "Contract",
        summary: "A fixed length, not a permanent hire.",
        titlePlaceholder: "Site supervisor, 6 month contract",
        priceLabel: "Monthly pay",
        pricePlaceholder: "1200",
        periods: ["month"],
        fields: [
          text("length", "Length", "6 months", { required: true, onCard: true }),
          select("workplace", "Workplace", ["On site", "Hybrid", "Remote"], { required: true, onCard: true }),
        ],
      },
    ],
  },
  services: {
    id: "services",
    prompt: "What work do you offer?",
    intro: "Name the trade on the card. Use the price as a starting point, a call-out, or an hourly rate, and explain what is included in the description.",
    detailHeading: "Service details",
    aboutHeading: "What is included",
    messageLabel: "Request this service",
    messagePlaceholder: "Are you free this week? The job is in my neighbourhood.",
    dialogLead: "Ask about this service.",
    safety: "Agree the price and the address before the work starts.",
    phoneHint: "Customers will call or WhatsApp to book you.",
    photoHint: "Show recent work, or the tools you bring.",
    descriptionLabel: "What is included",
    descriptionPlaceholder: "What the price covers, where you travel, and how soon you can come.",
    subcategories: [
      {
        id: "repairs",
        name: "Home repair",
        summary: "Plumbing, electrical, carpentry, and similar call-outs.",
        titlePlaceholder: "Plumbing call-out in Nairobi",
        priceLabel: "Call-out from",
        pricePlaceholder: "25",
        periods: ["fixed", "hour"],
        fields: [
          select("trade", "Trade", ["Plumbing", "Electrical", "Carpentry", "Painting", "Other"], {
            required: true,
            onCard: true,
          }),
          text("area", "Area covered", "Nairobi and Kiambu", { required: true }),
        ],
      },
      {
        id: "beauty",
        name: "Beauty",
        summary: "Hair, braiding, nails, or makeup.",
        titlePlaceholder: "Hair braiding at home",
        priceLabel: "Starting price",
        pricePlaceholder: "15",
        periods: ["fixed"],
        fields: [
          text("service", "Service", "Knotless braids", { required: true, onCard: true }),
          select("place", "Where", ["At your home", "At my salon", "Either"], { required: true, onCard: true }),
        ],
      },
      {
        id: "moving",
        name: "Moving",
        summary: "A truck and a crew for a house or office move.",
        titlePlaceholder: "House moving, one truck",
        priceLabel: "Price per move",
        pricePlaceholder: "80",
        periods: ["fixed"],
        priceSuffix: "/ move",
        fields: [
          text("vehicle", "Vehicle", "One truck", { required: true, onCard: true }),
          text("area", "Area covered", "Dar es Salaam", { required: true }),
        ],
      },
      {
        id: "tailoring",
        name: "Tailoring",
        summary: "Alterations, repairs, or made to measure.",
        titlePlaceholder: "Same-day alterations",
        priceLabel: "Starting price",
        pricePlaceholder: "8",
        periods: ["fixed"],
        fields: [
          text("turnaround", "Turnaround", "Same day", { required: true, onCard: true }),
          select("place", "Where", ["At my shop", "I collect", "Either"], { onCard: true }),
        ],
      },
      {
        id: "events",
        name: "Catering",
        summary: "Food for a gathering, priced so a host can plan.",
        titlePlaceholder: "Event catering, trays",
        priceLabel: "Price per tray",
        pricePlaceholder: "20",
        periods: ["fixed"],
        priceSuffix: "/ tray",
        fields: [
          text("offer", "Offer", "Per tray", { required: true, onCard: true }),
          text("serves", "Serves", "Feeds 8", { onCard: true }),
        ],
      },
    ],
  },
  business: {
    id: "business",
    prompt: "What equipment is it?",
    intro: "Machines, containers, generators, and hire gear. Put the size or output on the card, and hours, papers, and delivery in the description.",
    detailHeading: "Equipment details",
    aboutHeading: "About this equipment",
    messageLabel: "Message seller",
    messagePlaceholder: "Is this still available? Can I inspect it on site?",
    dialogLead: "Ask about this equipment.",
    safety: "Inspect it running, if it runs. Confirm delivery and who owns it before you pay.",
    phoneHint: "Buyers will call or WhatsApp to arrange an inspection.",
    photoHint: "Show the whole machine and the plate or serial number if you can.",
    descriptionLabel: "Description",
    descriptionPlaceholder: "Hours, service records, whether it is running, and if you can deliver.",
    subcategories: [
      {
        id: "machinery",
        name: "Machine",
        summary: "An excavator, tractor-sized plant, or workshop machine.",
        titlePlaceholder: "CAT 320D excavator",
        priceLabel: "Price",
        pricePlaceholder: "48000",
        periods: ["fixed"],
        fields: [
          text("machine", "Machine", "Excavator", { required: true, onCard: true }),
          text("year", "Year", "2012", { onCard: true }),
          select("condition", "Condition", condition, { required: true }),
        ],
      },
      {
        id: "containers",
        name: "Container",
        summary: "A shipping container for storage or conversion.",
        titlePlaceholder: "20ft shipping container",
        priceLabel: "Price",
        pricePlaceholder: "1800",
        periods: ["fixed"],
        fields: [
          select("size", "Size", ["20ft", "40ft", "Other"], { required: true, onCard: true }),
          select("condition", "Condition", ["Wind and watertight", "Needs work", "For scrap"], {
            required: true,
            onCard: true,
          }),
        ],
      },
      {
        id: "generators",
        name: "Generator",
        summary: "A generator for sale, sized in kVA.",
        titlePlaceholder: "50kVA diesel generator",
        priceLabel: "Price",
        pricePlaceholder: "6500",
        periods: ["fixed"],
        fields: [
          text("output", "Output", "50kVA", { required: true, onCard: true }),
          select("fuel", "Fuel", ["Diesel", "Petrol"], { required: true }),
          select("condition", "Condition", condition, { required: true, onCard: true }),
        ],
      },
      {
        id: "hire",
        name: "Equipment hire",
        summary: "Something you rent out by the day or weekend.",
        titlePlaceholder: "Generator hire for a weekend",
        priceLabel: "Hire price",
        pricePlaceholder: "90",
        periods: ["day", "week"],
        fields: [
          text("item", "Item", "Generator", { required: true, onCard: true }),
          text("minimum", "Minimum", "Weekend", { required: true, onCard: true }),
        ],
      },
    ],
  },
  agriculture: {
    id: "agriculture",
    prompt: "What are you offering?",
    intro: "A tractor, land, an animal, and a bag of seed are different ads. The card carries the one fact a farmer scans for: the machine, the acres, the animal, or the pack.",
    detailHeading: "Listing details",
    aboutHeading: "About this listing",
    messageLabel: "Message seller",
    messagePlaceholder: "Is this still available? I can come to the farm.",
    dialogLead: "Ask about this listing.",
    safety: "See land, stock, or machinery yourself before you pay.",
    phoneHint: "Buyers will call or WhatsApp to arrange a visit.",
    photoHint: "Show the land, the animal, the machine, or the pack.",
    descriptionLabel: "Description",
    descriptionPlaceholder: "Where it is, what has been done to it, and how collection or transfer works.",
    subcategories: [
      {
        id: "machinery",
        name: "Farm machine",
        summary: "A tractor, implement, or other farm machine.",
        titlePlaceholder: "John Deere 5075E tractor",
        priceLabel: "Price",
        pricePlaceholder: "32000",
        periods: ["fixed"],
        fields: [
          text("machine", "Machine", "Tractor", { required: true, onCard: true }),
          text("year", "Year", "2018", { onCard: true }),
          select("condition", "Condition", condition, { required: true }),
        ],
      },
      {
        id: "land",
        name: "Land",
        summary: "Farmland or a plot, with the size on the card.",
        titlePlaceholder: "5 acres of farmland near Arusha",
        priceLabel: "Price",
        pricePlaceholder: "18000",
        periods: ["fixed"],
        fields: [
          text("size", "Size", "5 acres", { required: true, onCard: true }),
          select("title", "Papers", ["Title deed", "Offer letter", "Still confirming"], { required: true }),
          text("use", "Current use", "Maize", { onCard: true }),
        ],
      },
      {
        id: "livestock",
        name: "Livestock",
        summary: "An animal or a small herd.",
        titlePlaceholder: "In-calf dairy cow",
        priceLabel: "Price",
        pricePlaceholder: "700",
        periods: ["fixed"],
        fields: [
          text("animal", "Animal", "Dairy cow", { required: true, onCard: true }),
          text("count", "Count", "1", { required: true }),
          text("detail", "Detail", "In-calf", { onCard: true }),
        ],
      },
      {
        id: "produce",
        name: "Seed or produce",
        summary: "Seed, seedlings, or a harvested crop, sold by the pack.",
        titlePlaceholder: "Certified maize seed, 50kg",
        priceLabel: "Price",
        pricePlaceholder: "35",
        periods: ["fixed"],
        fields: [
          text("crop", "Crop", "Maize seed", { required: true, onCard: true }),
          text("pack", "Pack", "50kg", { required: true, onCard: true }),
        ],
      },
    ],
  },
  fashion: {
    id: "fashion",
    prompt: "What are you selling?",
    intro: "Clothing, fabric, and shoes. Put the size, length, or size range on the card so a buyer knows if it fits before they open the ad.",
    detailHeading: "Item details",
    aboutHeading: "About this item",
    messageLabel: "Message seller",
    messagePlaceholder: "Is this still available? Can you confirm the size?",
    dialogLead: "Ask about this item.",
    safety: "Check the cloth and the size on collection, or agree the return before you pay for delivery.",
    phoneHint: "Buyers will call or WhatsApp about size and collection.",
    photoHint: "Photograph the cloth, the label, and the full piece.",
    descriptionLabel: "Description",
    descriptionPlaceholder: "Fabric, colour, how many pieces, and whether you can post it.",
    subcategories: [
      {
        id: "clothing",
        name: "Clothing",
        summary: "One piece or a bulk lot.",
        titlePlaceholder: "Women's clothing, bulk bale",
        priceLabel: "Price",
        pricePlaceholder: "120",
        periods: ["fixed"],
        fields: [
          text("item", "Item", "Women's tops", { required: true, onCard: true }),
          text("sizes", "Sizes", "Mixed", { required: true, onCard: true }),
          select("condition", "Condition", ["New", "Like new", "Used", "Bulk, unchecked"], { required: true }),
        ],
      },
      {
        id: "fabric",
        name: "Fabric",
        summary: "Cloth sold by the length.",
        titlePlaceholder: "Ankara, 6 yards",
        priceLabel: "Price",
        pricePlaceholder: "18",
        periods: ["fixed"],
        fields: [
          text("fabric", "Fabric", "Ankara", { required: true, onCard: true }),
          text("length", "Length", "6 yards", { required: true, onCard: true }),
        ],
      },
      {
        id: "shoes",
        name: "Shoes",
        summary: "A pair or a mixed lot.",
        titlePlaceholder: "Sneakers, mixed sizes",
        priceLabel: "Price",
        pricePlaceholder: "40",
        periods: ["fixed"],
        fields: [
          text("item", "Item", "Sneakers", { required: true, onCard: true }),
          text("sizes", "Sizes", "Mixed", { required: true, onCard: true }),
          select("condition", "Condition", condition, { required: true }),
        ],
      },
    ],
  },
  health: {
    id: "health",
    prompt: "What are you offering?",
    intro: "A room for a practice and a home visit are different offers. The card says which, and the description says what is included.",
    detailHeading: "Offer details",
    aboutHeading: "What is included",
    messageLabel: "Message about this offer",
    messagePlaceholder: "Is this still available? I would like to know what is included.",
    dialogLead: "Ask about this offer.",
    safety: "Confirm qualifications and what the fee covers before you book or pay a deposit.",
    phoneHint: "People will call or WhatsApp to ask what is included.",
    photoHint: "Show the room, or skip the photo for a home visit.",
    descriptionLabel: "What is included",
    descriptionPlaceholder: "Who it is for, what the fee covers, and when you are available.",
    subcategories: [
      {
        id: "space",
        name: "Clinic space",
        summary: "A room or clinic let to a practitioner.",
        titlePlaceholder: "Consultation room to let",
        priceLabel: "Monthly rent",
        pricePlaceholder: "400",
        periods: ["month"],
        fields: [
          text("use", "Use", "Consultation room", { required: true, onCard: true }),
          text("size", "Size", "One room", { onCard: true }),
        ],
      },
      {
        id: "care",
        name: "Home care",
        summary: "A visit from a nurse or carer.",
        titlePlaceholder: "Home nursing visit",
        priceLabel: "Price per visit",
        pricePlaceholder: "20",
        periods: ["fixed"],
        priceSuffix: "/ visit",
        fields: [
          text("service", "Service", "Nursing visit", { required: true, onCard: true }),
          text("who", "Who visits", "Registered nurse", { required: true, onCard: true }),
        ],
      },
    ],
  },
  education: {
    id: "education",
    prompt: "What are you offering?",
    intro: "Books and lessons use different questions. The card shows the level or the subject. The description says what the learner actually gets.",
    detailHeading: "Offer details",
    aboutHeading: "About this offer",
    messageLabel: "Message about this offer",
    messagePlaceholder: "Is this still available? The learner is in Form 4.",
    dialogLead: "Ask about this offer.",
    safety: "Agree the level, the place, and the fee before the first lesson or before you pay for books by post.",
    phoneHint: "Parents and students will call or WhatsApp.",
    photoHint: "Photograph the books, or a class if you are offering lessons.",
    descriptionLabel: "Description",
    descriptionPlaceholder: "The syllabus or the book list, where you meet, and what the fee covers.",
    subcategories: [
      {
        id: "materials",
        name: "Books",
        summary: "Textbooks, a set, or other learning materials.",
        titlePlaceholder: "Form 4 textbook set",
        priceLabel: "Price",
        pricePlaceholder: "30",
        periods: ["fixed"],
        fields: [
          text("level", "Level", "Form 4", { required: true, onCard: true }),
          text("subject", "Subject", "Full set", { onCard: true }),
          select("condition", "Condition", condition, { required: true }),
        ],
      },
      {
        id: "lessons",
        name: "Lessons",
        summary: "Tutoring or a class, usually priced per hour.",
        titlePlaceholder: "After-school maths tutoring",
        priceLabel: "Price per hour",
        pricePlaceholder: "8",
        periods: ["hour"],
        fields: [
          text("subject", "Subject", "Maths", { required: true, onCard: true }),
          text("level", "Level", "Secondary", { required: true, onCard: true }),
          select("format", "Format", ["At my place", "At the student's home", "Online"], { required: true }),
        ],
      },
    ],
  },
  community: {
    id: "community",
    prompt: "What can people use?",
    intro: "A hall for hire and a set of chairs are different. Capacity or quantity shows on the card. The description says what else is included.",
    detailHeading: "Listing details",
    aboutHeading: "What is included",
    messageLabel: "Message about this listing",
    messagePlaceholder: "Is this free on Saturday? We are about 40 people.",
    dialogLead: "Ask about this listing.",
    safety: "Confirm the date, the fee, and what you must return before you pay.",
    phoneHint: "People will call or WhatsApp to check a date or collect the items.",
    photoHint: "Show the hall, or the items as a set.",
    descriptionLabel: "What is included",
    descriptionPlaceholder: "What the fee covers, the rules, and how booking or collection works.",
    subcategories: [
      {
        id: "venues",
        name: "Venue",
        summary: "A hall or ground people can hire.",
        titlePlaceholder: "Community hall for a Saturday",
        priceLabel: "Price per day",
        pricePlaceholder: "50",
        periods: ["day"],
        fields: [
          text("space", "Space", "Hall", { required: true, onCard: true }),
          text("capacity", "Capacity", "80 people", { required: true, onCard: true }),
        ],
      },
      {
        id: "goods",
        name: "Shared goods",
        summary: "Chairs, tents, or other items for an event.",
        titlePlaceholder: "Plastic chairs, set of 40",
        priceLabel: "Price",
        pricePlaceholder: "70",
        periods: ["fixed", "day"],
        fields: [
          text("item", "Item", "Plastic chairs", { required: true, onCard: true }),
          text("quantity", "Quantity", "40", { required: true, onCard: true }),
          select("condition", "Condition", condition),
        ],
      },
    ],
  },
} as const satisfies Record<CategoryId, CategoryPlan>

export function categoryPlan(id: CategoryId): CategoryPlan {
  return plans[id]
}

export function postingPlans(): CategoryPlan[] {
  return categories.map((category) => plans[category.id])
}

export function findSubcategory(category: CategoryId, id: string | undefined): Subcategory | undefined {
  if (!id) return undefined
  return plans[category].subcategories.find((subcategory) => subcategory.id === id)
}

export function listingVoice(listing: Listing): ListingVoice {
  const plan = plans[listing.category]
  const subcategory = findSubcategory(listing.category, listing.subcategory)
  return {
    typeName: subcategory?.name,
    detailHeading: plan.detailHeading,
    aboutHeading: plan.aboutHeading,
    messageLabel: plan.messageLabel,
    messagePlaceholder: plan.messagePlaceholder,
    dialogLead: plan.dialogLead,
    safety: plan.safety,
  }
}

export function listingMeta(listing: Listing): string | undefined {
  const subcategory = findSubcategory(listing.category, listing.subcategory)
  if (subcategory) {
    const facts = subcategory.fields
      .filter((field) => field.onCard)
      .map((field) => listing.details?.[field.id]?.trim())
      .filter((value): value is string => !!value)
      .slice(0, 2)
    const line = [subcategory.name, ...facts].join(" · ")
    if (line) return line
  }
  const meta = listing.meta?.trim()
  return meta || undefined
}

export function listingFacts(listing: Listing): { label: string; value: string }[] {
  const subcategory = findSubcategory(listing.category, listing.subcategory)
  if (!subcategory || !listing.details) {
    return listing.condition ? [{ label: "Condition", value: listing.condition }] : []
  }
  return subcategory.fields.flatMap((field) => {
    const value = listing.details?.[field.id]?.trim()
    return value ? [{ label: field.label, value }] : []
  })
}

export function listingSearchBits(listing: Listing): string[] {
  const subcategory = findSubcategory(listing.category, listing.subcategory)
  const details = listing.details ? Object.values(listing.details) : []
  return [categoryName(listing.category), subcategory?.name ?? "", listing.meta ?? "", ...details]
}

export function cardFactLabels(subcategory: Subcategory): string[] {
  return subcategory.fields.filter((field) => field.onCard).map((field) => field.label)
}

/** Facts for the sample ads, so the board uses the same lines as a new post. */
export const seedPosting: Record<string, { subcategory: string; details: Record<string, string> }> = {
  "land-cruiser-79": { subcategory: "pickups", details: { fuel: "Diesel", condition: "Used" } },
  "honda-crf-250l": { subcategory: "motorcycles", details: { engine: "250cc", condition: "Used" } },
  "hiace-2018": { subcategory: "vans", details: { year: "2018", seats: "14 seats", fuel: "Diesel", condition: "Used" } },
  "corolla-2016": { subcategory: "cars", details: { year: "2016", fuel: "Petrol", transmission: "Automatic", condition: "Used" } },
  "ranger-lusaka": { subcategory: "pickups", details: { cab: "Double cab", fuel: "Diesel", condition: "Used" } },
  "bajaj-kampala": { subcategory: "motorcycles", details: { engine: "150cc", condition: "Used" } },
  "hilux-gaborone": { subcategory: "pickups", details: { year: "2014", cab: "Single cab", fuel: "Petrol", condition: "Used" } },
  "kigali-house": { subcategory: "rent", details: { bedrooms: "2 bed", furnished: "Furnished", available: "Next month" } },
  "house-accra": { subcategory: "sale", details: { bedrooms: "3 bed", bathrooms: "2", title: "Title deed" } },
  "studio-lagos": { subcategory: "apartment", details: { bedrooms: "Studio", furnished: "Unfurnished", area: "Ikeja" } },
  "office-cape-town": { subcategory: "commercial", details: { use: "Office", size: "42 m²" } },
  "cottage-windhoek": { subcategory: "stay", details: { sleeps: "2 guests", place: "Cottage", beds: "1 bedroom" } },
  "riad-room": { subcategory: "stay", details: { sleeps: "2 guests", place: "Room" } },
  "macbook-pro-m2": { subcategory: "computers", details: { brand: "MacBook Pro M2", memory: "16GB", storage: "512GB", condition: "Like new" } },
  "iphone-14-pro": { subcategory: "phones", details: { brand: "iPhone 14 Pro", storage: "256GB", condition: "Used" } },
  "samsung-tv": { subcategory: "screens", details: { brand: "Samsung", size: "55 inch", condition: "Used" } },
  "solar-lilongwe": { subcategory: "power", details: { output: "200W", kind: "Kit", condition: "New" } },
  "sofa-accra": { subcategory: "furniture", details: { piece: "Sofa", condition: "Like new" } },
  "solar-panel-550": { subcategory: "solar", details: { output: "550W", condition: "New" } },
  "dining-nairobi": { subcategory: "furniture", details: { piece: "Dining set", condition: "Used" } },
  "fridge-mombasa": { subcategory: "appliances", details: { appliance: "Fridge", condition: "Used" } },
  "bed-kigali": { subcategory: "furniture", details: { piece: "King bed", condition: "Used" } },
  "logistics-coordinator": { subcategory: "full-time", details: { workplace: "On site", experience: "2 years in freight" } },
  "teacher-accra": { subcategory: "full-time", details: { workplace: "On site", experience: "Primary teaching" } },
  "sales-lagos": { subcategory: "full-time", details: { workplace: "On site", experience: "Shop floor" } },
  "plumbing-nairobi": { subcategory: "repairs", details: { trade: "Plumbing", area: "Nairobi" } },
  "braiding-accra": { subcategory: "beauty", details: { service: "Braiding", place: "Either" } },
  "moving-dar": { subcategory: "moving", details: { vehicle: "One truck", area: "Dar es Salaam" } },
  "tailor-dakar": { subcategory: "tailoring", details: { turnaround: "Same day", place: "At my shop" } },
  "catering-abidjan": { subcategory: "events", details: { offer: "Jollof and fish", serves: "About 12" } },
  "container-mombasa": { subcategory: "containers", details: { size: "20ft", condition: "Wind and watertight" } },
  "generator-lagos": { subcategory: "generators", details: { output: "50kVA", fuel: "Diesel", condition: "Used" } },
  "cat-320d": { subcategory: "machinery", details: { machine: "Excavator", condition: "Used" } },
  "generator-hire-luanda": { subcategory: "hire", details: { item: "30kVA generator", minimum: "Weekend" } },
  "john-deere-5075e": { subcategory: "machinery", details: { machine: "Tractor", condition: "Used" } },
  "farmland-arusha": { subcategory: "land", details: { size: "5 acres", title: "Title deed", use: "Maize" } },
  "dairy-cow-lusaka": { subcategory: "livestock", details: { animal: "Dairy cow", count: "1", detail: "In-calf" } },
  "maize-nakuru": { subcategory: "produce", details: { crop: "Maize seed", pack: "50kg" } },
  "cocoa-douala": { subcategory: "produce", details: { crop: "Cocoa seedlings", pack: "Tray of 50" } },
  "coffee-addis": { subcategory: "produce", details: { crop: "Coffee", pack: "1kg" } },
  "womens-clothing-bulk": { subcategory: "clothing", details: { item: "Women's clothing", sizes: "Mixed", condition: "New" } },
  "ankara-kumasi": { subcategory: "fabric", details: { fabric: "Ankara", length: "6 yards" } },
  "sneakers-lagos": { subcategory: "shoes", details: { item: "Sneakers", sizes: "Mixed", condition: "New" } },
  "clinic-room-addis": { subcategory: "space", details: { use: "Consultation room", size: "One room" } },
  "nursing-kampala": { subcategory: "care", details: { service: "Nursing visit", who: "Registered nurse" } },
  "textbooks-nairobi": { subcategory: "materials", details: { level: "Form 4", subject: "Textbook set", condition: "Used" } },
  "tutoring-kigali": { subcategory: "lessons", details: { subject: "Maths", level: "After school", format: "At my place" } },
  "arabic-cairo": { subcategory: "lessons", details: { subject: "Arabic", level: "Adults", format: "At my place" } },
  "hall-maputo": { subcategory: "venues", details: { space: "Hall", capacity: "80 people" } },
  "chairs-entebbe": { subcategory: "goods", details: { item: "Plastic chairs", quantity: "40", condition: "Used" } },
}
