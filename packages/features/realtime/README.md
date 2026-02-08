# @nyoworks/feature-realtime

NYOWORKS Realtime Feature - WebSocket server and presence management for real-time applications.

## Installation

```bash
pnpm add @nyoworks/feature-realtime
```

## Features

- WebSocket server with authentication
- Channel-based pub/sub messaging
- Presence tracking with heartbeat
- Automatic reconnection logic
- React hooks for easy integration
- tRPC router for HTTP fallback

## Usage

### Server-Side Setup

```typescript
import { createWebSocketServer } from "@nyoworks/feature-realtime/websocket"

const wsServer = createWebSocketServer({
  port: 3001,
  path: "/ws",
  verifyToken: async (token) => {
    // Verify JWT and return user info
    const payload = await verifyJWT(token)
    return payload ? { userId: payload.sub, tenantId: payload.tenantId } : null
  },
  onConnect: (client) => {
    console.log(`User ${client.userId} connected`)
  },
  onDisconnect: (client) => {
    console.log(`User ${client.userId} disconnected`)
  },
})

wsServer.start()
```

### Database Schema

```typescript
import { presenceRecords, channels, messages } from "@nyoworks/feature-realtime/schema"

// Use with Drizzle ORM migrations
```

### React Hooks

```tsx
import { useWebSocket, useChannel, usePresence } from "@nyoworks/feature-realtime"

function ChatRoom({ channelId }: { channelId: string }) {
  const ws = useWebSocket({
    url: "ws://localhost:3001/ws",
    token: authToken,
  })

  const { messages, send, isSubscribed } = useChannel(ws, channelId, {
    onMessage: (event, payload) => {
      console.log("Received:", event, payload)
    },
  })

  const { members, updateStatus } = usePresence(ws, channelId)

  const sendMessage = (text: string) => {
    send("chat:message", { text })
  }

  return (
    <div>
      <div>Connected: {ws.isAuthenticated ? "Yes" : "No"}</div>
      <div>Members online: {members.length}</div>
      <div>Messages: {messages.length}</div>
    </div>
  )
}
```

### Convenience Hook

```tsx
import { useRealtimeChannel } from "@nyoworks/feature-realtime"

function LiveRoom() {
  const {
    connectionState,
    isSubscribed,
    messages,
    members,
    send,
    updateStatus,
  } = useRealtimeChannel(
    { url: "ws://localhost:3001/ws", token: authToken },
    "room:123"
  )

  return <div>...</div>
}
```

### tRPC Router

```typescript
import { realtimeRouter } from "@nyoworks/feature-realtime/router"

// Add to your tRPC app router
export const appRouter = router({
  realtime: realtimeRouter,
})
```

## API Reference

### WebSocket Messages

| Type | Direction | Description |
|------|-----------|-------------|
| `subscribe` | Client -> Server | Subscribe to a channel |
| `unsubscribe` | Client -> Server | Unsubscribe from a channel |
| `broadcast` | Client -> Server | Send message to channel |
| `presence` | Client -> Server | Request presence list |
| `ping` | Client -> Server | Keep connection alive |
| `pong` | Server -> Client | Heartbeat response |
| `subscribed` | Server -> Client | Subscription confirmed |
| `unsubscribed` | Server -> Client | Unsubscription confirmed |
| `message` | Server -> Client | Channel message |
| `user:joined` | Server -> Client | User joined channel |
| `user:left` | Server -> Client | User left channel |
| `presence:updated` | Server -> Client | Presence status changed |

### Presence Statuses

- `online` - User is active
- `away` - User is idle
- `busy` - User is busy
- `offline` - User disconnected

### Channel Types

- `public` - Anyone can join
- `private` - Requires authorization
- `presence` - Tracks member presence

## Configuration

### WebSocket Server Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | number | 3001 | WebSocket server port |
| `path` | string | "/ws" | WebSocket endpoint path |
| `heartbeatInterval` | number | 30000 | Heartbeat check interval (ms) |
| `heartbeatTimeout` | number | 60000 | Client timeout (ms) |
| `maxPayloadSize` | number | 1MB | Maximum message size |

### Client Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoConnect` | boolean | true | Connect on mount |
| `reconnect` | boolean | true | Auto-reconnect on disconnect |
| `reconnectDelay` | number | 3000 | Base reconnect delay (ms) |
| `maxReconnectAttempts` | number | 10 | Maximum reconnect attempts |
| `heartbeatInterval` | number | 25000 | Client heartbeat interval (ms) |

## License

MIT
