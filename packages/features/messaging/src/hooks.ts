// ═══════════════════════════════════════════════════════════════════════════════
// Messaging Feature - React Hooks
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from "react"
import type { MessageAttachment } from "./schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// UI-Specific Types (Different from DB schema types)
// ─────────────────────────────────────────────────────────────────────────────

export interface UIMessage {
  id: string
  conversationId: string
  senderId: string
  content: string | null
  contentType: string
  attachments: MessageAttachment[]
  reactions: Record<string, string[]>
  isEdited: boolean
  isDeleted: boolean
  replyTo?: UIMessage
  createdAt: Date
  updatedAt: Date
}

export interface UIConversation {
  id: string
  type: "direct" | "group" | "support" | "channel"
  name: string | null
  description: string | null
  avatarUrl: string | null
  lastMessageAt: Date | null
  lastMessagePreview: string | null
  unreadCount: number
  participants: UIParticipant[]
}

export interface UIParticipant {
  id: string
  userId: string
  role: "owner" | "admin" | "member" | "guest"
  nickname: string | null
  lastReadAt: Date | null
}

export interface TypingUser {
  userId: string
  name: string
  startedAt: Date
}

// ─────────────────────────────────────────────────────────────────────────────
// useConversations Hook
// ─────────────────────────────────────────────────────────────────────────────

export interface UseConversationsOptions {
  type?: "direct" | "group" | "support" | "channel"
  onNewConversation?: (conversation: UIConversation) => void
}

export function useConversations(options: UseConversationsOptions = {}) {
  const [conversations, setConversations] = useState<UIConversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchConversations = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setConversations([])
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch conversations"))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  const createConversation = useCallback(async (
    participantIds: string[],
    type: "direct" | "group" = "direct",
    name?: string
  ): Promise<UIConversation | null> => {
    try {
      const conversation: UIConversation = {
        id: Date.now().toString(),
        type,
        name: name || null,
        description: null,
        avatarUrl: null,
        lastMessageAt: null,
        lastMessagePreview: null,
        unreadCount: 0,
        participants: participantIds.map(id => ({
          id: `p_${id}`,
          userId: id,
          role: "member" as const,
          nickname: null,
          lastReadAt: null,
        })),
      }
      setConversations(prev => [conversation, ...prev])
      options.onNewConversation?.(conversation)
      return conversation
    } catch {
      return null
    }
  }, [options])

  const archiveConversation = useCallback(async (conversationId: string): Promise<boolean> => {
    try {
      setConversations(prev => prev.filter(c => c.id !== conversationId))
      return true
    } catch {
      return false
    }
  }, [])

  return {
    conversations,
    isLoading,
    error,
    createConversation,
    archiveConversation,
    refresh: fetchConversations,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useMessages Hook
// ─────────────────────────────────────────────────────────────────────────────

export interface UseMessagesOptions {
  conversationId: string
  limit?: number
  onNewMessage?: (message: UIMessage) => void
  onMessageUpdated?: (message: UIMessage) => void
  onMessageDeleted?: (messageId: string) => void
}

export function useMessages(options: UseMessagesOptions) {
  const { conversationId, limit = 50, onNewMessage, onMessageUpdated, onMessageDeleted } = options
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchMessages = useCallback(async (_before?: string) => {
    if (!conversationId) return
    setIsLoading(true)
    setError(null)
    try {
      setMessages([])
      setHasMore(false)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch messages"))
    } finally {
      setIsLoading(false)
    }
  }, [conversationId, limit])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  const sendMessage = useCallback(async (
    content: string,
    attachments?: MessageAttachment[],
    _replyToId?: string
  ): Promise<UIMessage | null> => {
    try {
      const message: UIMessage = {
        id: Date.now().toString(),
        conversationId,
        senderId: "current_user",
        content,
        contentType: "text",
        attachments: attachments || [],
        reactions: {},
        isEdited: false,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setMessages(prev => [...prev, message])
      onNewMessage?.(message)
      return message
    } catch {
      return null
    }
  }, [conversationId, onNewMessage])

  const editMessage = useCallback(async (messageId: string, content: string): Promise<boolean> => {
    try {
      setMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, content, isEdited: true, updatedAt: new Date() }
          : m
      ))
      const updated = messages.find(m => m.id === messageId)
      if (updated) onMessageUpdated?.({ ...updated, content, isEdited: true })
      return true
    } catch {
      return false
    }
  }, [messages, onMessageUpdated])

  const deleteMessage = useCallback(async (messageId: string): Promise<boolean> => {
    try {
      setMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, isDeleted: true, content: null }
          : m
      ))
      onMessageDeleted?.(messageId)
      return true
    } catch {
      return false
    }
  }, [onMessageDeleted])

  const addReaction = useCallback(async (messageId: string, emoji: string): Promise<boolean> => {
    try {
      setMessages(prev => prev.map(m => {
        if (m.id !== messageId) return m
        const reactions = { ...m.reactions }
        if (!reactions[emoji]) reactions[emoji] = []
        if (!reactions[emoji].includes("current_user")) {
          reactions[emoji] = [...reactions[emoji], "current_user"]
        }
        return { ...m, reactions }
      }))
      return true
    } catch {
      return false
    }
  }, [])

  const removeReaction = useCallback(async (messageId: string, emoji: string): Promise<boolean> => {
    try {
      setMessages(prev => prev.map(m => {
        if (m.id !== messageId) return m
        const reactions = { ...m.reactions }
        if (reactions[emoji]) {
          reactions[emoji] = reactions[emoji].filter(id => id !== "current_user")
          if (reactions[emoji].length === 0) delete reactions[emoji]
        }
        return { ...m, reactions }
      }))
      return true
    } catch {
      return false
    }
  }, [])

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return
    const oldestMessage = messages[0]
    if (oldestMessage) {
      await fetchMessages(oldestMessage.id)
    }
  }, [hasMore, isLoading, messages, fetchMessages])

  return {
    messages,
    isLoading,
    hasMore,
    error,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    loadMore,
    refresh: fetchMessages,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useTypingIndicator Hook
// ─────────────────────────────────────────────────────────────────────────────

export interface UseTypingIndicatorOptions {
  conversationId: string
  debounceMs?: number
}

export function useTypingIndicator(options: UseTypingIndicatorOptions) {
  const { conversationId: _conversationId, debounceMs = 1000 } = options
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stopTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startTyping = useCallback(() => {
    if (isTyping) {
      if (stopTypingTimeoutRef.current) {
        clearTimeout(stopTypingTimeoutRef.current)
      }
    } else {
      setIsTyping(true)
    }
    stopTypingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
    }, debounceMs * 3)
  }, [isTyping, debounceMs])

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    if (stopTypingTimeoutRef.current) {
      clearTimeout(stopTypingTimeoutRef.current)
    }
    setIsTyping(false)
  }, [])

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      if (stopTypingTimeoutRef.current) clearTimeout(stopTypingTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers(prev =>
        prev.filter(u => Date.now() - u.startedAt.getTime() < 5000)
      )
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return {
    typingUsers,
    isTyping,
    startTyping,
    stopTyping,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useLiveChat Hook (Customer Support Widget)
// ─────────────────────────────────────────────────────────────────────────────

export interface UseLiveChatOptions {
  tenantId: string
  visitorId?: string
  visitorName?: string
  visitorEmail?: string
  onAgentAssigned?: (agentId: string, agentName: string) => void
  onChatEnded?: () => void
}

export interface LiveChatState {
  isOpen: boolean
  isMinimized: boolean
  conversationId: string | null
  status: "idle" | "waiting" | "connected" | "ended"
  agentName: string | null
  queuePosition: number | null
}

export function useLiveChat(options: UseLiveChatOptions) {
  const { tenantId: _tenantId, visitorId, visitorName: _visitorName, visitorEmail: _visitorEmail, onAgentAssigned, onChatEnded } = options

  const [state, setState] = useState<LiveChatState>({
    isOpen: false,
    isMinimized: false,
    conversationId: null,
    status: "idle",
    agentName: null,
    queuePosition: null,
  })
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const open = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: true, isMinimized: false }))
  }, [])

  const close = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }))
  }, [])

  const minimize = useCallback(() => {
    setState(prev => ({ ...prev, isMinimized: true }))
  }, [])

  const maximize = useCallback(() => {
    setState(prev => ({ ...prev, isMinimized: false }))
  }, [])

  const startChat = useCallback(async (initialMessage: string, _category?: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      const conversationId = `support_${Date.now()}`
      setState(prev => ({
        ...prev,
        conversationId,
        status: "waiting",
        queuePosition: 1,
      }))

      const msg: UIMessage = {
        id: Date.now().toString(),
        conversationId,
        senderId: visitorId || "visitor",
        content: initialMessage,
        contentType: "text",
        attachments: [],
        reactions: {},
        isEdited: false,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setMessages([msg])

      setTimeout(() => {
        setState(prev => ({
          ...prev,
          status: "connected",
          agentName: "Support Agent",
          queuePosition: null,
        }))
        onAgentAssigned?.("agent_1", "Support Agent")
      }, 2000)

      return true
    } catch {
      return false
    } finally {
      setIsLoading(false)
    }
  }, [visitorId, onAgentAssigned])

  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    if (!state.conversationId) return false
    try {
      const msg: UIMessage = {
        id: Date.now().toString(),
        conversationId: state.conversationId,
        senderId: visitorId || "visitor",
        content,
        contentType: "text",
        attachments: [],
        reactions: {},
        isEdited: false,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setMessages(prev => [...prev, msg])
      return true
    } catch {
      return false
    }
  }, [state.conversationId, visitorId])

  const endChat = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({
        ...prev,
        status: "ended",
        conversationId: null,
        agentName: null,
      }))
      setMessages([])
      onChatEnded?.()
      return true
    } catch {
      return false
    }
  }, [onChatEnded])

  const rateChat = useCallback(async (_rating: number, _feedback?: string): Promise<boolean> => {
    try {
      return true
    } catch {
      return false
    }
  }, [])

  return {
    ...state,
    messages,
    isLoading,
    open,
    close,
    minimize,
    maximize,
    startChat,
    sendMessage,
    endChat,
    rateChat,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useUnreadCount Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useUnreadCount() {
  const [totalUnread, setTotalUnread] = useState(0)
  const [unreadByConversation, setUnreadByConversation] = useState<Record<string, number>>({})

  const markAsRead = useCallback(async (conversationId: string): Promise<boolean> => {
    try {
      setUnreadByConversation(prev => {
        const newState = { ...prev }
        const count = newState[conversationId] || 0
        delete newState[conversationId]
        setTotalUnread(current => Math.max(0, current - count))
        return newState
      })
      return true
    } catch {
      return false
    }
  }, [])

  return {
    totalUnread,
    unreadByConversation,
    markAsRead,
  }
}
