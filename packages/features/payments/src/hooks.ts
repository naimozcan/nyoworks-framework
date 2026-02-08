// ═══════════════════════════════════════════════════════════════════════════════
// Payments Feature - React Hooks
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useState } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CheckoutOptions {
  priceId: string
  successUrl: string
  cancelUrl: string
  metadata?: Record<string, string>
}

interface PortalOptions {
  customerId: string
  returnUrl: string
}

// ─────────────────────────────────────────────────────────────────────────────
// useCheckout Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useCheckout() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const createCheckout = useCallback(async (options: CheckoutOptions) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      })

      if (!response.ok) {
        throw new Error("Failed to create checkout session")
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { createCheckout, isLoading, error }
}

// ─────────────────────────────────────────────────────────────────────────────
// usePortal Hook
// ─────────────────────────────────────────────────────────────────────────────

export function usePortal() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const openPortal = useCallback(async (options: PortalOptions) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/payments/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      })

      if (!response.ok) {
        throw new Error("Failed to create portal session")
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { openPortal, isLoading, error }
}

// ─────────────────────────────────────────────────────────────────────────────
// useSubscription Hook
// ─────────────────────────────────────────────────────────────────────────────

interface Subscription {
  id: string
  status: string
  priceId: string
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
}

export function useSubscription(subscriptionId: string | null) {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchSubscription = useCallback(async () => {
    if (!subscriptionId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/payments/subscription/${subscriptionId}`)

      if (!response.ok) {
        throw new Error("Failed to fetch subscription")
      }

      const data = await response.json()
      setSubscription({
        ...data,
        currentPeriodStart: new Date(data.currentPeriodStart),
        currentPeriodEnd: new Date(data.currentPeriodEnd),
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [subscriptionId])

  const cancelSubscription = useCallback(async (cancelAtPeriodEnd = true) => {
    if (!subscriptionId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/payments/subscription/${subscriptionId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelAtPeriodEnd }),
      })

      if (!response.ok) {
        throw new Error("Failed to cancel subscription")
      }

      await fetchSubscription()
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [subscriptionId, fetchSubscription])

  return {
    subscription,
    isLoading,
    error,
    fetchSubscription,
    cancelSubscription,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// usePlans Hook
// ─────────────────────────────────────────────────────────────────────────────

interface Plan {
  id: string
  name: string
  description: string | null
  unitAmount: number | null
  currency: string
  interval: string | undefined
  intervalCount: number | undefined
}

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchPlans = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/payments/plans")

      if (!response.ok) {
        throw new Error("Failed to fetch plans")
      }

      const data = await response.json()
      setPlans(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { plans, isLoading, error, fetchPlans }
}
