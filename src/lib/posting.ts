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
      {
        id: "trucks",
        name: "Truck",
        summary: "A lorry or tipper for goods.",
        titlePlaceholder: "Isuzu FRR, 5 tonne",
        priceLabel: "Price",
        pricePlaceholder: "22000",
        periods: ["fixed"],
        fields: [
          text("year", "Year", "2015", { required: true, onCard: true }),
          text("capacity", "Capacity", "5 tonne", { required: true, onCard: true }),
          select("fuel", "Fuel", fuel),
          select("condition", "Condition", condition, { required: true }),
        ],
      },
      {
        id: "tricycles",
        name: "Tricycle",
        summary: "A keke, bajaj, or tuk-tuk.",
        titlePlaceholder: "TVS King, registered",
        priceLabel: "Price",
        pricePlaceholder: "2800",
        periods: ["fixed"],
        fields: [
          text("year", "Year", "2020", { onCard: true }),
          select("use", "Use", ["Passenger", "Goods"], { required: true, onCard: true }),
          select("condition", "Condition", condition, { required: true }),
        ],
      },
      {
        id: "bicycles",
        name: "Bicycle",
        summary: "A bicycle for town or the road.",
        titlePlaceholder: "Mountain bike, 26 inch",
        priceLabel: "Price",
        pricePlaceholder: "120",
        periods: ["fixed"],
        fields: [
          text("size", "Size", "26 inch", { required: true, onCard: true }),
          select("condition", "Condition", condition, { required: true, onCard: true }),
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
      {
        id: "room",
        name: "Room",
        summary: "A single room or bedsitter.",
        titlePlaceholder: "Bedsitter in Umoja",
        priceLabel: "Monthly rent",
        pricePlaceholder: "80",
        periods: ["month"],
        fields: [
          select("kind", "Kind", ["Single room", "Bedsitter", "Shared room"], { required: true, onCard: true }),
          select("furnished", "Furnished", furnished, { required: true, onCard: true }),
          text("area", "Area", "Umoja"),
        ],
      },
      {
        id: "hostel",
        name: "Hostel",
        summary: "A student or worker hostel bed.",
        titlePlaceholder: "Hostel bed near campus",
        priceLabel: "Monthly rent",
        pricePlaceholder: "40",
        periods: ["month"],
        fields: [
          select("sharing", "Sharing", ["Single", "Two to a room", "Dorm"], { required: true, onCard: true }),
          text("who", "Who it is for", "Students", { required: true, onCard: true }),
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
    intro: "Pay can be monthly or by the day. The card shows the kind of role and where the work happens. The description is the work itself.",
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
      {
        id: "casual",
        name: "Day labour",
        summary: "Paid by the day, not a monthly salary.",
        titlePlaceholder: "Site labour, paid daily",
        priceLabel: "Daily pay",
        pricePlaceholder: "8",
        periods: ["day"],
        fields: [
          text("work", "Work", "Loading and mixing", { required: true, onCard: true }),
          text("place", "Place", "A building site", { required: true, onCard: true }),
        ],
      },
      {
        id: "domestic",
        name: "Domestic work",
        summary: "House help, cooking, or childcare in a home.",
        titlePlaceholder: "House help, five days",
        priceLabel: "Monthly pay",
        pricePlaceholder: "120",
        periods: ["month"],
        fields: [
          text("work", "Work", "Cleaning and cooking", { required: true, onCard: true }),
          text("days", "Days", "5 days a week", { required: true, onCard: true }),
        ],
      },
      {
        id: "internship",
        name: "Internship",
        summary: "A placement for someone still learning the work.",
        titlePlaceholder: "Accounts internship, 3 months",
        priceLabel: "Monthly stipend",
        pricePlaceholder: "150",
        periods: ["month"],
        fields: [
          text("length", "Length", "3 months", { required: true, onCard: true }),
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
      {
        id: "phones",
        name: "Phone repair",
        summary: "Screen, battery, or charging-port repair.",
        titlePlaceholder: "Phone screen replacement",
        priceLabel: "Starting price",
        pricePlaceholder: "15",
        periods: ["fixed"],
        fields: [
          text("repair", "Repair", "Screen replacement", { required: true, onCard: true }),
          text("brands", "Brands", "Samsung and iPhone", { required: true, onCard: true }),
        ],
      },
      {
        id: "photography",
        name: "Photography",
        summary: "Photos for a wedding, event, or portrait.",
        titlePlaceholder: "Wedding photography",
        priceLabel: "Starting price",
        pricePlaceholder: "200",
        periods: ["fixed"],
        fields: [
          text("event", "Event", "Wedding", { required: true, onCard: true }),
          text("coverage", "Coverage", "Full day", { required: true, onCard: true }),
        ],
      },
      {
        id: "delivery",
        name: "Delivery",
        summary: "A rider or a van that moves goods.",
        titlePlaceholder: "Same-day parcel delivery",
        priceLabel: "Starting price",
        pricePlaceholder: "3",
        periods: ["fixed"],
        fields: [
          text("vehicle", "Vehicle", "Motorbike", { required: true, onCard: true }),
          text("area", "Area covered", "Within the city", { required: true, onCard: true }),
        ],
      },
    ],
  },
  transport: {
    id: "transport",
    prompt: "What transport or logistics service?",
    intro: "State the vehicle, load or route clearly so customers can compare capacity and coverage.",
    detailHeading: "Transport details",
    aboutHeading: "About this service",
    messageLabel: "Message provider",
    messagePlaceholder: "Is this service available for my route?",
    dialogLead: "Ask about this transport service.",
    safety: "Confirm the operator, vehicle and insurance before handing over goods or paying a deposit.",
    phoneHint: "Customers can call or WhatsApp to confirm a route and collection.",
    photoHint: "Show the vehicle, load area and identifying details without exposing private documents.",
    descriptionLabel: "Service description",
    descriptionPlaceholder: "Routes, capacity, timing, loading help, insurance and what the quoted price includes.",
    subcategories: [
      { id: "freight", name: "Freight & haulage", summary: "Trucks moving commercial or bulk loads.", titlePlaceholder: "10-tonne haulage within Nairobi", priceLabel: "Starting price", pricePlaceholder: "200", periods: ["fixed"], fields: [text("vehicle", "Vehicle", "10-tonne truck", { required: true, onCard: true }), text("capacity", "Capacity", "10 tonnes", { required: true, onCard: true }), text("route", "Route", "Nairobi to Mombasa", { required: true })] },
      { id: "courier", name: "Courier & delivery", summary: "Parcels and last-mile deliveries.", titlePlaceholder: "Same-day city courier", priceLabel: "Starting price", pricePlaceholder: "5", periods: ["fixed"], fields: [select("vehicle", "Vehicle", ["Bicycle", "Motorbike", "Car", "Van"], { required: true, onCard: true }), text("area", "Area covered", "Within Accra", { required: true, onCard: true })] },
      { id: "moving-logistics", name: "Moving & removals", summary: "Home, office and shop moves.", titlePlaceholder: "Two-person home moving team", priceLabel: "Starting price", pricePlaceholder: "80", periods: ["fixed"], fields: [text("vehicle", "Vehicle", "3-tonne truck", { required: true, onCard: true }), select("crew", "Crew", ["Driver only", "Driver and helper", "Full moving crew"], { required: true, onCard: true })] },
      { id: "passenger", name: "Passenger transport", summary: "Taxi, shuttle, bus or charter service.", titlePlaceholder: "Airport shuttle for 7 passengers", priceLabel: "Starting price", pricePlaceholder: "25", periods: ["fixed"], fields: [text("vehicle", "Vehicle", "7-seat van", { required: true, onCard: true }), text("seats", "Seats", "7", { required: true, onCard: true }), text("route", "Route", "Airport and city") ] },
      { id: "storage", name: "Warehousing & storage", summary: "Short- or long-term goods storage.", titlePlaceholder: "Secure pallet storage", priceLabel: "Storage price", pricePlaceholder: "30", periods: ["month", "week"], fields: [text("size", "Space", "20 m²", { required: true, onCard: true }), select("access", "Access", ["Business hours", "24 hours", "By appointment"], { required: true, onCard: true })] },
    ],
  },
  energy: {
    id: "energy",
    prompt: "What energy product or service?",
    intro: "Output, fuel, storage and installation determine whether a power system fits the job.",
    detailHeading: "Energy details",
    aboutHeading: "About this system",
    messageLabel: "Message seller",
    messagePlaceholder: "Can this power my equipment?",
    dialogLead: "Ask about this energy listing.",
    safety: "Use a qualified installer and inspect batteries, wiring and fuel systems before payment.",
    phoneHint: "Buyers can call or WhatsApp to discuss sizing and installation.",
    photoHint: "Show labels, connectors and the full system without revealing serial numbers unnecessarily.",
    descriptionLabel: "Description",
    descriptionPlaceholder: "Output, age, battery health, installation, warranty and items included.",
    subcategories: [
      { id: "solar-systems", name: "Solar systems", summary: "Panels, inverters and complete solar kits.", titlePlaceholder: "3kW home solar system", priceLabel: "Price", pricePlaceholder: "1800", periods: ["fixed"], fields: [text("output", "Output", "3kW", { required: true, onCard: true }), select("kind", "System", ["Complete kit", "Panels", "Inverter", "Controller"], { required: true, onCard: true }), select("condition", "Condition", condition, { required: true })] },
      { id: "batteries", name: "Batteries & storage", summary: "Solar, backup and industrial batteries.", titlePlaceholder: "5kWh lithium battery", priceLabel: "Price", pricePlaceholder: "950", periods: ["fixed"], fields: [text("capacity", "Capacity", "5kWh", { required: true, onCard: true }), select("chemistry", "Battery type", ["Lithium", "Lead acid", "Gel", "Other"], { required: true, onCard: true }), select("condition", "Condition", condition, { required: true })] },
      { id: "generators-power", name: "Generators", summary: "Petrol, diesel and gas generators.", titlePlaceholder: "20kVA diesel generator", priceLabel: "Price", pricePlaceholder: "4200", periods: ["fixed", "day"], fields: [text("output", "Output", "20kVA", { required: true, onCard: true }), select("fuel", "Fuel", ["Diesel", "Petrol", "Gas"], { required: true, onCard: true }), select("condition", "Condition", condition, { required: true })] },
      { id: "fuel", name: "Fuel & gas", summary: "Commercial fuel, LPG and clean-cooking supply.", titlePlaceholder: "LPG cylinder exchange", priceLabel: "Price", pricePlaceholder: "35", periods: ["fixed"], fields: [select("product", "Product", ["LPG", "Cooking fuel", "Diesel supply", "Other"], { required: true, onCard: true }), text("quantity", "Quantity", "13kg", { required: true, onCard: true })] },
      { id: "installation", name: "Power installation", summary: "Solar, electrical and backup-power work.", titlePlaceholder: "Certified solar installation", priceLabel: "Starting price", pricePlaceholder: "150", periods: ["fixed"], fields: [text("service", "Service", "Solar installation", { required: true, onCard: true }), text("area", "Area covered", "Kigali", { required: true, onCard: true })] },
    ],
  },
  food: {
    id: "food",
    prompt: "What food or market goods?",
    intro: "Use the pack size, grade and minimum order so households and traders can compare like for like.",
    detailHeading: "Product details",
    aboutHeading: "About these goods",
    messageLabel: "Message seller",
    messagePlaceholder: "Is this fresh and available today?",
    dialogLead: "Ask about these goods.",
    safety: "Check freshness, seals and storage conditions. Follow local food-handling rules.",
    phoneHint: "Customers can call or WhatsApp to arrange collection or delivery.",
    photoHint: "Show the actual produce, packaging and label in good light.",
    descriptionLabel: "Description",
    descriptionPlaceholder: "Grade, source, harvest or preparation date, minimum order, storage and delivery.",
    subcategories: [
      { id: "fresh-produce", name: "Fresh produce", summary: "Fruit, vegetables and fresh crops.", titlePlaceholder: "Fresh tomatoes, 20kg crate", priceLabel: "Price", pricePlaceholder: "18", periods: ["fixed"], fields: [text("product", "Product", "Tomatoes", { required: true, onCard: true }), text("pack", "Pack", "20kg crate", { required: true, onCard: true }), select("grade", "Grade", ["Premium", "Standard", "Processing"], { required: true })] },
      { id: "grains-staples", name: "Grains & staples", summary: "Maize, rice, flour, pulses and cooking staples.", titlePlaceholder: "Clean dry maize, 90kg bag", priceLabel: "Price", pricePlaceholder: "45", periods: ["fixed"], fields: [text("product", "Product", "Maize", { required: true, onCard: true }), text("pack", "Pack", "90kg bag", { required: true, onCard: true }), select("sale", "Sale", ["Retail", "Wholesale", "Both"], { required: true })] },
      { id: "meat-fish", name: "Meat, fish & dairy", summary: "Chilled, frozen or fresh animal products.", titlePlaceholder: "Fresh tilapia by the kilo", priceLabel: "Price", pricePlaceholder: "6", periods: ["fixed"], fields: [text("product", "Product", "Tilapia", { required: true, onCard: true }), text("pack", "Pack", "Per kg", { required: true, onCard: true }), select("storage", "Storage", ["Fresh", "Chilled", "Frozen", "Shelf stable"], { required: true })] },
      { id: "prepared-food", name: "Prepared food", summary: "Meals, baked goods and ready-to-eat food.", titlePlaceholder: "Lunch trays for offices", priceLabel: "Price", pricePlaceholder: "5", periods: ["fixed"], fields: [text("product", "Food", "Lunch tray", { required: true, onCard: true }), text("serves", "Serves", "1 person", { required: true, onCard: true }), text("notice", "Order notice", "One day") ] },
      { id: "market-supplies", name: "Market & shop supplies", summary: "Packaged household goods sold retail or wholesale.", titlePlaceholder: "Cooking oil wholesale cartons", priceLabel: "Price", pricePlaceholder: "30", periods: ["fixed"], fields: [text("product", "Product", "Cooking oil", { required: true, onCard: true }), text("pack", "Pack", "Carton of 12", { required: true, onCard: true }), select("sale", "Sale", ["Retail", "Wholesale", "Both"], { required: true })] },
    ],
  },
  industrial: {
    id: "industrial",
    prompt: "What industrial or commercial item?",
    intro: "Capacity, specification and working condition help professional buyers assess equipment quickly.",
    detailHeading: "Commercial equipment details",
    aboutHeading: "About this item",
    messageLabel: "Message seller",
    messagePlaceholder: "Can I inspect this equipment running?",
    dialogLead: "Ask about this commercial item.",
    safety: "Inspect machinery under safe conditions and verify ownership, service records and delivery terms.",
    phoneHint: "Buyers can call or WhatsApp to arrange an inspection.",
    photoHint: "Show the whole item, controls and specification plate where safe.",
    descriptionLabel: "Description",
    descriptionPlaceholder: "Specification, hours, condition, service history, included tooling and delivery.",
    subcategories: [
      { id: "manufacturing", name: "Manufacturing machinery", summary: "Production, processing and workshop machinery.", titlePlaceholder: "Industrial maize milling machine", priceLabel: "Price", pricePlaceholder: "8500", periods: ["fixed"], fields: [text("machine", "Machine", "Maize mill", { required: true, onCard: true }), text("capacity", "Capacity", "1 tonne/hour", { required: true, onCard: true }), select("condition", "Condition", condition, { required: true })] },
      { id: "construction-plant", name: "Construction plant", summary: "Excavators, loaders, rollers and site plant.", titlePlaceholder: "20-tonne excavator", priceLabel: "Price", pricePlaceholder: "40000", periods: ["fixed", "day"], fields: [text("machine", "Machine", "Excavator", { required: true, onCard: true }), text("year", "Year", "2018", { onCard: true }), select("condition", "Condition", condition, { required: true })] },
      { id: "retail-equipment", name: "Retail & hospitality equipment", summary: "Shop, restaurant and hotel equipment.", titlePlaceholder: "Commercial double-door fridge", priceLabel: "Price", pricePlaceholder: "1200", periods: ["fixed"], fields: [text("item", "Equipment", "Commercial fridge", { required: true, onCard: true }), text("capacity", "Capacity", "900 litres", { onCard: true }), select("condition", "Condition", condition, { required: true })] },
      { id: "office-equipment", name: "Office equipment", summary: "Printers, copiers, furniture and office systems.", titlePlaceholder: "High-volume office copier", priceLabel: "Price", pricePlaceholder: "700", periods: ["fixed"], fields: [text("item", "Equipment", "Copier", { required: true, onCard: true }), text("brand", "Brand / model", "Canon", { onCard: true }), select("condition", "Condition", condition, { required: true })] },
      { id: "commercial-stock", name: "Wholesale & commercial stock", summary: "Bulk stock, packaging and business inventory.", titlePlaceholder: "Retail packaging in bulk", priceLabel: "Price", pricePlaceholder: "250", periods: ["fixed"], fields: [text("product", "Stock", "Food containers", { required: true, onCard: true }), text("quantity", "Quantity", "1,000 pieces", { required: true, onCard: true }), select("condition", "Condition", condition, { required: true })] },
    ],
  },
  business: {
    id: "business",
    prompt: "What are you offering?",
    intro: "Machines, containers, generators, hire gear, or a running business. Put the size, output, or the kind of shop on the card.",
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
      {
        id: "takeover",
        name: "Business for sale",
        summary: "A running shop or other business, stock optional.",
        titlePlaceholder: "Provision shop, with stock",
        priceLabel: "Asking price",
        pricePlaceholder: "8000",
        periods: ["fixed"],
        fields: [
          text("business", "Business", "Provision shop", { required: true, onCard: true }),
          select("stock", "Stock", ["Included", "Not included", "Negotiable"], { required: true, onCard: true }),
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
        summary: "Farmland, with the size on the card.",
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
  livestock: {
    id: "livestock",
    prompt: "What are you selling?",
    intro: "Cattle, goats, sheep, and poultry. The card shows the animal and how many.",
    detailHeading: "Animal details",
    aboutHeading: "About these animals",
    messageLabel: "Message seller",
    messagePlaceholder: "Is this still available? I can collect this week.",
    dialogLead: "Ask about these animals.",
    safety: "See the animals before you pay, and agree who arranges transport.",
    phoneHint: "Buyers will call or WhatsApp to arrange a visit.",
    photoHint: "Show the animals in daylight, and the pen if you can.",
    descriptionLabel: "Description",
    descriptionPlaceholder: "Age, breeding, vaccinations, and how collection works.",
    subcategories: [
      {
        id: "cattle",
        name: "Cattle",
        summary: "A cow, bull, or small herd.",
        titlePlaceholder: "In-calf dairy cow",
        priceLabel: "Price",
        pricePlaceholder: "650",
        periods: ["fixed"],
        fields: [
          text("animal", "Animal", "Dairy cow", { required: true, onCard: true }),
          text("count", "Count", "1", { required: true, onCard: true }),
          text("detail", "Detail", "In-calf"),
        ],
      },
      {
        id: "goats",
        name: "Goats and sheep",
        summary: "Goats or sheep, one animal or a group.",
        titlePlaceholder: "Galla goats, pair",
        priceLabel: "Price",
        pricePlaceholder: "180",
        periods: ["fixed"],
        fields: [
          text("animal", "Animal", "Galla goat", { required: true, onCard: true }),
          text("count", "Count", "2", { required: true, onCard: true }),
          text("detail", "Detail", "Does"),
        ],
      },
      {
        id: "poultry",
        name: "Poultry",
        summary: "Chickens or other birds, sold each or as a flock.",
        titlePlaceholder: "Layers, ten hens",
        priceLabel: "Price",
        pricePlaceholder: "90",
        periods: ["fixed"],
        fields: [
          text("animal", "Bird", "Layer hen", { required: true, onCard: true }),
          text("count", "Count", "10", { required: true, onCard: true }),
          text("detail", "Detail", "Point of lay"),
        ],
      },
      {
        id: "pigs",
        name: "Pigs",
        summary: "A pig or a small herd.",
        titlePlaceholder: "Grower pigs, four",
        priceLabel: "Price",
        pricePlaceholder: "240",
        periods: ["fixed"],
        fields: [
          text("animal", "Animal", "Grower pig", { required: true, onCard: true }),
          text("count", "Count", "4", { required: true, onCard: true }),
          text("detail", "Detail", "About 40kg"),
        ],
      },
      {
        id: "fish",
        name: "Fish",
        summary: "Fingerlings or table fish.",
        titlePlaceholder: "Catfish fingerlings",
        priceLabel: "Price",
        pricePlaceholder: "20",
        periods: ["fixed"],
        fields: [
          text("animal", "Fish", "Catfish fingerling", { required: true, onCard: true }),
          text("count", "Count", "500", { required: true, onCard: true }),
          text("detail", "Detail", "Ready to stock"),
        ],
      },
      {
        id: "other",
        name: "Other animals",
        summary: "Any other animal you keep to sell.",
        titlePlaceholder: "Rabbits, breeding trio",
        priceLabel: "Price",
        pricePlaceholder: "40",
        periods: ["fixed"],
        fields: [
          text("animal", "Animal", "Rabbit", { required: true, onCard: true }),
          text("count", "Count", "3", { required: true, onCard: true }),
          text("detail", "Detail", "Breeding trio"),
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
      {
        id: "pharmacy",
        name: "Pharmacy stock",
        summary: "Medicines or supplies sold as stock, not a prescription.",
        titlePlaceholder: "Over-the-counter stock, mixed",
        priceLabel: "Price",
        pricePlaceholder: "300",
        periods: ["fixed"],
        fields: [
          text("stock", "Stock", "OTC medicines", { required: true, onCard: true }),
          select("condition", "Condition", ["Sealed", "Short dated", "Mixed"], { required: true, onCard: true }),
        ],
      },
      {
        id: "equipment",
        name: "Medical equipment",
        summary: "A machine or fitting for a clinic.",
        titlePlaceholder: "Blood pressure monitors, set of 4",
        priceLabel: "Price",
        pricePlaceholder: "180",
        periods: ["fixed"],
        fields: [
          text("item", "Item", "Blood pressure monitor", { required: true, onCard: true }),
          select("condition", "Condition", condition, { required: true, onCard: true }),
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
  parts: {
    id: "parts",
    prompt: "What part is it?",
    intro: "Tyres, engines, and body parts. The card names the part and what it fits.",
    detailHeading: "Part details",
    aboutHeading: "About this part",
    messageLabel: "Message seller",
    messagePlaceholder: "Is this still available? Will it fit a 2016 Hilux?",
    dialogLead: "Ask about this part.",
    safety: "Check the part against the vehicle before you pay.",
    phoneHint: "Buyers will call or WhatsApp to confirm the fit.",
    photoHint: "Show the part, the markings, and any damage.",
    descriptionLabel: "Description",
    descriptionPlaceholder: "What it came off, the condition, and whether you can fit it.",
    subcategories: [
      {
        id: "tyres",
        name: "Tyres",
        summary: "A tyre or a set.",
        titlePlaceholder: "Four 265/70 R17 tyres",
        priceLabel: "Price",
        pricePlaceholder: "280",
        periods: ["fixed"],
        fields: [
          text("size", "Size", "265/70 R17", { required: true, onCard: true }),
          text("count", "Count", "4", { required: true, onCard: true }),
          select("condition", "Condition", ["New", "Used, good tread", "Used"], { required: true }),
        ],
      },
      {
        id: "engines",
        name: "Engine",
        summary: "An engine or gearbox.",
        titlePlaceholder: "2KD diesel engine",
        priceLabel: "Price",
        pricePlaceholder: "900",
        periods: ["fixed"],
        fields: [
          text("part", "Part", "2KD engine", { required: true, onCard: true }),
          text("fits", "Fits", "Hilux", { required: true, onCard: true }),
          select("condition", "Condition", condition, { required: true }),
        ],
      },
      {
        id: "body",
        name: "Body part",
        summary: "A panel, bumper, light, or interior piece.",
        titlePlaceholder: "Hilux bumper, used",
        priceLabel: "Price",
        pricePlaceholder: "120",
        periods: ["fixed"],
        fields: [
          text("part", "Part", "Front bumper", { required: true, onCard: true }),
          text("fits", "Fits", "Hilux 2012–2015", { required: true, onCard: true }),
          select("condition", "Condition", condition, { required: true }),
        ],
      },
    ],
  },
  plots: {
    id: "plots",
    prompt: "What kind of plot?",
    intro: "A town plot, not farmland. Size and papers show on the card.",
    detailHeading: "Plot details",
    aboutHeading: "About this plot",
    messageLabel: "Message about this plot",
    messagePlaceholder: "Is this plot still available? I would like to see the beacons.",
    dialogLead: "Ask about this plot.",
    safety: "Walk the beacons and confirm the title before you pay a deposit.",
    phoneHint: "Buyers will call or WhatsApp to arrange a site visit.",
    photoHint: "Show the plot, the access road, and a beacon if you can.",
    descriptionLabel: "Description",
    descriptionPlaceholder: "The size, the road, water and power nearby, and how the transfer works.",
    subcategories: [
      {
        id: "residential",
        name: "Residential plot",
        summary: "Land for a house.",
        titlePlaceholder: "50 by 100 plot in Kitengela",
        priceLabel: "Asking price",
        pricePlaceholder: "12000",
        periods: ["fixed"],
        fields: [
          text("size", "Size", "50 by 100 ft", { required: true, onCard: true }),
          select("papers", "Papers", ["Title deed", "Offer letter", "Still confirming"], { required: true, onCard: true }),
          text("access", "Access", "Murram road"),
        ],
      },
      {
        id: "commercial-plot",
        name: "Commercial plot",
        summary: "Land for a shop, yard, or mixed use.",
        titlePlaceholder: "Commercial plot on the main road",
        priceLabel: "Asking price",
        pricePlaceholder: "45000",
        periods: ["fixed"],
        fields: [
          text("size", "Size", "Quarter acre", { required: true, onCard: true }),
          select("papers", "Papers", ["Title deed", "Offer letter", "Still confirming"], { required: true, onCard: true }),
          text("frontage", "Frontage", "On the tarmac"),
        ],
      },
    ],
  },
  building: {
    id: "building",
    prompt: "What material is it?",
    intro: "Sheets, cement, timber, and plumbing. The card shows the material and the quantity.",
    detailHeading: "Material details",
    aboutHeading: "About this material",
    messageLabel: "Message seller",
    messagePlaceholder: "Is this still available? Can you deliver to my site?",
    dialogLead: "Ask about this material.",
    safety: "Check the gauge, the bags, or the timber before you pay for a full load.",
    phoneHint: "Buyers will call or WhatsApp about quantity and delivery.",
    photoHint: "Show the stack, the brand, and the gauge or size.",
    descriptionLabel: "Description",
    descriptionPlaceholder: "The gauge or brand, how it is packed, and whether you deliver.",
    subcategories: [
      {
        id: "sheets",
        name: "Iron sheets",
        summary: "Roofing sheets, sold by the piece or the bundle.",
        titlePlaceholder: "Gauge 30 iron sheets",
        priceLabel: "Price per sheet",
        pricePlaceholder: "8",
        periods: ["fixed"],
        fields: [
          text("gauge", "Gauge", "Gauge 30", { required: true, onCard: true }),
          text("length", "Length", "3 metres", { required: true, onCard: true }),
          select("condition", "Condition", ["New", "Used"], { required: true }),
        ],
      },
      {
        id: "cement",
        name: "Cement",
        summary: "Bags of cement.",
        titlePlaceholder: "Cement, 50kg bags",
        priceLabel: "Price per bag",
        pricePlaceholder: "8",
        periods: ["fixed"],
        fields: [
          text("brand", "Brand", "Bamburi", { required: true, onCard: true }),
          text("pack", "Pack", "50kg", { required: true, onCard: true }),
        ],
      },
      {
        id: "timber",
        name: "Timber",
        summary: "Boards, poles, or treated timber.",
        titlePlaceholder: "Treated timber, 2 by 2",
        priceLabel: "Price",
        pricePlaceholder: "4",
        periods: ["fixed"],
        fields: [
          text("size", "Size", "2 by 2, 12ft", { required: true, onCard: true }),
          select("treatment", "Treatment", ["Treated", "Untreated"], { required: true, onCard: true }),
        ],
      },
      {
        id: "plumbing",
        name: "Plumbing",
        summary: "Pipes, tanks fittings, or a mixed lot.",
        titlePlaceholder: "PVC pipes, 20mm",
        priceLabel: "Price",
        pricePlaceholder: "3",
        periods: ["fixed"],
        fields: [
          text("item", "Item", "PVC pipe", { required: true, onCard: true }),
          text("size", "Size", "20mm, 6 metres", { required: true, onCard: true }),
          select("condition", "Condition", ["New", "Used"], { required: true }),
        ],
      },
    ],
  },
  water: {
    id: "water",
    prompt: "What are you offering?",
    intro: "Tanks, pumps, and boreholes. Capacity or depth shows on the card.",
    detailHeading: "Listing details",
    aboutHeading: "About this listing",
    messageLabel: "Message seller",
    messagePlaceholder: "Is this still available? Can you install it?",
    dialogLead: "Ask about this listing.",
    safety: "Agree what the price includes, especially drilling and installation, before you pay a deposit.",
    phoneHint: "People will call or WhatsApp about delivery or a site visit.",
    photoHint: "Show the tank, the pump, or a borehole you have drilled.",
    descriptionLabel: "Description",
    descriptionPlaceholder: "The capacity or depth, what is included, and how delivery or drilling works.",
    subcategories: [
      {
        id: "tanks",
        name: "Water tank",
        summary: "A storage tank, priced by capacity.",
        titlePlaceholder: "1000 litre water tank",
        priceLabel: "Price",
        pricePlaceholder: "90",
        periods: ["fixed"],
        fields: [
          text("capacity", "Capacity", "1000 litres", { required: true, onCard: true }),
          select("material", "Material", ["Plastic", "Steel", "Concrete"], { required: true, onCard: true }),
          select("condition", "Condition", condition, { required: true }),
        ],
      },
      {
        id: "pumps",
        name: "Pump",
        summary: "A water pump, including solar pumps.",
        titlePlaceholder: "Solar borehole pump",
        priceLabel: "Price",
        pricePlaceholder: "450",
        periods: ["fixed"],
        fields: [
          text("kind", "Kind", "Solar pump", { required: true, onCard: true }),
          text("output", "Output", "1.5kW", { onCard: true }),
          select("condition", "Condition", condition, { required: true }),
        ],
      },
      {
        id: "boreholes",
        name: "Borehole",
        summary: "Drilling, priced from a depth.",
        titlePlaceholder: "Borehole drilling",
        priceLabel: "Price per metre",
        pricePlaceholder: "40",
        periods: ["fixed"],
        priceSuffix: "/ metre",
        fields: [
          text("depth", "Typical depth", "80 metres", { required: true, onCard: true }),
          text("area", "Area covered", "Within 50km", { required: true, onCard: true }),
        ],
      },
    ],
  },
  pets: {
    id: "pets",
    prompt: "What animal is it?",
    intro: "Dogs, cats, and birds kept as pets. The card shows the breed and the age.",
    detailHeading: "Animal details",
    aboutHeading: "About this animal",
    messageLabel: "Message seller",
    messagePlaceholder: "Is this still available? Can I come and see them?",
    dialogLead: "Ask about this animal.",
    safety: "Meet the animal before you pay, and ask about vaccinations.",
    phoneHint: "Buyers will call or WhatsApp to arrange a visit.",
    photoHint: "Show the animal in daylight.",
    descriptionLabel: "Description",
    descriptionPlaceholder: "Age, vaccinations, temperament, and whether the papers are included.",
    subcategories: [
      {
        id: "dogs",
        name: "Dog",
        summary: "A puppy or an adult dog.",
        titlePlaceholder: "German shepherd puppy",
        priceLabel: "Price",
        pricePlaceholder: "150",
        periods: ["fixed"],
        fields: [
          text("breed", "Breed", "German shepherd", { required: true, onCard: true }),
          text("age", "Age", "8 weeks", { required: true, onCard: true }),
          select("sex", "Sex", ["Male", "Female"], { required: true }),
        ],
      },
      {
        id: "cats",
        name: "Cat",
        summary: "A kitten or an adult cat.",
        titlePlaceholder: "Tabby kittens",
        priceLabel: "Price",
        pricePlaceholder: "30",
        periods: ["fixed"],
        fields: [
          text("breed", "Breed", "Tabby", { required: true, onCard: true }),
          text("age", "Age", "10 weeks", { required: true, onCard: true }),
          select("sex", "Sex", ["Male", "Female", "Mixed"], { required: true }),
        ],
      },
      {
        id: "birds",
        name: "Bird",
        summary: "A pet bird, one or a pair.",
        titlePlaceholder: "Lovebirds, pair",
        priceLabel: "Price",
        pricePlaceholder: "25",
        periods: ["fixed"],
        fields: [
          text("breed", "Bird", "Lovebird", { required: true, onCard: true }),
          text("count", "Count", "2", { required: true, onCard: true }),
        ],
      },
    ],
  },
  babies: {
    id: "babies",
    prompt: "What are you selling?",
    intro: "Clothes, gear, and school things for children. Size or age shows on the card.",
    detailHeading: "Item details",
    aboutHeading: "About this item",
    messageLabel: "Message seller",
    messagePlaceholder: "Is this still available? What age does it fit?",
    dialogLead: "Ask about this item.",
    safety: "Check the size and the safety of gear such as a pram or a cot before you pay.",
    phoneHint: "Buyers will call or WhatsApp about size and collection.",
    photoHint: "Show the item, the label, and any wear.",
    descriptionLabel: "Description",
    descriptionPlaceholder: "The size or age, what is included, and whether you can post it.",
    subcategories: [
      {
        id: "kids-clothes",
        name: "Children's clothes",
        summary: "Clothes for a baby or a child.",
        titlePlaceholder: "Baby clothes, 0 to 6 months",
        priceLabel: "Price",
        pricePlaceholder: "12",
        periods: ["fixed"],
        fields: [
          text("age", "Age", "0 to 6 months", { required: true, onCard: true }),
          text("item", "Item", "Mixed lot", { required: true, onCard: true }),
          select("condition", "Condition", condition, { required: true }),
        ],
      },
      {
        id: "gear",
        name: "Baby gear",
        summary: "A pram, cot, car seat, or similar.",
        titlePlaceholder: "Pram, folds flat",
        priceLabel: "Price",
        pricePlaceholder: "60",
        periods: ["fixed"],
        fields: [
          text("item", "Item", "Pram", { required: true, onCard: true }),
          select("condition", "Condition", condition, { required: true, onCard: true }),
        ],
      },
      {
        id: "school",
        name: "School things",
        summary: "A bag, uniform, or other school item.",
        titlePlaceholder: "School bag, primary",
        priceLabel: "Price",
        pricePlaceholder: "10",
        periods: ["fixed"],
        fields: [
          text("item", "Item", "School bag", { required: true, onCard: true }),
          text("level", "Level", "Primary", { required: true, onCard: true }),
          select("condition", "Condition", condition, { required: true }),
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
  "dairy-cow-lusaka": { subcategory: "cattle", details: { animal: "Dairy cow", count: "1", detail: "In-calf" } },
  "goats-nairobi": { subcategory: "goats", details: { animal: "Galla goat", count: "2", detail: "Does" } },
  "hens-accra": { subcategory: "poultry", details: { animal: "Layer hen", count: "10", detail: "Point of lay" } },
  "sheep-kampala": { subcategory: "goats", details: { animal: "Dorper ram", count: "1", detail: "Breeding" } },
  "broilers-lagos": { subcategory: "poultry", details: { animal: "Broiler", count: "20", detail: "About 2kg" } },
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
  "isuzu-nairobi": { subcategory: "trucks", details: { year: "2015", capacity: "5 tonne", fuel: "Diesel", condition: "Used" } },
  "keke-lagos": { subcategory: "tricycles", details: { year: "2021", use: "Passenger", condition: "Used" } },
  "tyres-nairobi": { subcategory: "tyres", details: { size: "265/70 R17", count: "4", condition: "Used, good tread" } },
  "plot-kitengela": { subcategory: "residential", details: { size: "50 by 100 ft", papers: "Title deed", access: "Murram road" } },
  "room-umoja": { subcategory: "room", details: { kind: "Bedsitter", furnished: "Unfurnished", area: "Umoja" } },
  "sheets-lagos": { subcategory: "sheets", details: { gauge: "Gauge 30", length: "3 metres", condition: "New" } },
  "tank-dar": { subcategory: "tanks", details: { capacity: "1000 litres", material: "Plastic", condition: "New" } },
  "labour-nairobi": { subcategory: "casual", details: { work: "Loading and mixing", place: "A building site" } },
  "phone-repair-lagos": { subcategory: "phones", details: { repair: "Screen replacement", brands: "Samsung and iPhone" } },
  "shop-accra": { subcategory: "takeover", details: { business: "Provision shop", stock: "Included" } },
  "pigs-kampala": { subcategory: "pigs", details: { animal: "Grower pig", count: "4", detail: "About 40kg" } },
  "fingerlings-lagos": { subcategory: "fish", details: { animal: "Catfish fingerling", count: "500", detail: "Ready to stock" } },
  "puppy-accra": { subcategory: "dogs", details: { breed: "German shepherd", age: "8 weeks", sex: "Male" } },
  "baby-clothes-kumasi": { subcategory: "kids-clothes", details: { age: "0 to 6 months", item: "Mixed lot", condition: "Used" } },
  "pharmacy-lagos": { subcategory: "pharmacy", details: { stock: "OTC medicines", condition: "Sealed" } },
}
