// ═══════════════════════════════════════════════════════════════════════════════
// Google Calendar Client
// ═══════════════════════════════════════════════════════════════════════════════

import type { GoogleEvent, GoogleCalendar } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

interface GoogleCalendarConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

let calendarConfig: GoogleCalendarConfig | null = null

export function configureGoogleCalendar(config: GoogleCalendarConfig) {
  calendarConfig = config
}

function getConfig(): GoogleCalendarConfig {
  if (!calendarConfig) {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_REDIRECT_URI

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error("Google Calendar not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI")
    }

    calendarConfig = { clientId, clientSecret, redirectUri }
  }
  return calendarConfig
}

// ─────────────────────────────────────────────────────────────────────────────
// OAuth Flow
// ─────────────────────────────────────────────────────────────────────────────

export function getAuthUrl(state?: string): string {
  const config = getConfig()
  const scopes = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
  ]

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    ...(state && { state }),
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export interface TokenResponse {
  accessToken: string
  refreshToken?: string
  expiresIn: number
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const config = getConfig()

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  })

  if (!response.ok) {
    throw new Error("Failed to exchange code for tokens")
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const config = getConfig()

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
    }),
  })

  if (!response.ok) {
    throw new Error("Failed to refresh access token")
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Calendar Operations
// ─────────────────────────────────────────────────────────────────────────────

export async function listCalendars(accessToken: string): Promise<GoogleCalendar[]> {
  const response = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error("Failed to list calendars")
  }

  const data = await response.json()
  return data.items || []
}

export async function listEvents(
  accessToken: string,
  calendarId: string = "primary",
  options?: { timeMin?: Date; timeMax?: Date; maxResults?: number }
): Promise<GoogleEvent[]> {
  const params = new URLSearchParams({
    maxResults: String(options?.maxResults || 100),
    singleEvents: "true",
    orderBy: "startTime",
  })

  if (options?.timeMin) {
    params.set("timeMin", options.timeMin.toISOString())
  }
  if (options?.timeMax) {
    params.set("timeMax", options.timeMax.toISOString())
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!response.ok) {
    throw new Error("Failed to list events")
  }

  const data = await response.json()
  return data.items || []
}

export async function createEvent(
  accessToken: string,
  event: {
    summary: string
    description?: string
    location?: string
    start: Date
    end: Date
    timeZone?: string
    attendees?: string[]
  },
  calendarId: string = "primary"
): Promise<GoogleEvent> {
  const timeZone = event.timeZone || "Europe/Amsterdam"

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendNotifications=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: { dateTime: event.start.toISOString(), timeZone },
        end: { dateTime: event.end.toISOString(), timeZone },
        attendees: event.attendees?.map(email => ({ email })),
      }),
    }
  )

  if (!response.ok) {
    throw new Error("Failed to create event")
  }

  return response.json()
}

export async function updateEvent(
  accessToken: string,
  eventId: string,
  updates: Partial<{
    summary: string
    description: string
    location: string
    start: Date
    end: Date
    attendees: string[]
  }>,
  calendarId: string = "primary"
): Promise<GoogleEvent> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...updates,
        ...(updates.start && { start: { dateTime: updates.start.toISOString(), timeZone: "Europe/Amsterdam" } }),
        ...(updates.end && { end: { dateTime: updates.end.toISOString(), timeZone: "Europe/Amsterdam" } }),
        ...(updates.attendees && { attendees: updates.attendees.map(email => ({ email })) }),
      }),
    }
  )

  if (!response.ok) {
    throw new Error("Failed to update event")
  }

  return response.json()
}

export async function deleteEvent(
  accessToken: string,
  eventId: string,
  calendarId: string = "primary"
): Promise<boolean> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )

  return response.ok
}
