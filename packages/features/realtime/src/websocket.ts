// ═══════════════════════════════════════════════════════════════════════════════
// Realtime Feature - WebSocket Server
// ═══════════════════════════════════════════════════════════════════════════════

import { WebSocketServer, WebSocket } from "ws"
import { wsMessageInput, wsAuthInput } from "./validators.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface AuthenticatedClient {
  ws: WebSocket
  userId: string
  tenantId: string
  channels: Set<string>
  lastHeartbeat: number
}

interface WebSocketConfig {
  port?: number
  path?: string
  heartbeatInterval?: number
  heartbeatTimeout?: number
  maxPayloadSize?: number
  verifyToken: (token: string) => Promise<{ userId: string; tenantId: string } | null>
  onConnect?: (client: AuthenticatedClient) => void
  onDisconnect?: (client: AuthenticatedClient) => void
  onMessage?: (client: AuthenticatedClient, event: string, payload: unknown) => void
  onError?: (error: Error) => void
}

interface BroadcastOptions {
  excludeUserId?: string
  includeUserIds?: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket Server Manager
// ─────────────────────────────────────────────────────────────────────────────

class RealtimeWebSocketServer {
  private wss: WebSocketServer | null = null
  private clients: Map<WebSocket, AuthenticatedClient> = new Map()
  private channels: Map<string, Set<WebSocket>> = new Map()
  private config: WebSocketConfig
  private heartbeatTimer: NodeJS.Timeout | null = null

  constructor(config: WebSocketConfig) {
    this.config = {
      port: 3001,
      path: "/ws",
      heartbeatInterval: 30000,
      heartbeatTimeout: 60000,
      maxPayloadSize: 1024 * 1024,
      ...config,
    }
  }

  start(): void {
    this.wss = new WebSocketServer({
      port: this.config.port,
      path: this.config.path,
      maxPayload: this.config.maxPayloadSize,
    })

    this.wss.on("connection", (ws) => {
      this.handleConnection(ws)
    })

    this.wss.on("error", (error) => {
      this.config.onError?.(error)
    })

    this.startHeartbeatCheck()
  }

  stop(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    this.clients.forEach((client) => {
      client.ws.close(1000, "Server shutting down")
    })

    this.clients.clear()
    this.channels.clear()

    this.wss?.close()
    this.wss = null
  }

  private handleConnection(ws: WebSocket): void {
    let authenticated = false
    let authTimeout: NodeJS.Timeout | null = null

    authTimeout = setTimeout(() => {
      if (!authenticated) {
        ws.close(4001, "Authentication timeout")
      }
    }, 10000)

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString())

        if (!authenticated) {
          const authResult = wsAuthInput.safeParse(message)
          if (!authResult.success) {
            ws.close(4002, "Invalid auth message")
            return
          }

          const user = await this.config.verifyToken(authResult.data.token)
          if (!user) {
            ws.close(4003, "Authentication failed")
            return
          }

          authenticated = true
          if (authTimeout) clearTimeout(authTimeout)

          const client: AuthenticatedClient = {
            ws,
            userId: user.userId,
            tenantId: user.tenantId,
            channels: new Set(),
            lastHeartbeat: Date.now(),
          }

          this.clients.set(ws, client)
          this.config.onConnect?.(client)

          this.send(ws, { type: "authenticated", userId: user.userId })
          return
        }

        const client = this.clients.get(ws)
        if (!client) return

        const msgResult = wsMessageInput.safeParse(message)
        if (!msgResult.success) {
          this.send(ws, { type: "error", message: "Invalid message format" })
          return
        }

        this.handleMessage(client, msgResult.data)
      } catch {
        this.send(ws, { type: "error", message: "Invalid JSON" })
      }
    })

    ws.on("close", () => {
      if (authTimeout) clearTimeout(authTimeout)
      this.handleDisconnect(ws)
    })

    ws.on("error", () => {
      this.handleDisconnect(ws)
    })
  }

  private handleMessage(
    client: AuthenticatedClient,
    message: { type: string; channelId?: string; event?: string; payload?: unknown }
  ): void {
    const { type, channelId, event, payload } = message

    switch (type) {
      case "subscribe":
        if (channelId) {
          this.subscribeToChannel(client, channelId)
        }
        break

      case "unsubscribe":
        if (channelId) {
          this.unsubscribeFromChannel(client, channelId)
        }
        break

      case "broadcast":
        if (channelId && event) {
          this.broadcastToChannel(channelId, event, payload, { excludeUserId: client.userId })
          this.config.onMessage?.(client, event, payload)
        }
        break

      case "presence":
        if (channelId) {
          const members = this.getChannelMembers(channelId)
          this.send(client.ws, { type: "presence", channelId, members })
        }
        break

      case "ping":
        client.lastHeartbeat = Date.now()
        this.send(client.ws, { type: "pong", timestamp: Date.now() })
        break
    }
  }

  private subscribeToChannel(client: AuthenticatedClient, channelId: string): void {
    client.channels.add(channelId)

    if (!this.channels.has(channelId)) {
      this.channels.set(channelId, new Set())
    }
    this.channels.get(channelId)?.add(client.ws)

    this.send(client.ws, { type: "subscribed", channelId })

    this.broadcastToChannel(channelId, "user:joined", {
      userId: client.userId,
      timestamp: Date.now(),
    }, { excludeUserId: client.userId })
  }

  private unsubscribeFromChannel(client: AuthenticatedClient, channelId: string): void {
    client.channels.delete(channelId)
    this.channels.get(channelId)?.delete(client.ws)

    if (this.channels.get(channelId)?.size === 0) {
      this.channels.delete(channelId)
    }

    this.send(client.ws, { type: "unsubscribed", channelId })

    this.broadcastToChannel(channelId, "user:left", {
      userId: client.userId,
      timestamp: Date.now(),
    })
  }

  private handleDisconnect(ws: WebSocket): void {
    const client = this.clients.get(ws)
    if (!client) return

    client.channels.forEach((channelId) => {
      this.broadcastToChannel(channelId, "user:left", {
        userId: client.userId,
        timestamp: Date.now(),
      })

      this.channels.get(channelId)?.delete(ws)
      if (this.channels.get(channelId)?.size === 0) {
        this.channels.delete(channelId)
      }
    })

    this.config.onDisconnect?.(client)
    this.clients.delete(ws)
  }

  private startHeartbeatCheck(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now()
      const timeout = this.config.heartbeatTimeout || 60000

      this.clients.forEach((client, ws) => {
        if (now - client.lastHeartbeat > timeout) {
          ws.close(4004, "Heartbeat timeout")
          this.handleDisconnect(ws)
        }
      })
    }, this.config.heartbeatInterval || 30000)
  }

  private send(ws: WebSocket, data: unknown): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
    }
  }

  broadcastToChannel(channelId: string, event: string, payload: unknown, options?: BroadcastOptions): void {
    const channelClients = this.channels.get(channelId)
    if (!channelClients) return

    const message = JSON.stringify({ type: "message", channelId, event, payload, timestamp: Date.now() })

    channelClients.forEach((ws) => {
      const client = this.clients.get(ws)
      if (!client) return

      if (options?.excludeUserId && client.userId === options.excludeUserId) return
      if (options?.includeUserIds && !options.includeUserIds.includes(client.userId)) return

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message)
      }
    })
  }

  broadcast(event: string, payload: unknown): void {
    const message = JSON.stringify({ type: "broadcast", event, payload, timestamp: Date.now() })

    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message)
      }
    })
  }

  getChannelMembers(channelId: string): Array<{ userId: string; tenantId: string }> {
    const channelClients = this.channels.get(channelId)
    if (!channelClients) return []

    const members: Array<{ userId: string; tenantId: string }> = []
    channelClients.forEach((ws) => {
      const client = this.clients.get(ws)
      if (client) {
        members.push({ userId: client.userId, tenantId: client.tenantId })
      }
    })

    return members
  }

  getClientCount(): number {
    return this.clients.size
  }

  getChannelCount(): number {
    return this.channels.size
  }

  getClientsByTenant(tenantId: string): AuthenticatedClient[] {
    const clients: AuthenticatedClient[] = []
    this.clients.forEach((client) => {
      if (client.tenantId === tenantId) {
        clients.push(client)
      }
    })
    return clients
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory Function
// ─────────────────────────────────────────────────────────────────────────────

export function createWebSocketServer(config: WebSocketConfig): RealtimeWebSocketServer {
  return new RealtimeWebSocketServer(config)
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export { RealtimeWebSocketServer }
export type { WebSocketConfig, AuthenticatedClient, BroadcastOptions }
