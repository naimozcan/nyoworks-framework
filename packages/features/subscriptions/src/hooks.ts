// ═══════════════════════════════════════════════════════════════════════════════
// Subscriptions Feature - React Hooks
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useState } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Plan {
  id: string
  name: string
  slug: string
  description?: string
  features: string[]
  limits: Record<string, number>
  price: number
  interval: string
  isActive: boolean
  sortOrder: number
}

interface Subscription {
  id: string
  tenantId: string
  userId: string
  planId: string
  status: string
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  canceledAt?: Date
  trialEndsAt?: Date
  plan?: Plan
}

interface UsageRecord {
  id: string
  subscriptionId: string
  feature: string
  used: number
  limit: number
  periodStart: Date
  periodEnd: Date
}

interface LimitCheck {
  allowed: boolean
  reason: string
  used: number
  limit: number
  remaining: number
}

// ─────────────────────────────────────────────────────────────────────────────
// usePlans Hook
// ─────────────────────────────────────────────────────────────────────────────

interface UsePlansOptions {
  activeOnly?: boolean
}

export function usePlans(options: UsePlansOptions = {}) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchPlans = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (options.activeOnly !== undefined) {
        params.set("activeOnly", String(options.activeOnly))
      }

      const response = await fetch(`/api/subscriptions/plans?${params}`)
      if (!response.ok) throw new Error("Failed to fetch plans")

      const data = await response.json()
      setPlans(data.items)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [options.activeOnly])

  const getPlanBySlug = useCallback((slug: string): Plan | undefined => {
    return plans.find((plan) => plan.slug === slug)
  }, [plans])

  const getPlanById = useCallback((id: string): Plan | undefined => {
    return plans.find((plan) => plan.id === id)
  }, [plans])

  return {
    plans,
    isLoading,
    error,
    fetchPlans,
    getPlanBySlug,
    getPlanById,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useSubscription Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchSubscription = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/subscriptions/current")
      if (!response.ok) throw new Error("Failed to fetch subscription")

      const data = await response.json()
      setSubscription(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const subscribe = useCallback(async (planId: string, trialDays?: number) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/subscriptions/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, trialDays }),
      })

      if (!response.ok) throw new Error("Failed to subscribe")

      const newSubscription: Subscription = await response.json()
      setSubscription(newSubscription)
      return newSubscription
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const cancel = useCallback(async (cancelAtPeriodEnd = true) => {
    if (!subscription) throw new Error("No subscription to cancel")

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/subscriptions/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId: subscription.id,
          cancelAtPeriodEnd,
        }),
      })

      if (!response.ok) throw new Error("Failed to cancel subscription")

      const updated: Subscription = await response.json()
      setSubscription(updated)
      return updated
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [subscription])

  const resume = useCallback(async () => {
    if (!subscription) throw new Error("No subscription to resume")

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/subscriptions/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: subscription.id }),
      })

      if (!response.ok) throw new Error("Failed to resume subscription")

      const updated: Subscription = await response.json()
      setSubscription(updated)
      return updated
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [subscription])

  const changePlan = useCallback(async (newPlanId: string) => {
    if (!subscription) throw new Error("No subscription to change")

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/subscriptions/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId: subscription.id,
          newPlanId,
        }),
      })

      if (!response.ok) throw new Error("Failed to change plan")

      const updated: Subscription = await response.json()
      setSubscription(updated)
      return updated
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [subscription])

  const isActive = subscription?.status === "active" || subscription?.status === "trialing"
  const isCanceling = subscription?.cancelAtPeriodEnd === true
  const isTrialing = subscription?.status === "trialing"

  return {
    subscription,
    isLoading,
    error,
    isActive,
    isCanceling,
    isTrialing,
    fetchSubscription,
    subscribe,
    cancel,
    resume,
    changePlan,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useUsage Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useUsage() {
  const [usage, setUsage] = useState<UsageRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchUsage = useCallback(async (feature?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (feature) params.set("feature", feature)

      const response = await fetch(`/api/subscriptions/usage?${params}`)
      if (!response.ok) throw new Error("Failed to fetch usage")

      const data = await response.json()
      setUsage(data.items)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const recordUsage = useCallback(async (feature: string, quantity = 1) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/subscriptions/usage/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature, quantity }),
      })

      if (!response.ok) throw new Error("Failed to record usage")

      const updated: UsageRecord = await response.json()
      setUsage((prev) =>
        prev.map((u) => (u.id === updated.id ? updated : u))
      )
      return updated
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getUsageByFeature = useCallback((feature: string): UsageRecord | undefined => {
    return usage.find((u) => u.feature === feature)
  }, [usage])

  const getUsagePercentage = useCallback((feature: string): number => {
    const record = usage.find((u) => u.feature === feature)
    if (!record || record.limit <= 0) return 0
    return Math.min(100, (record.used / record.limit) * 100)
  }, [usage])

  return {
    usage,
    isLoading,
    error,
    fetchUsage,
    recordUsage,
    getUsageByFeature,
    getUsagePercentage,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useLimit Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useLimit(feature: string) {
  const [limit, setLimit] = useState<LimitCheck | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const checkLimit = useCallback(async (increment = 1) => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set("feature", feature)
      params.set("increment", String(increment))

      const response = await fetch(`/api/subscriptions/usage/check?${params}`)
      if (!response.ok) throw new Error("Failed to check limit")

      const data: LimitCheck = await response.json()
      setLimit(data)
      return data
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [feature])

  const canUse = limit?.allowed ?? false
  const remaining = limit?.remaining ?? 0
  const percentage = limit && limit.limit > 0
    ? Math.min(100, (limit.used / limit.limit) * 100)
    : 0

  return {
    limit,
    isLoading,
    error,
    canUse,
    remaining,
    percentage,
    checkLimit,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// usePricingTable Hook
// ─────────────────────────────────────────────────────────────────────────────

interface PricingTableOptions {
  currentPlanId?: string
}

export function usePricingTable(options: PricingTableOptions = {}) {
  const { plans, fetchPlans, isLoading: plansLoading, error: plansError } = usePlans({ activeOnly: true })
  const { subscription, fetchSubscription, subscribe, isLoading: subLoading } = useSubscription()

  const isLoading = plansLoading || subLoading
  const error = plansError

  const currentPlanId = options.currentPlanId || subscription?.planId

  const handleSelectPlan = useCallback(async (planId: string, trialDays?: number) => {
    if (currentPlanId === planId) return
    return subscribe(planId, trialDays)
  }, [currentPlanId, subscribe])

  const sortedPlans = [...plans].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return a.price - b.price
  })

  return {
    plans: sortedPlans,
    currentPlanId,
    subscription,
    isLoading,
    error,
    fetchPlans,
    fetchSubscription,
    handleSelectPlan,
  }
}
