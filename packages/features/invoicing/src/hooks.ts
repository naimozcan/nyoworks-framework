// ═══════════════════════════════════════════════════════════════════════════════
// Invoicing Feature - React Hooks
// ═══════════════════════════════════════════════════════════════════════════════

import { useMemo } from "react"
import { NL_VAT_RATES, calculateVat, calculateTotalWithVat } from "./validators.js"

// ─────────────────────────────────────────────────────────────────────────────
// useInvoiceCalculations Hook
// ─────────────────────────────────────────────────────────────────────────────

export interface InvoiceLineItem {
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
}

export function useInvoiceCalculations(items: InvoiceLineItem[]) {
  return useMemo(() => {
    let subtotal = 0
    let totalVat = 0

    const calculatedItems = items.map(item => {
      const lineTotal = item.quantity * item.unitPrice
      const lineVat = calculateVat(lineTotal, item.vatRate)

      subtotal += lineTotal
      totalVat += lineVat

      return {
        ...item,
        total: lineTotal,
        vatAmount: lineVat,
        totalWithVat: calculateTotalWithVat(lineTotal, item.vatRate),
      }
    })

    return {
      items: calculatedItems,
      subtotal,
      vatAmount: totalVat,
      total: subtotal + totalVat,
    }
  }, [items])
}

// ─────────────────────────────────────────────────────────────────────────────
// useVatRates Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useVatRates() {
  return useMemo(() => ({
    rates: NL_VAT_RATES,
    options: [
      { value: NL_VAT_RATES.STANDARD, label: "21% BTW (standaard)" },
      { value: NL_VAT_RATES.REDUCED, label: "9% BTW (verlaagd)" },
      { value: NL_VAT_RATES.ZERO, label: "0% BTW (vrijgesteld)" },
    ],
  }), [])
}

// ─────────────────────────────────────────────────────────────────────────────
// useInvoiceNumber Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useInvoiceNumber(prefix: string = "INV", year?: number) {
  return useMemo(() => {
    const currentYear = year || new Date().getFullYear()
    return {
      generate: (sequence: number) => `${prefix}-${currentYear}-${String(sequence).padStart(5, "0")}`,
      prefix,
      year: currentYear,
    }
  }, [prefix, year])
}
