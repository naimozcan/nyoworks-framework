// ═══════════════════════════════════════════════════════════════════════════════
// WhatsApp Feature - React Hooks
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback } from "react"
import { formatNLPhoneNumber } from "./validators.js"

// ─────────────────────────────────────────────────────────────────────────────
// useWhatsAppChat Hook
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string
  text: string
  isIncoming: boolean
  timestamp: Date
  status: "pending" | "sent" | "delivered" | "read" | "failed"
}

export function useWhatsAppChat(phoneNumber: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const formattedPhone = formatNLPhoneNumber(phoneNumber)

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message])
  }, [])

  const updateMessageStatus = useCallback((messageId: string, status: ChatMessage["status"]) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, status } : msg
      )
    )
  }, [])

  return {
    messages,
    isLoading,
    formattedPhone,
    addMessage,
    updateMessageStatus,
    setMessages,
    setIsLoading,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useWhatsAppOptIn Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useWhatsAppOptIn() {
  const [optInStatus, setOptInStatus] = useState<"unknown" | "opted_in" | "opted_out">("unknown")

  const requestOptIn = useCallback(async (_phoneNumber: string) => {
    setOptInStatus("opted_in")
    return true
  }, [])

  return {
    optInStatus,
    requestOptIn,
    isOptedIn: optInStatus === "opted_in",
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useWhatsAppNotifications Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useWhatsAppNotifications() {
  const [unreadCount, setUnreadCount] = useState(0)

  const incrementUnread = useCallback(() => {
    setUnreadCount(prev => prev + 1)
  }, [])

  const clearUnread = useCallback(() => {
    setUnreadCount(0)
  }, [])

  return {
    unreadCount,
    hasUnread: unreadCount > 0,
    incrementUnread,
    clearUnread,
  }
}
