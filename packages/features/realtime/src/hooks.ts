// ═══════════════════════════════════════════════════════════════════════════════
// Realtime Feature - React Hooks
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ConnectionState = "connecting" | "connected" | "disconnected" | "reconnecting"

interface WebSocketMessage {
  type: string
  channelId?: string
  event?: string
  payload?: unknown
  timestamp?: number
}

interface PresenceMember {
  userId: string
  tenantId: string
  status?: string
  metadata?: Record<string, unknown>
}

interface UseWebSocketOptions {
  url: string
  token: string
  autoConnect?: boolean
  reconnect?: boolean
  reconnectDelay?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
  onMessage?: (message: WebSocketMessage) => void
}

interface UseChannelOptions {
  onMessage?: (event: string, payload: unknown) => void
  onUserJoined?: (userId: string) => void
  onUserLeft?: (userId: string) => void
}

interface UsePresenceOptions {
  initialStatus?: string
  metadata?: Record<string, unknown>
  syncInterval?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// useWebSocket Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useWebSocket(options: UseWebSocketOptions) {
  const {
    url,
    token,
    autoConnect = true,
    reconnect = true,
    reconnectDelay = 3000,
    maxReconnectAttempts = 10,
    heartbeatInterval = 25000,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
  } = options

  const [state, setState] = useState<ConnectionState>("disconnected")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const messageHandlersRef = useRef<Map<string, Set<(message: WebSocketMessage) => void>>>(new Map())

  const clearTimeouts = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (heartbeatTimeoutRef.current) {
      clearInterval(heartbeatTimeoutRef.current)
      heartbeatTimeoutRef.current = null
    }
  }, [])

  const startHeartbeat = useCallback(() => {
    heartbeatTimeoutRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }))
      }
    }, heartbeatInterval)
  }, [heartbeatInterval])

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setState("connecting")
    const ws = new WebSocket(url)

    ws.onopen = () => {
      ws.send(JSON.stringify({ token }))
    }

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data)

        if (message.type === "authenticated") {
          setState("connected")
          setIsAuthenticated(true)
          reconnectAttemptsRef.current = 0
          startHeartbeat()
          onConnect?.()
          return
        }

        if (message.type === "error" && !isAuthenticated) {
          ws.close()
          return
        }

        onMessage?.(message)

        if (message.channelId) {
          const handlers = messageHandlersRef.current.get(message.channelId)
          handlers?.forEach((handler) => handler(message))
        }
      } catch {
        return
      }
    }

    ws.onerror = (error) => {
      onError?.(error)
    }

    ws.onclose = () => {
      clearTimeouts()
      setIsAuthenticated(false)

      if (reconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
        setState("reconnecting")
        reconnectAttemptsRef.current++
        const delay = reconnectDelay * Math.min(reconnectAttemptsRef.current, 5)
        reconnectTimeoutRef.current = setTimeout(connect, delay)
      } else {
        setState("disconnected")
      }

      onDisconnect?.()
    }

    wsRef.current = ws
  }, [url, token, reconnect, reconnectDelay, maxReconnectAttempts, startHeartbeat, clearTimeouts, onConnect, onDisconnect, onError, onMessage, isAuthenticated])

  const disconnect = useCallback(() => {
    clearTimeouts()
    wsRef.current?.close()
    wsRef.current = null
    setState("disconnected")
    setIsAuthenticated(false)
  }, [clearTimeouts])

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  const subscribe = useCallback((channelId: string) => {
    send({ type: "subscribe", channelId })
  }, [send])

  const unsubscribe = useCallback((channelId: string) => {
    send({ type: "unsubscribe", channelId })
  }, [send])

  const broadcast = useCallback((channelId: string, event: string, payload: unknown) => {
    send({ type: "broadcast", channelId, event, payload })
  }, [send])

  const addMessageHandler = useCallback((channelId: string, handler: (message: WebSocketMessage) => void) => {
    if (!messageHandlersRef.current.has(channelId)) {
      messageHandlersRef.current.set(channelId, new Set())
    }
    messageHandlersRef.current.get(channelId)?.add(handler)
  }, [])

  const removeMessageHandler = useCallback((channelId: string, handler: (message: WebSocketMessage) => void) => {
    messageHandlersRef.current.get(channelId)?.delete(handler)
  }, [])

  useEffect(() => {
    if (autoConnect) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [autoConnect, connect, disconnect])

  return {
    state,
    isAuthenticated,
    connect,
    disconnect,
    send,
    subscribe,
    unsubscribe,
    broadcast,
    addMessageHandler,
    removeMessageHandler,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useChannel Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useChannel(
  ws: ReturnType<typeof useWebSocket>,
  channelId: string,
  options: UseChannelOptions = {}
) {
  const { onMessage, onUserJoined, onUserLeft } = options
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [messages, setMessages] = useState<WebSocketMessage[]>([])

  useEffect(() => {
    if (!ws.isAuthenticated || !channelId) return

    const handler = (message: WebSocketMessage) => {
      if (message.type === "subscribed" && message.channelId === channelId) {
        setIsSubscribed(true)
        return
      }

      if (message.type === "unsubscribed" && message.channelId === channelId) {
        setIsSubscribed(false)
        return
      }

      if (message.type === "message" && message.channelId === channelId) {
        setMessages((prev) => [...prev, message])
        onMessage?.(message.event || "", message.payload)

        if (message.event === "user:joined") {
          const payload = message.payload as { userId?: string }
          if (payload?.userId) {
            onUserJoined?.(payload.userId)
          }
        }

        if (message.event === "user:left") {
          const payload = message.payload as { userId?: string }
          if (payload?.userId) {
            onUserLeft?.(payload.userId)
          }
        }
      }
    }

    ws.addMessageHandler(channelId, handler)
    ws.subscribe(channelId)

    return () => {
      ws.removeMessageHandler(channelId, handler)
      ws.unsubscribe(channelId)
      setIsSubscribed(false)
    }
  }, [ws, channelId, onMessage, onUserJoined, onUserLeft])

  const send = useCallback((event: string, payload: unknown) => {
    if (isSubscribed) {
      ws.broadcast(channelId, event, payload)
    }
  }, [ws, channelId, isSubscribed])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return {
    isSubscribed,
    messages,
    send,
    clearMessages,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// usePresence Hook
// ─────────────────────────────────────────────────────────────────────────────

export function usePresence(
  ws: ReturnType<typeof useWebSocket>,
  channelId: string,
  options: UsePresenceOptions = {}
) {
  const { initialStatus = "online", metadata, syncInterval = 30000 } = options
  const [members, setMembers] = useState<PresenceMember[]>([])
  const [myStatus, setMyStatus] = useState(initialStatus)

  useEffect(() => {
    if (!ws.isAuthenticated || !channelId) return

    const handler = (message: WebSocketMessage) => {
      if (message.type === "presence" && message.channelId === channelId) {
        const payload = message.payload as { members?: PresenceMember[] }
        if (payload?.members) {
          setMembers(payload.members)
        }
      }

      if (message.type === "message" && message.channelId === channelId) {
        if (message.event === "user:joined") {
          const payload = message.payload as PresenceMember
          if (payload?.userId) {
            setMembers((prev) => {
              const exists = prev.some((m) => m.userId === payload.userId)
              if (exists) return prev
              return [...prev, payload]
            })
          }
        }

        if (message.event === "user:left") {
          const payload = message.payload as { userId?: string }
          if (payload?.userId) {
            setMembers((prev) => prev.filter((m) => m.userId !== payload.userId))
          }
        }

        if (message.event === "presence:updated") {
          const payload = message.payload as PresenceMember
          if (payload?.userId) {
            setMembers((prev) =>
              prev.map((m) => (m.userId === payload.userId ? { ...m, ...payload } : m))
            )
          }
        }
      }
    }

    ws.addMessageHandler(channelId, handler)

    ws.send({ type: "presence", channelId })

    const syncTimer = setInterval(() => {
      ws.send({ type: "presence", channelId })
    }, syncInterval)

    return () => {
      ws.removeMessageHandler(channelId, handler)
      clearInterval(syncTimer)
    }
  }, [ws, channelId, syncInterval])

  const updateStatus = useCallback((status: string, newMetadata?: Record<string, unknown>) => {
    setMyStatus(status)
    ws.broadcast(channelId, "presence:updated", {
      status,
      metadata: newMetadata || metadata,
    })
  }, [ws, channelId, metadata])

  return {
    members,
    myStatus,
    updateStatus,
    memberCount: members.length,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useRealtimeChannel Hook (Convenience Hook)
// ─────────────────────────────────────────────────────────────────────────────

export function useRealtimeChannel(
  wsOptions: UseWebSocketOptions,
  channelId: string,
  channelOptions: UseChannelOptions = {},
  presenceOptions: UsePresenceOptions = {}
) {
  const ws = useWebSocket(wsOptions)
  const channel = useChannel(ws, channelId, channelOptions)
  const presence = usePresence(ws, channelId, presenceOptions)

  return {
    connectionState: ws.state,
    isAuthenticated: ws.isAuthenticated,
    isSubscribed: channel.isSubscribed,
    messages: channel.messages,
    members: presence.members,
    memberCount: presence.memberCount,
    myStatus: presence.myStatus,
    connect: ws.connect,
    disconnect: ws.disconnect,
    send: channel.send,
    clearMessages: channel.clearMessages,
    updateStatus: presence.updateStatus,
  }
}
