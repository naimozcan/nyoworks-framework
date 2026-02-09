// ═══════════════════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════════════════

export { cn } from "@nyoworks/ui"

// ─────────────────────────────────────────────────────────────────────────────
// Format Date
// ─────────────────────────────────────────────────────────────────────────────

export function formatDate(date: Date | string, locale = "en-US") {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date))
}

// ─────────────────────────────────────────────────────────────────────────────
// Format Currency
// ─────────────────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number, currency = "USD", locale = "en-US") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount)
}

// ─────────────────────────────────────────────────────────────────────────────
// Delay
// ─────────────────────────────────────────────────────────────────────────────

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
