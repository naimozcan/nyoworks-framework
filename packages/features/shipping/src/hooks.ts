// ═══════════════════════════════════════════════════════════════════════════════
// Shipping Feature - React Hooks
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// Hook Types
// ─────────────────────────────────────────────────────────────────────────────

export interface UseShippingOptions {
  provider?: "postnl" | "dhl" | "sendcloud"
}

// ─────────────────────────────────────────────────────────────────────────────
// useShipping Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useShipping(options: UseShippingOptions = {}) {
  const { provider = "sendcloud" } = options

  const formatTrackingUrl = useCallback((trackingNumber: string) => {
    switch (provider) {
      case "postnl":
        return `https://postnl.nl/tracktrace/?B=${trackingNumber}&P=&D=NL&T=C`
      case "dhl":
        return `https://www.dhl.com/nl-nl/home/tracking.html?tracking-id=${trackingNumber}`
      case "sendcloud":
        return `https://tracking.sendcloud.sc/?tracking=${trackingNumber}`
      default:
        return null
    }
  }, [provider])

  return {
    provider,
    formatTrackingUrl,
  }
}
