// ═══════════════════════════════════════════════════════════════════════════════
// CRM Feature - React Hooks
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useState } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Contact {
  id: string
  firstName: string
  lastName?: string
  email?: string
  phone?: string
  company?: string
  jobTitle?: string
  status: string
  source?: string
  createdAt: Date
}

interface Tag {
  id: string
  name: string
  color: string
  description?: string
}

interface Note {
  id: string
  contactId: string
  content: string
  isPinned: boolean
  authorId: string
  createdAt: Date
}

interface Activity {
  id: string
  contactId: string
  type: string
  title: string
  description?: string
  scheduledAt?: Date
  completedAt?: Date
  createdAt: Date
}

interface Deal {
  id: string
  title: string
  value?: number
  currency: string
  stage: string
  probability: number
  contactId?: string
  createdAt: Date
}

interface ListResponse<T> {
  items: T[]
  total?: number
  hasMore?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// useContacts Hook
// ─────────────────────────────────────────────────────────────────────────────

interface UseContactsOptions {
  search?: string
  status?: string
  tagId?: string
  limit?: number
}

export function useContacts(options: UseContactsOptions = {}) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const fetchContacts = useCallback(async (offset = 0) => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set("offset", String(offset))
      if (options.limit) params.set("limit", String(options.limit))
      if (options.search) params.set("search", options.search)
      if (options.status) params.set("status", options.status)
      if (options.tagId) params.set("tagId", options.tagId)

      const response = await fetch(`/api/crm/contacts?${params}`)
      if (!response.ok) throw new Error("Failed to fetch contacts")

      const data: ListResponse<Contact> = await response.json()

      if (offset === 0) {
        setContacts(data.items)
      } else {
        setContacts(prev => [...prev, ...data.items])
      }
      setHasMore(data.hasMore || false)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [options.search, options.status, options.tagId, options.limit])

  const createContact = useCallback(async (data: Partial<Contact>) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/crm/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error("Failed to create contact")

      const contact: Contact = await response.json()
      setContacts(prev => [contact, ...prev])
      return contact
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateContact = useCallback(async (contactId: string, data: Partial<Contact>) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/crm/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error("Failed to update contact")

      const updated: Contact = await response.json()
      setContacts(prev => prev.map(c => c.id === contactId ? updated : c))
      return updated
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const deleteContact = useCallback(async (contactId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/crm/contacts/${contactId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete contact")

      setContacts(prev => prev.filter(c => c.id !== contactId))
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    contacts,
    isLoading,
    error,
    hasMore,
    fetchContacts,
    createContact,
    updateContact,
    deleteContact,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useTags Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchTags = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/crm/tags")
      if (!response.ok) throw new Error("Failed to fetch tags")

      const data: Tag[] = await response.json()
      setTags(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createTag = useCallback(async (data: { name: string; color?: string; description?: string }) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/crm/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error("Failed to create tag")

      const tag: Tag = await response.json()
      setTags(prev => [...prev, tag])
      return tag
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const deleteTag = useCallback(async (tagId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/crm/tags/${tagId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete tag")

      setTags(prev => prev.filter(t => t.id !== tagId))
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    tags,
    isLoading,
    error,
    fetchTags,
    createTag,
    deleteTag,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useNotes Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useNotes(contactId: string | null) {
  const [notes, setNotes] = useState<Note[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchNotes = useCallback(async () => {
    if (!contactId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/crm/contacts/${contactId}/notes`)
      if (!response.ok) throw new Error("Failed to fetch notes")

      const data: ListResponse<Note> = await response.json()
      setNotes(data.items)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [contactId])

  const createNote = useCallback(async (content: string, isPinned = false) => {
    if (!contactId) throw new Error("Contact ID required")

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/crm/contacts/${contactId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, isPinned }),
      })

      if (!response.ok) throw new Error("Failed to create note")

      const note: Note = await response.json()
      setNotes(prev => [note, ...prev])
      return note
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [contactId])

  const deleteNote = useCallback(async (noteId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/crm/notes/${noteId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete note")

      setNotes(prev => prev.filter(n => n.id !== noteId))
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    notes,
    isLoading,
    error,
    fetchNotes,
    createNote,
    deleteNote,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useActivities Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useActivities(contactId?: string) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchActivities = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const url = contactId
        ? `/api/crm/contacts/${contactId}/activities`
        : "/api/crm/activities"

      const response = await fetch(url)
      if (!response.ok) throw new Error("Failed to fetch activities")

      const data: ListResponse<Activity> = await response.json()
      setActivities(data.items)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [contactId])

  const createActivity = useCallback(async (data: {
    contactId: string
    type: string
    title: string
    description?: string
    scheduledAt?: string
  }) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/crm/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error("Failed to create activity")

      const activity: Activity = await response.json()
      setActivities(prev => [activity, ...prev])
      return activity
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const completeActivity = useCallback(async (activityId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/crm/activities/${activityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedAt: new Date().toISOString() }),
      })

      if (!response.ok) throw new Error("Failed to complete activity")

      const updated: Activity = await response.json()
      setActivities(prev => prev.map(a => a.id === activityId ? updated : a))
      return updated
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    activities,
    isLoading,
    error,
    fetchActivities,
    createActivity,
    completeActivity,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useDeals Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useDeals(contactId?: string) {
  const [deals, setDeals] = useState<Deal[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchDeals = useCallback(async (stage?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (contactId) params.set("contactId", contactId)
      if (stage) params.set("stage", stage)

      const response = await fetch(`/api/crm/deals?${params}`)
      if (!response.ok) throw new Error("Failed to fetch deals")

      const data: ListResponse<Deal> = await response.json()
      setDeals(data.items)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [contactId])

  const createDeal = useCallback(async (data: {
    title: string
    value?: number
    currency?: string
    stage?: string
    contactId?: string
  }) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/crm/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error("Failed to create deal")

      const deal: Deal = await response.json()
      setDeals(prev => [deal, ...prev])
      return deal
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateDealStage = useCallback(async (dealId: string, stage: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/crm/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      })

      if (!response.ok) throw new Error("Failed to update deal")

      const updated: Deal = await response.json()
      setDeals(prev => prev.map(d => d.id === dealId ? updated : d))
      return updated
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    deals,
    isLoading,
    error,
    fetchDeals,
    createDeal,
    updateDealStage,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// usePipeline Hook
// ─────────────────────────────────────────────────────────────────────────────

interface PipelineStage {
  count: number
  totalValue: number
}

export function usePipeline() {
  const [pipeline, setPipeline] = useState<Record<string, PipelineStage>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchPipeline = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/crm/deals/pipeline")
      if (!response.ok) throw new Error("Failed to fetch pipeline")

      const data: Record<string, PipelineStage> = await response.json()
      setPipeline(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    pipeline,
    isLoading,
    error,
    fetchPipeline,
  }
}
