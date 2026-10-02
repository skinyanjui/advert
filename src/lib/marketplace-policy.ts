export const marketplacePolicy = {
  listing: {
    lifetimeDays: 60,
    expiryNoticeDays: 7,
    attentionNoticeDays: 3,
    maxPrice: 999_999_999,
    maxTitleLength: 80,
    maxDescriptionLength: 2000,
    maxCityLength: 80,
    maxLocationDetailLength: 120,
    maxDetailValueLength: 80,
  },
  promotions: {
    amount: 1000,
    currency: "usd",
    days: 7,
    maxGrantDays: 30,
    retentionDays: 90,
  },
  photos: {
    maxCount: 6,
    maxUploadBytes: 12_000_000,
    maxStoredBytes: 1_500_000,
    maxDimension: 1600,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"] as const,
  },
  drafts: {
    maxAgeDays: 7,
  },
} as const
