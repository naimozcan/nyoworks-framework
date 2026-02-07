#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════════
// NYOWORKS MCP Server - AI Team Orchestration
// ═══════════════════════════════════════════════════════════════════════════════

import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"
import { loadState, logError } from "./state.js"
import { toolHandlers, toolDefinitions } from "./tools/index.js"

// ─────────────────────────────────────────────────────────────────────────────
// Server Setup
// ─────────────────────────────────────────────────────────────────────────────

const server = new Server(
  { name: "nyoworks-mcp", version: "2.1.0" },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: toolDefinitions }))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  const handler = toolHandlers[name]

  if (!handler) {
    const error = `Unknown tool: ${name}`
    logError(name, error, args as Record<string, unknown>)
    throw new Error(error)
  }

  try {
    const result = handler(args as Record<string, unknown>)
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    logError(name, errorMessage, args as Record<string, unknown>)
    return { content: [{ type: "text", text: JSON.stringify({ error: errorMessage }, null, 2) }] }
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  loadState()
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error("NYOWORKS MCP Server running...")
}

main().catch(console.error)
