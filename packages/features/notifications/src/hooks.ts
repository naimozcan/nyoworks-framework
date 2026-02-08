// ═══════════════════════════════════════════════════════════════════════════════
// Notifications Feature - React Hooks
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useState, useEffect } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Notification {
  id: string
  channel: "email" | "sms" | "push" | "in_app"
  status: "pending" | "sent" | "delivered" | "failed" | "read"
  subject?: string
  body: string
  data?: Record<string, unknown>
  createdAt: Date
  readAt?: Date
}

interface NotificationPreferences {
  emailEnabled: boolean
  smsEnabled: boolean
  pushEnabled: boolean
  inAppEnabled: boolean
  marketingEmails: boolean
  productUpdates: boolean
  securityAlerts: boolean
  quietHoursStart?: string
  quietHoursEnd?: string
  timezone?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// useNotifications Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchNotifications = useCallback(async (channel?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (channel) params.set("channel", channel)

      const response = await fetch(`/api/notifications?${params}`)
      if (!response.ok) throw new Error("Failed to fetch notifications")

      const data = await response.json()
      setNotifications(data.items)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/unread-count")
      if (!response.ok) throw new Error("Failed to fetch unread count")

      const data = await response.json()
      setUnreadCount(data.count)
    } catch (err) {
      console.error("Failed to fetch unread count:", err)
    }
  }, [])

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "POST",
      })

      if (!response.ok) throw new Error("Failed to mark as read")

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, status: "read" as const, readAt: new Date() } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
      })

      if (!response.ok) throw new Error("Failed to mark all as read")

      setNotifications(prev =>
        prev.map(n => ({ ...n, status: "read" as const, readAt: new Date() }))
      )
      setUnreadCount(0)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    }
  }, [])

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useNotificationPreferences Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchPreferences = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/notifications/preferences")
      if (!response.ok) throw new Error("Failed to fetch preferences")

      const data = await response.json()
      setPreferences(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updatePreferences = useCallback(async (updates: Partial<NotificationPreferences>) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      if (!response.ok) throw new Error("Failed to update preferences")

      const data = await response.json()
      setPreferences(data)
      return data
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    preferences,
    isLoading,
    error,
    fetchPreferences,
    updatePreferences,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// usePushNotifications Hook
// ─────────────────────────────────────────────────────────────────────────────

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setIsSupported(true)
      setPermission(Notification.permission)
    }
  }, [])

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      setError(new Error("Push notifications not supported"))
      return false
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result === "granted"
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to request permission"))
      return false
    }
  }, [isSupported])

  const registerDevice = useCallback(async (deviceToken: string, platform: "ios" | "android" | "web") => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/notifications/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceToken, platform }),
      })

      if (!response.ok) throw new Error("Failed to register device")

      return await response.json()
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const unregisterDevice = useCallback(async (deviceToken: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/notifications/devices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceToken }),
      })

      if (!response.ok) throw new Error("Failed to unregister device")
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    isSupported,
    permission,
    isLoading,
    error,
    requestPermission,
    registerDevice,
    unregisterDevice,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useSendNotification Hook
// ─────────────────────────────────────────────────────────────────────────────

interface SendEmailOptions {
  to: string
  subject: string
  body: string
  htmlBody?: string
  templateId?: string
  templateData?: Record<string, unknown>
}

interface SendSmsOptions {
  to: string
  body: string
  templateId?: string
  templateData?: Record<string, unknown>
}

interface SendPushOptions {
  userId: string
  title: string
  body: string
  data?: Record<string, unknown>
  imageUrl?: string
}

interface SendInAppOptions {
  userId: string
  title: string
  body: string
  type?: "info" | "success" | "warning" | "error"
  actionUrl?: string
  actionLabel?: string
}

export function useSendNotification() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const sendEmail = useCallback(async (options: SendEmailOptions) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/notifications/send/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      })

      if (!response.ok) throw new Error("Failed to send email")

      return await response.json()
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const sendSms = useCallback(async (options: SendSmsOptions) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/notifications/send/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      })

      if (!response.ok) throw new Error("Failed to send SMS")

      return await response.json()
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const sendPush = useCallback(async (options: SendPushOptions) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/notifications/send/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      })

      if (!response.ok) throw new Error("Failed to send push notification")

      return await response.json()
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const sendInApp = useCallback(async (options: SendInAppOptions) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/notifications/send/in-app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      })

      if (!response.ok) throw new Error("Failed to send in-app notification")

      return await response.json()
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    isLoading,
    error,
    sendEmail,
    sendSms,
    sendPush,
    sendInApp,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useToast Hook (Simple toast notifications)
// ─────────────────────────────────────────────────────────────────────────────

interface Toast {
  id: string
  title: string
  message?: string
  type: "info" | "success" | "warning" | "error"
  duration?: number
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(7)
    const newToast = { ...toast, id }

    setToasts(prev => [...prev, newToast])

    if (toast.duration !== 0) {
      setTimeout(() => {
        removeToast(id)
      }, toast.duration || 5000)
    }

    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const success = useCallback((title: string, message?: string) => {
    return addToast({ title, message, type: "success" })
  }, [addToast])

  const error = useCallback((title: string, message?: string) => {
    return addToast({ title, message, type: "error" })
  }, [addToast])

  const warning = useCallback((title: string, message?: string) => {
    return addToast({ title, message, type: "warning" })
  }, [addToast])

  const info = useCallback((title: string, message?: string) => {
    return addToast({ title, message, type: "info" })
  }, [addToast])

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  }
}
