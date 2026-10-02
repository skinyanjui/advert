import "server-only"
import { createHash, randomBytes } from "node:crypto"
import { boardDb } from "@/lib/board-db"
import { sendEmail } from "@/lib/email"
import { paymentSupportPolicy, supportVerificationCurrent, validSupportEmail } from "@/lib/payment-support-policy"

export function paymentSupportEmail() {
  return validSupportEmail(process.env.NEXT_PUBLIC_SUPPORT_EMAIL)
}

export function supportDeliveryConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM_EMAIL?.trim())
}

export async function paymentSupportStatus() {
  const email = paymentSupportEmail()
  if (!email) return { email: null, verified: false, verifiedAt: null, available: true, deliveryConfigured: supportDeliveryConfigured() }
  const { data, error } = await boardDb().from("payment_support_verification").select("email,verified_at").eq("singleton", true).maybeSingle()
  if (error) return { email, verified: false, verifiedAt: null, available: false, deliveryConfigured: supportDeliveryConfigured() }
  const verifiedAt = data?.email === email ? data.verified_at as string | null : null
  return { email, verified: supportVerificationCurrent(verifiedAt), verifiedAt, available: true, deliveryConfigured: supportDeliveryConfigured() }
}

export async function sendSupportVerification() {
  const email = paymentSupportEmail()
  if (!email || !supportDeliveryConfigured()) throw new Error("Configure the public support mailbox and email delivery before verifying support.")
  const code = randomBytes(32).toString("hex")
  const hash = createHash("sha256").update(code).digest("hex")
  const { error } = await boardDb().rpc("request_payment_support_verification", { p_email: email, p_hash: hash })
  if (error) throw new Error(error.message)
  const result = await sendEmail({
    to: email,
    subject: "Verify your Africa Classifieds payment support mailbox",
    text: `An administrator requested payment support verification. Enter this code in Admin → Featured promotions to confirm receipt:\n\n${code}\n\nThe code expires in ${paymentSupportPolicy.challengeMinutes} minutes. Only confirm if this mailbox is monitored for seller payment problems.`,
  })
  if (!result.ok || result.provider !== "resend") throw new Error("Verification email could not be sent. Check email delivery and retry.")
}

export async function confirmSupportVerification(code: string) {
  const email = paymentSupportEmail()
  if (!email) throw new Error("Configure a valid public support mailbox first.")
  const { data, error } = await boardDb().rpc("confirm_payment_support_verification", { p_email: email, p_hash: createHash("sha256").update(code).digest("hex") })
  if (error || data !== true) throw new Error("The verification code is invalid or expired.")
}
