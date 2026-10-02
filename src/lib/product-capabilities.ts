import "server-only"

import { paidFeaturingConfigured } from "@/lib/stripe"

function envFlag(name: string, fallback = false): boolean {
  const value = process.env[name]?.trim()
  if (!value) return fallback
  return value === "1" || value.toLowerCase() === "true"
}

/** Operational product facts. Compliance logic derives from this registry. */
export function currentProductCapabilities() {
  return {
    accountMinimumAge: 18,
    paymentProcessing: envFlag("CAPABILITY_PAYMENT_PROCESSING") || paidFeaturingConfigured(),
    marketingEmail: envFlag("CAPABILITY_MARKETING_EMAIL"),
    marketingRobotexts: envFlag("CAPABILITY_MARKETING_ROBOTEXTS"),
    thirdPartyAdPixels: envFlag("CAPABILITY_THIRD_PARTY_AD_PIXELS"),
    sellsPersonalInformation: envFlag("CAPABILITY_SELLS_PERSONAL_INFORMATION"),
    crossContextBehavioralAdvertising: envFlag("CAPABILITY_CROSS_CONTEXT_ADVERTISING"),
    significantDecisionAdmt: envFlag("CAPABILITY_SIGNIFICANT_DECISION_ADMT"),
    safetyModerationAutomation: true,
    gpcRecognized: true,
    dntDisclosed: true,
    privacyRightsWorkflow: true,
    structuredIllegalContentNotice: true,
    moderationRedress: true,
    dataExport: true,
    accountDeletion: true,
  } as const
}
