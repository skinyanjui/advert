import type { Locale } from "@/lib/i18n/locales"

const en = {
  title: "Contact leads",
  explanation: "Last {days} days across all placements. Views count distinct accounts or browser sessions; contacts count distinct signed-in accounts per listing and channel. Your activity is excluded. Channel totals can overlap. Clicks show contact intent, not completed conversations, sales, or leads attributed to a paid promotion.",
  empty: "No ads to report yet.",
  loading: "Loading contact leads…",
  error: "Contact leads are temporarily unavailable.",
  previous: "Previous",
  next: "Next",
  page: "Page",
  listing: "Ad",
  views: "Views",
  contacts: "Contacts",
  whatsapp: "WhatsApp",
  calls: "Calls",
  texts: "Texts",
  messages: "Message opens",
}

export const sellerLeadsCopy: Record<Locale, typeof en> = {
  en,
  fr: {
    title: "Contacts potentiels",
    explanation: "Sur les {days} derniers jours, tous emplacements confondus. Les vues comptent les comptes ou sessions de navigation distincts ; les contacts comptent les comptes connectés distincts par annonce et canal. Votre activité est exclue. Les totaux par canal peuvent se chevaucher. Les clics indiquent une intention de contact, pas des conversations abouties, des ventes ou des contacts attribués à une promotion payante.",
    empty: "Aucune annonce à analyser pour le moment.", loading: "Chargement des contacts…", error: "Les statistiques de contact sont temporairement indisponibles.",
    previous: "Précédent", next: "Suivant", page: "Page", listing: "Annonce", views: "Vues", contacts: "Contacts", whatsapp: "WhatsApp", calls: "Appels", texts: "SMS", messages: "Ouvertures de messagerie",
  },
  sw: {
    title: "Wanaotaka kuwasiliana",
    explanation: "Siku {days} zilizopita katika nafasi zote. Mitazamo huhesabu akaunti au vipindi tofauti vya kivinjari; mawasiliano huhesabu akaunti tofauti zilizoingia kwa kila tangazo na njia. Shughuli zako hazihesabiwi. Mtu anaweza kuhesabiwa katika njia zaidi ya moja. Mibofyo inaonyesha nia ya kuwasiliana, si mazungumzo yaliyokamilika, mauzo au mawasiliano yaliyotokana na utangazaji wa kulipia.",
    empty: "Bado hakuna matangazo ya kuripoti.", loading: "Inapakia takwimu za mawasiliano…", error: "Takwimu za mawasiliano hazipatikani kwa sasa.",
    previous: "Iliyotangulia", next: "Inayofuata", page: "Ukurasa", listing: "Tangazo", views: "Mitazamo", contacts: "Mawasiliano", whatsapp: "WhatsApp", calls: "Simu", texts: "SMS", messages: "Ufunguzi wa ujumbe",
  },
}
