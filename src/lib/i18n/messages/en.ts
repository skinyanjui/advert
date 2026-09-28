/**
 * English product UI strings. Every key must exist in fr.ts and sw.ts.
 * Legal document bodies stay English (see legalEnglishOnly notice).
 */
export const en = {
  // Preferences
  "prefs.language": "Language",
  "prefs.currency": "Currency",
  "prefs.currencyListing": "Listing currency",
  "prefs.currencyHint": "Converted prices are approximate and labelled with ≈.",
  "prefs.appearance": "Appearance",
  "prefs.sectionTitle": "Language & currency",
  "prefs.sectionBody": "Applies on this device. When signed in, also saved to your profile.",
  "prefs.legalEnglishOnly": "This legal document is currently available in English only.",

  // Theme
  "theme.light": "Light",
  "theme.dark": "Dark",
  "theme.system": "System",

  // Nav
  "nav.post": "Post an ad",
  "nav.postShort": "Post ad",
  "nav.messages": "Messages",
  "nav.saved": "Saved ads",
  "nav.savedShort": "Saved",
  "nav.myAds": "My ads",
  "nav.profile": "Profile",
  "nav.sources": "Sources",
  "nav.navigation": "Navigation",
  "nav.site": "Site",
  "nav.terms": "Terms",
  "nav.privacy": "Privacy",
  "nav.contact": "Contact",
  "nav.signIn": "Sign in",
  "nav.signOut": "Sign out",
  "nav.openMessages": "Open messages",
  "nav.unreadMessages": "{count} unread",
  "nav.needsAttentionOne": "1 needs attention",
  "nav.needsAttentionMany": "{count} need attention",
  "nav.guestBrowser": "Guest on this browser",
  "nav.signedInDetail": "Ads stay with your account",
  "nav.guestDetail": "Sign in to post and keep ads",
  "nav.notifications": "Notifications",
  "nav.notificationsUnread": "Notifications, {count} unread",
  "nav.notificationsEmptyUnread": "You're all caught up",
  "nav.notificationsEmptyAll": "Nothing here yet",
  "nav.notificationsEmptyUnreadHint": "New replies and inquiries will appear here.",
  "nav.notificationsEmptyAllHint": "Messages from buyers and sellers will appear here.",
  "nav.notificationsLoading": "Loading notifications…",
  "nav.notificationsRecent": "Your recent message activity",
  "nav.notificationsUnreadCount": "{count} unread {messages}",
  "nav.messageOne": "message",
  "nav.messageMany": "messages",
  "nav.filterNotifications": "Filter notifications",
  "nav.filterAll": "All",
  "nav.filterUnread": "Unread",
  "nav.refreshNotifications": "Refresh notifications",
  "nav.newInquiry": "New inquiry",
  "nav.sellerReply": "Seller reply",
  "nav.readPrefix": "Read: ",
  "nav.unreadPrefix": "Unread: ",
  "nav.country": "Country: {label}",
  "nav.allAfrica": "All Africa",
  "nav.defaultPlace": "Default",
  "nav.saveAsDefault": "Save as default",
  "nav.clearDefault": "Clear default",
  "nav.searchPlace": "Country, capital, or city",
  "nav.searchPlaceLabel": "Search countries and cities",
  "nav.noPlaceMatches": "No country or city matches.",
  "nav.searchListings": "Search listings",
  "nav.searchPlaceholder": "Search for cars, houses, jobs, electronics and more...",

  // Listing card / price
  "listing.featured": "Featured",
  "listing.sold": "Sold",
  "listing.hidden": "Hidden",
  "listing.expired": "Expired",
  "listing.sponsored": "Sponsored",
  "listing.jobs": "Jobs",
  "listing.view": "View",
  "listing.save": "Save {title}",
  "listing.unsave": "Remove {title} from saved",
  "listing.approx": "≈ {price}",
  "listing.originalPrice": "{price}",
  "listing.similar": "Similar listings",

  // Relative time (shared keys used by format helpers when locale-aware)
  "time.justNow": "Just now",
  "time.hourAgo": "1 hour ago",
  "time.hoursAgo": "{count} hours ago",
  "time.dayAgo": "1 day ago",
  "time.daysAgo": "{count} days ago",

  // Browse / empty
  "browse.noResults": "No listings match",
  "browse.noResultsBody": "Try another search, category, or place.",
  "browse.clearFilters": "Clear filters",

  // Saved
  "saved.title": "Saved ads",
  "saved.emptyTitle": "No saved ads yet",
  "saved.emptyBody": "Tap the heart on a listing to save it here.",
  "saved.browse": "Browse listings",

  // Profile
  "profile.title": "Profile",
  "profile.signedInAs": "Signed in as {email}. Your ads, saves, and messages stay with this account.",
  "profile.guestBlurb": "Guest on this browser. Sign in to post ads and keep them on your account across devices.",
  "profile.signInTitle": "Sign in to edit your Profile",
  "profile.signInBody": "Email link or optional password. Keep ads, saves, and Messages on this account.",
  "profile.reports": "Reports",

  // Common
  "common.loading": "Loading…",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.continue": "Continue",
  "common.back": "Back",
  "common.retry": "Retry",
  "common.yes": "Yes",
  "common.no": "No",
} as const

export type MessageKey = keyof typeof en
export type Messages = Record<MessageKey, string>
