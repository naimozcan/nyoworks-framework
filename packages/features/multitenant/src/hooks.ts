// ═══════════════════════════════════════════════════════════════════════════════
// Multitenant Feature - React Hooks
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useState } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Tenant {
  id: string
  name: string
  slug: string
  domain?: string
  plan: string
  status: string
  settings?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

interface TenantMember {
  id: string
  tenantId: string
  userId: string
  role: string
  invitedAt?: Date
  joinedAt: Date
}

interface TenantInvite {
  id: string
  tenantId: string
  email: string
  role: string
  expiresAt: Date
  createdAt: Date
}

interface ListResponse<T> {
  items: T[]
  total?: number
  hasMore?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// useTenant Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useTenant() {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchTenant = useCallback(async (tenantId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/tenants/${tenantId}`)
      if (!response.ok) throw new Error("Failed to fetch tenant")

      const data = await response.json()
      setTenant(data.tenant)
      setRole(data.role)
      return data
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadCurrentTenant = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/tenant/current")
      if (!response.ok) {
        setTenant(null)
        setRole(null)
        return null
      }

      const data = await response.json()
      setTenant(data.tenant)
      setRole(data.role)
      return data
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      setTenant(null)
      setRole(null)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    tenant,
    role,
    isLoading,
    error,
    fetchTenant,
    loadCurrentTenant,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useTenants Hook
// ─────────────────────────────────────────────────────────────────────────────

interface UseTenantsOptions {
  status?: string
  limit?: number
}

export function useTenants(options: UseTenantsOptions = {}) {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const fetchTenants = useCallback(async (offset = 0) => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set("offset", String(offset))
      if (options.limit) params.set("limit", String(options.limit))
      if (options.status) params.set("status", options.status)

      const response = await fetch(`/api/tenants?${params}`)
      if (!response.ok) throw new Error("Failed to fetch tenants")

      const data: ListResponse<Tenant> = await response.json()

      if (offset === 0) {
        setTenants(data.items)
      } else {
        setTenants(prev => [...prev, ...data.items])
      }
      setHasMore(data.hasMore || false)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [options.status, options.limit])

  const createTenant = useCallback(async (data: {
    name: string
    slug: string
    domain?: string
    plan?: string
  }) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error("Failed to create tenant")

      const tenant: Tenant = await response.json()
      setTenants(prev => [tenant, ...prev])
      return tenant
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateTenant = useCallback(async (tenantId: string, data: Partial<Tenant>) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/tenants/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error("Failed to update tenant")

      const updated: Tenant = await response.json()
      setTenants(prev => prev.map(t => t.id === tenantId ? updated : t))
      return updated
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const deleteTenant = useCallback(async (tenantId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/tenants/${tenantId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete tenant")

      setTenants(prev => prev.filter(t => t.id !== tenantId))
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    tenants,
    isLoading,
    error,
    hasMore,
    fetchTenants,
    createTenant,
    updateTenant,
    deleteTenant,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useTenantMembers Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useTenantMembers(tenantId: string | null) {
  const [members, setMembers] = useState<TenantMember[]>([])
  const [invites, setInvites] = useState<TenantInvite[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchMembers = useCallback(async () => {
    if (!tenantId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/tenants/${tenantId}/members`)
      if (!response.ok) throw new Error("Failed to fetch members")

      const data: ListResponse<TenantMember> = await response.json()
      setMembers(data.items)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [tenantId])

  const fetchInvites = useCallback(async () => {
    if (!tenantId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/tenants/${tenantId}/invites`)
      if (!response.ok) throw new Error("Failed to fetch invites")

      const data: ListResponse<TenantInvite> = await response.json()
      setInvites(data.items)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [tenantId])

  const inviteMember = useCallback(async (email: string, role = "member") => {
    if (!tenantId) throw new Error("Tenant ID required")

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/tenants/${tenantId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      })

      if (!response.ok) throw new Error("Failed to send invite")

      const invite: TenantInvite = await response.json()
      setInvites(prev => [...prev, invite])
      return invite
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [tenantId])

  const removeMember = useCallback(async (userId: string) => {
    if (!tenantId) throw new Error("Tenant ID required")

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/tenants/${tenantId}/members/${userId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to remove member")

      setMembers(prev => prev.filter(m => m.userId !== userId))
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [tenantId])

  const updateMemberRole = useCallback(async (userId: string, role: string) => {
    if (!tenantId) throw new Error("Tenant ID required")

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/tenants/${tenantId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })

      if (!response.ok) throw new Error("Failed to update member role")

      const updated: TenantMember = await response.json()
      setMembers(prev => prev.map(m => m.userId === userId ? updated : m))
      return updated
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [tenantId])

  const cancelInvite = useCallback(async (inviteId: string) => {
    if (!tenantId) throw new Error("Tenant ID required")

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/tenants/${tenantId}/invites/${inviteId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to cancel invite")

      setInvites(prev => prev.filter(i => i.id !== inviteId))
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [tenantId])

  return {
    members,
    invites,
    isLoading,
    error,
    fetchMembers,
    fetchInvites,
    inviteMember,
    removeMember,
    updateMemberRole,
    cancelInvite,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useTenantSwitch Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useTenantSwitch() {
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const switchTenant = useCallback(async (tenantId: string) => {
    if (currentTenantId === tenantId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/tenant/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      })

      if (!response.ok) throw new Error("Failed to switch tenant")

      const data = await response.json()
      setCurrentTenantId(data.tenant.id)
      return data
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [currentTenantId])

  return {
    currentTenantId,
    switchTenant,
    isLoading,
    error,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useAcceptInvite Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useAcceptInvite() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const acceptInvite = useCallback(async (token: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })

      if (!response.ok) throw new Error("Failed to accept invite")

      const member: TenantMember = await response.json()
      return member
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    acceptInvite,
    isLoading,
    error,
  }
}
