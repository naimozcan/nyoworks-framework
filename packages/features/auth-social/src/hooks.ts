// ═══════════════════════════════════════════════════════════════════════════════
// Auth Social Feature - React Hooks
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useState, useEffect } from "react"
import type { SocialProviderType } from "./schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type SocialProvider = SocialProviderType

interface SocialAccount {
  id: string
  provider: SocialProvider
  providerAccountId: string
  profile: {
    email?: string
    name?: string
    picture?: string
  } | null
  createdAt: Date
  updatedAt: Date
}

interface LoginResult {
  accessToken: string
  refreshToken?: string
  user: {
    id: string
    email: string
    name?: string
    picture?: string
  }
  isNewUser: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// useSocialLogin Hook
// ─────────────────────────────────────────────────────────────────────────────

interface UseSocialLoginOptions {
  redirectUri: string
  onSuccess?: (result: LoginResult) => void
  onError?: (error: Error) => void
}

export function useSocialLogin(options: UseSocialLoginOptions) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const initiateLogin = useCallback(async (provider: SocialProvider) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/auth/social/oauth-url?${new URLSearchParams({
        provider,
        redirectUri: options.redirectUri,
      })}`)

      if (!response.ok) {
        throw new Error("Failed to get OAuth URL")
      }

      const { url, state } = await response.json()

      sessionStorage.setItem("oauth_state", state)
      sessionStorage.setItem("oauth_provider", provider)

      window.location.href = url
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error")
      setError(error)
      options.onError?.(error)
    } finally {
      setIsLoading(false)
    }
  }, [options])

  const handleCallback = useCallback(async (code: string, state: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const savedState = sessionStorage.getItem("oauth_state")
      const provider = sessionStorage.getItem("oauth_provider") as SocialProvider | null

      if (!savedState || savedState !== state) {
        throw new Error("Invalid OAuth state")
      }

      if (!provider) {
        throw new Error("Missing OAuth provider")
      }

      sessionStorage.removeItem("oauth_state")
      sessionStorage.removeItem("oauth_provider")

      const response = await fetch("/api/auth/social/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          code,
          redirectUri: options.redirectUri,
          state,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Login failed")
      }

      const result: LoginResult = await response.json()
      options.onSuccess?.(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error")
      setError(error)
      options.onError?.(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [options])

  const loginWithGoogle = useCallback(() => initiateLogin("google"), [initiateLogin])
  const loginWithApple = useCallback(() => initiateLogin("apple"), [initiateLogin])
  const loginWithGitHub = useCallback(() => initiateLogin("github"), [initiateLogin])

  return {
    isLoading,
    error,
    initiateLogin,
    handleCallback,
    loginWithGoogle,
    loginWithApple,
    loginWithGitHub,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useSocialAccounts Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useSocialAccounts() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/social/accounts")

      if (!response.ok) {
        throw new Error("Failed to fetch linked accounts")
      }

      const data: SocialAccount[] = await response.json()
      setAccounts(data.map((account) => ({
        ...account,
        createdAt: new Date(account.createdAt),
        updatedAt: new Date(account.updatedAt),
      })))
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const isLinked = useCallback((provider: SocialProvider): boolean => {
    return accounts.some((account: SocialAccount) => account.provider === provider)
  }, [accounts])

  const getAccount = useCallback((provider: SocialProvider): SocialAccount | undefined => {
    return accounts.find((account: SocialAccount) => account.provider === provider)
  }, [accounts])

  return {
    accounts,
    isLoading,
    error,
    fetchAccounts,
    isLinked,
    getAccount,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useLinkAccount Hook
// ─────────────────────────────────────────────────────────────────────────────

interface UseLinkAccountOptions {
  redirectUri: string
  onSuccess?: (account: SocialAccount) => void
  onError?: (error: Error) => void
}

export function useLinkAccount(options: UseLinkAccountOptions) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const initiateLink = useCallback(async (provider: SocialProvider) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/auth/social/oauth-url?${new URLSearchParams({
        provider,
        redirectUri: options.redirectUri,
      })}`)

      if (!response.ok) {
        throw new Error("Failed to get OAuth URL")
      }

      const { url, state } = await response.json()

      sessionStorage.setItem("link_oauth_state", state)
      sessionStorage.setItem("link_oauth_provider", provider)

      window.location.href = url
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error")
      setError(error)
      options.onError?.(error)
    } finally {
      setIsLoading(false)
    }
  }, [options])

  const handleCallback = useCallback(async (code: string, state: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const savedState = sessionStorage.getItem("link_oauth_state")
      const provider = sessionStorage.getItem("link_oauth_provider") as SocialProvider | null

      if (!savedState || savedState !== state) {
        throw new Error("Invalid OAuth state")
      }

      if (!provider) {
        throw new Error("Missing OAuth provider")
      }

      sessionStorage.removeItem("link_oauth_state")
      sessionStorage.removeItem("link_oauth_provider")

      const response = await fetch("/api/auth/social/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          code,
          redirectUri: options.redirectUri,
          state,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to link account")
      }

      const account: SocialAccount = await response.json()
      options.onSuccess?.(account)
      return account
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error")
      setError(error)
      options.onError?.(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [options])

  return {
    isLoading,
    error,
    initiateLink,
    handleCallback,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useUnlinkAccount Hook
// ─────────────────────────────────────────────────────────────────────────────

interface UseUnlinkAccountOptions {
  onSuccess?: (provider: SocialProvider) => void
  onError?: (error: Error) => void
}

export function useUnlinkAccount(options: UseUnlinkAccountOptions = {}) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [unlinkingProvider, setUnlinkingProvider] = useState<SocialProvider | null>(null)

  const unlink = useCallback(async (provider: SocialProvider) => {
    setIsLoading(true)
    setError(null)
    setUnlinkingProvider(provider)

    try {
      const response = await fetch("/api/auth/social/unlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to unlink account")
      }

      options.onSuccess?.(provider)
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error")
      setError(error)
      options.onError?.(error)
      throw error
    } finally {
      setIsLoading(false)
      setUnlinkingProvider(null)
    }
  }, [options])

  const unlinkGoogle = useCallback(() => unlink("google"), [unlink])
  const unlinkApple = useCallback(() => unlink("apple"), [unlink])
  const unlinkGitHub = useCallback(() => unlink("github"), [unlink])

  return {
    isLoading,
    error,
    unlinkingProvider,
    unlink,
    unlinkGoogle,
    unlinkApple,
    unlinkGitHub,
  }
}
