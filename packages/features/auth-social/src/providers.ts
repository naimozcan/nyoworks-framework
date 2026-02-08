// ═══════════════════════════════════════════════════════════════════════════════
// Auth Social Feature - OAuth Providers
// ═══════════════════════════════════════════════════════════════════════════════

import type { SocialProfile, SocialProviderType } from "./schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Provider Configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface OAuthConfig {
  clientId: string
  clientSecret: string
  authorizationUrl: string
  tokenUrl: string
  userInfoUrl: string
  scopes: string[]
}

export interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type: string
  id_token?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider Configurations
// ─────────────────────────────────────────────────────────────────────────────

const providers: Record<SocialProviderType, OAuthConfig> = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
    scopes: ["openid", "email", "profile"],
  },
  apple: {
    clientId: process.env.APPLE_CLIENT_ID || "",
    clientSecret: process.env.APPLE_CLIENT_SECRET || "",
    authorizationUrl: "https://appleid.apple.com/auth/authorize",
    tokenUrl: "https://appleid.apple.com/auth/token",
    userInfoUrl: "",
    scopes: ["name", "email"],
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    authorizationUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    userInfoUrl: "https://api.github.com/user",
    scopes: ["read:user", "user:email"],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Get Provider Config
// ─────────────────────────────────────────────────────────────────────────────

export function getProviderConfig(provider: SocialProviderType): OAuthConfig {
  const config = providers[provider]
  if (!config) {
    throw new Error(`Unknown provider: ${provider}`)
  }
  return config
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate Authorization URL
// ─────────────────────────────────────────────────────────────────────────────

export function generateAuthUrl(
  provider: SocialProviderType,
  redirectUri: string,
  state: string
): string {
  const config = getProviderConfig(provider)

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: config.scopes.join(" "),
    state,
  })

  if (provider === "google") {
    params.set("access_type", "offline")
    params.set("prompt", "consent")
  }

  if (provider === "apple") {
    params.set("response_mode", "form_post")
  }

  return `${config.authorizationUrl}?${params.toString()}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Exchange Code for Tokens
// ─────────────────────────────────────────────────────────────────────────────

export async function exchangeCodeForTokens(
  provider: SocialProviderType,
  code: string,
  redirectUri: string
): Promise<TokenResponse> {
  const config = getProviderConfig(provider)

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  })

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  }

  if (provider === "github") {
    headers["Accept"] = "application/json"
  }

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers,
    body: body.toString(),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token exchange failed: ${error}`)
  }

  return response.json()
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch User Profile
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchUserProfile(
  provider: SocialProviderType,
  accessToken: string,
  idToken?: string
): Promise<{ providerAccountId: string; profile: SocialProfile }> {
  const config = getProviderConfig(provider)

  if (provider === "apple" && idToken) {
    return parseAppleIdToken(idToken)
  }

  const response = await fetch(config.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch user profile: ${response.statusText}`)
  }

  const data = await response.json()

  return normalizeProfile(provider, data)
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalize Profile
// ─────────────────────────────────────────────────────────────────────────────

function normalizeProfile(
  provider: SocialProviderType,
  data: Record<string, unknown>
): { providerAccountId: string; profile: SocialProfile } {
  switch (provider) {
    case "google":
      return {
        providerAccountId: String(data.id),
        profile: {
          email: data.email as string | undefined,
          name: data.name as string | undefined,
          picture: data.picture as string | undefined,
          locale: data.locale as string | undefined,
        },
      }

    case "github":
      return {
        providerAccountId: String(data.id),
        profile: {
          email: data.email as string | undefined,
          name: (data.name || data.login) as string | undefined,
          picture: data.avatar_url as string | undefined,
        },
      }

    case "apple":
      return {
        providerAccountId: String(data.sub),
        profile: {
          email: data.email as string | undefined,
          name: data.name as string | undefined,
        },
      }

    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Parse Apple ID Token
// ─────────────────────────────────────────────────────────────────────────────

function parseAppleIdToken(idToken: string): { providerAccountId: string; profile: SocialProfile } {
  const parts = idToken.split(".")
  if (parts.length !== 3) {
    throw new Error("Invalid ID token format")
  }

  const payload = JSON.parse(Buffer.from(parts[1]!, "base64url").toString())

  return {
    providerAccountId: payload.sub,
    profile: {
      email: payload.email,
      name: payload.name,
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Refresh Access Token
// ─────────────────────────────────────────────────────────────────────────────

export async function refreshAccessToken(
  provider: SocialProviderType,
  refreshToken: string
): Promise<TokenResponse> {
  const config = getProviderConfig(provider)

  if (provider === "github") {
    throw new Error("GitHub does not support refresh tokens")
  }

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  })

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token refresh failed: ${error}`)
  }

  return response.json()
}

// ─────────────────────────────────────────────────────────────────────────────
// Revoke Access Token
// ─────────────────────────────────────────────────────────────────────────────

export async function revokeAccessToken(
  provider: SocialProviderType,
  token: string
): Promise<void> {
  const revokeUrls: Record<SocialProviderType, string | null> = {
    google: "https://oauth2.googleapis.com/revoke",
    apple: null,
    github: null,
  }

  const revokeUrl = revokeUrls[provider]
  if (!revokeUrl) {
    return
  }

  const body = new URLSearchParams({ token })

  await fetch(revokeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate State
// ─────────────────────────────────────────────────────────────────────────────

export function generateState(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export { providers }
