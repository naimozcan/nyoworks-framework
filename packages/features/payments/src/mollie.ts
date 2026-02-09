// ═══════════════════════════════════════════════════════════════════════════════
// Payments Feature - Mollie Client (iDEAL, Bancontact, Credit Card)
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

interface MollieConfig {
  apiKey: string
  webhookUrl?: string
  testMode?: boolean
}

let mollieConfig: MollieConfig | null = null

export function configureMollie(config: MollieConfig) {
  mollieConfig = config
}

function getConfig(): MollieConfig {
  if (!mollieConfig) {
    const apiKey = process.env.MOLLIE_API_KEY

    if (!apiKey) {
      throw new Error("Mollie not configured. Set MOLLIE_API_KEY")
    }

    mollieConfig = {
      apiKey,
      webhookUrl: process.env.MOLLIE_WEBHOOK_URL,
      testMode: apiKey.startsWith("test_"),
    }
  }
  return mollieConfig
}

async function mollieRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const config = getConfig()

  const response = await fetch(`https://api.mollie.com/v2${endpoint}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || `Mollie API error: ${response.status}`)
  }

  return response.json()
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type MolliePaymentMethod =
  | "ideal"
  | "creditcard"
  | "bancontact"
  | "sofort"
  | "giropay"
  | "eps"
  | "paypal"
  | "applepay"
  | "googlepay"
  | "banktransfer"

export type MolliePaymentStatus =
  | "open"
  | "canceled"
  | "pending"
  | "expired"
  | "failed"
  | "paid"

export interface MolliePayment {
  id: string
  mode: "test" | "live"
  amount: { value: string; currency: string }
  description: string
  method: MolliePaymentMethod | null
  status: MolliePaymentStatus
  createdAt: string
  expiresAt?: string
  paidAt?: string
  metadata?: Record<string, unknown>
  _links: {
    checkout?: { href: string }
    dashboard?: { href: string }
  }
}

export interface MollieRefund {
  id: string
  amount: { value: string; currency: string }
  status: "queued" | "pending" | "processing" | "refunded" | "failed"
  createdAt: string
}

export interface IdealIssuer {
  id: string
  name: string
  image: {
    size1x: string
    size2x: string
    svg: string
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Payments
// ─────────────────────────────────────────────────────────────────────────────

export interface CreatePaymentParams {
  amount: number
  currency?: string
  description: string
  redirectUrl: string
  webhookUrl?: string
  method?: MolliePaymentMethod | MolliePaymentMethod[]
  metadata?: Record<string, unknown>
  locale?: string
  issuer?: string
}

export async function createPayment(params: CreatePaymentParams): Promise<MolliePayment> {
  const config = getConfig()

  return mollieRequest<MolliePayment>("/payments", {
    method: "POST",
    body: JSON.stringify({
      amount: {
        value: params.amount.toFixed(2),
        currency: params.currency || "EUR",
      },
      description: params.description,
      redirectUrl: params.redirectUrl,
      webhookUrl: params.webhookUrl || config.webhookUrl,
      method: params.method,
      metadata: params.metadata,
      locale: params.locale || "nl_NL",
      issuer: params.issuer,
    }),
  })
}

export async function getPayment(paymentId: string): Promise<MolliePayment> {
  return mollieRequest<MolliePayment>(`/payments/${paymentId}`)
}

export async function cancelPayment(paymentId: string): Promise<MolliePayment> {
  return mollieRequest<MolliePayment>(`/payments/${paymentId}`, {
    method: "DELETE",
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// iDEAL - Netherlands Most Popular Payment Method
// ─────────────────────────────────────────────────────────────────────────────

export async function getIdealIssuers(): Promise<IdealIssuer[]> {
  const response = await mollieRequest<{ _embedded: { issuers: IdealIssuer[] } }>(
    "/methods/ideal?include=issuers"
  )
  return response._embedded?.issuers || []
}

export async function createIdealPayment(params: {
  amount: number
  description: string
  redirectUrl: string
  webhookUrl?: string
  issuerId?: string
  metadata?: Record<string, unknown>
}): Promise<MolliePayment> {
  return createPayment({
    ...params,
    currency: "EUR",
    method: "ideal",
    issuer: params.issuerId,
    locale: "nl_NL",
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Refunds
// ─────────────────────────────────────────────────────────────────────────────

export async function createRefund(
  paymentId: string,
  amount?: number,
  description?: string
): Promise<MollieRefund> {
  const payment = await getPayment(paymentId)

  return mollieRequest<MollieRefund>(`/payments/${paymentId}/refunds`, {
    method: "POST",
    body: JSON.stringify({
      amount: amount
        ? { value: amount.toFixed(2), currency: "EUR" }
        : payment.amount,
      description,
    }),
  })
}

export async function getRefund(paymentId: string, refundId: string): Promise<MollieRefund> {
  return mollieRequest<MollieRefund>(`/payments/${paymentId}/refunds/${refundId}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Verification
// ─────────────────────────────────────────────────────────────────────────────

export async function handleWebhook(paymentId: string): Promise<MolliePayment> {
  return getPayment(paymentId)
}

// ─────────────────────────────────────────────────────────────────────────────
// Payment Methods
// ─────────────────────────────────────────────────────────────────────────────

export interface MollieMethod {
  id: MolliePaymentMethod
  description: string
  minimumAmount: { value: string; currency: string }
  maximumAmount: { value: string; currency: string } | null
  image: { size1x: string; size2x: string; svg: string }
}

export async function getPaymentMethods(params?: {
  amount?: number
  currency?: string
  locale?: string
}): Promise<MollieMethod[]> {
  const queryParams = new URLSearchParams()

  if (params?.amount) {
    queryParams.set("amount[value]", params.amount.toFixed(2))
    queryParams.set("amount[currency]", params.currency || "EUR")
  }
  if (params?.locale) {
    queryParams.set("locale", params.locale)
  }

  const query = queryParams.toString()
  const response = await mollieRequest<{ _embedded: { methods: MollieMethod[] } }>(
    `/methods${query ? `?${query}` : ""}`
  )

  return response._embedded?.methods || []
}

// ─────────────────────────────────────────────────────────────────────────────
// Checkout URL Helper
// ─────────────────────────────────────────────────────────────────────────────

export function getCheckoutUrl(payment: MolliePayment): string | null {
  return payment._links?.checkout?.href || null
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const MOLLIE_WEBHOOK_EVENTS = [
  "payment.paid",
  "payment.canceled",
  "payment.expired",
  "payment.failed",
  "refund.refunded",
] as const

export type MollieWebhookEvent = (typeof MOLLIE_WEBHOOK_EVENTS)[number]

export const DUTCH_BANKS = [
  { id: "ideal_ABNANL2A", name: "ABN AMRO" },
  { id: "ideal_ASNBNL21", name: "ASN Bank" },
  { id: "ideal_BUNQNL2A", name: "bunq" },
  { id: "ideal_INGBNL2A", name: "ING" },
  { id: "ideal_KNABNL2H", name: "Knab" },
  { id: "ideal_RABONL2U", name: "Rabobank" },
  { id: "ideal_RBRBNL21", name: "RegioBank" },
  { id: "ideal_REVOLT21", name: "Revolut" },
  { id: "ideal_SNSBNL2A", name: "SNS" },
  { id: "ideal_TRIONL2U", name: "Triodos Bank" },
  { id: "ideal_FVLBNL22", name: "Van Lanschot" },
] as const
