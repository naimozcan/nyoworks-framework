// ═══════════════════════════════════════════════════════════════════════════════
// NYOWORKS MCP Server - Retry Utility
// ═══════════════════════════════════════════════════════════════════════════════

interface RetryOptions {
  maxRetries: number
  delayMs: number
  backoffMultiplier: number
  maxDelayMs: number
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  delayMs: 100,
  backoffMultiplier: 2,
  maxDelayMs: 5000,
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function withRetry<T>(
  fn: () => T | Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let lastError: Error | null = null
  let currentDelay = opts.delayMs

  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt === opts.maxRetries) {
        break
      }

      await sleep(currentDelay)
      currentDelay = Math.min(currentDelay * opts.backoffMultiplier, opts.maxDelayMs)
    }
  }

  throw lastError
}

function withRetrySync<T>(
  fn: () => T,
  options: Partial<RetryOptions> = {}
): T {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    try {
      return fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt === opts.maxRetries) {
        break
      }
    }
  }

  throw lastError
}

export { withRetry, withRetrySync, DEFAULT_RETRY_OPTIONS }
export type { RetryOptions }
