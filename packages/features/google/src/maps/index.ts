// ═══════════════════════════════════════════════════════════════════════════════
// Google Maps Client
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

interface GoogleMapsConfig {
  apiKey: string
}

let mapsConfig: GoogleMapsConfig | null = null

export function configureGoogleMaps(config: GoogleMapsConfig) {
  mapsConfig = config
}

function getConfig(): GoogleMapsConfig {
  if (!mapsConfig) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      throw new Error("Google Maps not configured. Set GOOGLE_MAPS_API_KEY")
    }

    mapsConfig = { apiKey }
  }
  return mapsConfig
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GeoLocation {
  lat: number
  lng: number
}

export interface GeocodeResult {
  formattedAddress: string
  location: GeoLocation
  placeId: string
  components: {
    streetNumber?: string
    street?: string
    city?: string
    province?: string
    postalCode?: string
    country?: string
  }
}

export interface RouteResult {
  distance: { value: number; text: string }
  duration: { value: number; text: string }
  polyline: string
  steps: RouteStep[]
}

export interface RouteStep {
  instruction: string
  distance: { value: number; text: string }
  duration: { value: number; text: string }
  startLocation: GeoLocation
  endLocation: GeoLocation
}

// ─────────────────────────────────────────────────────────────────────────────
// Geocoding
// ─────────────────────────────────────────────────────────────────────────────

export async function geocodeAddress(address: {
  street: string
  houseNumber: string
  postalCode: string
  city: string
  country?: string
}): Promise<GeocodeResult | null> {
  const config = getConfig()
  const fullAddress = `${address.street} ${address.houseNumber}, ${address.postalCode} ${address.city}, ${address.country || "Netherlands"}`

  const params = new URLSearchParams({
    address: fullAddress,
    key: config.apiKey,
  })

  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`)

  if (!response.ok) {
    throw new Error("Geocoding request failed")
  }

  const data = await response.json()

  if (data.status !== "OK" || !data.results?.length) {
    return null
  }

  const result = data.results[0]
  const components = parseAddressComponents(result.address_components)

  return {
    formattedAddress: result.formatted_address,
    location: result.geometry.location,
    placeId: result.place_id,
    components,
  }
}

export async function reverseGeocode(location: GeoLocation): Promise<GeocodeResult | null> {
  const config = getConfig()

  const params = new URLSearchParams({
    latlng: `${location.lat},${location.lng}`,
    key: config.apiKey,
  })

  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`)

  if (!response.ok) {
    throw new Error("Reverse geocoding request failed")
  }

  const data = await response.json()

  if (data.status !== "OK" || !data.results?.length) {
    return null
  }

  const result = data.results[0]
  const components = parseAddressComponents(result.address_components)

  return {
    formattedAddress: result.formatted_address,
    location: result.geometry.location,
    placeId: result.place_id,
    components,
  }
}

function parseAddressComponents(components: Array<{ types: string[]; long_name: string; short_name: string }>) {
  const result: GeocodeResult["components"] = {}

  for (const component of components) {
    if (component.types.includes("street_number")) {
      result.streetNumber = component.long_name
    }
    if (component.types.includes("route")) {
      result.street = component.long_name
    }
    if (component.types.includes("locality")) {
      result.city = component.long_name
    }
    if (component.types.includes("administrative_area_level_1")) {
      result.province = component.long_name
    }
    if (component.types.includes("postal_code")) {
      result.postalCode = component.long_name
    }
    if (component.types.includes("country")) {
      result.country = component.short_name
    }
  }

  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Routing
// ─────────────────────────────────────────────────────────────────────────────

export async function calculateRoute(
  origin: GeoLocation,
  destination: GeoLocation,
  options?: {
    mode?: "driving" | "walking" | "bicycling" | "transit"
    departureTime?: Date
    waypoints?: GeoLocation[]
  }
): Promise<RouteResult | null> {
  const config = getConfig()

  const params = new URLSearchParams({
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    mode: options?.mode || "driving",
    key: config.apiKey,
  })

  if (options?.departureTime) {
    params.set("departure_time", String(Math.floor(options.departureTime.getTime() / 1000)))
  }

  if (options?.waypoints?.length) {
    params.set("waypoints", options.waypoints.map(wp => `${wp.lat},${wp.lng}`).join("|"))
  }

  const response = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params}`)

  if (!response.ok) {
    throw new Error("Directions request failed")
  }

  const data = await response.json()

  if (data.status !== "OK" || !data.routes?.length) {
    return null
  }

  const route = data.routes[0]
  const leg = route.legs[0]

  return {
    distance: leg.distance,
    duration: leg.duration,
    polyline: route.overview_polyline.points,
    steps: leg.steps.map((step: Record<string, unknown>) => ({
      instruction: step.html_instructions as string,
      distance: step.distance as { value: number; text: string },
      duration: step.duration as { value: number; text: string },
      startLocation: step.start_location as GeoLocation,
      endLocation: step.end_location as GeoLocation,
    })),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Distance Matrix
// ─────────────────────────────────────────────────────────────────────────────

export interface DistanceMatrixResult {
  origin: string
  destination: string
  distance: { value: number; text: string }
  duration: { value: number; text: string }
}

export async function calculateDistanceMatrix(
  origins: GeoLocation[],
  destinations: GeoLocation[],
  mode: "driving" | "walking" | "bicycling" | "transit" = "driving"
): Promise<DistanceMatrixResult[]> {
  const config = getConfig()

  const params = new URLSearchParams({
    origins: origins.map(o => `${o.lat},${o.lng}`).join("|"),
    destinations: destinations.map(d => `${d.lat},${d.lng}`).join("|"),
    mode,
    key: config.apiKey,
  })

  const response = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?${params}`)

  if (!response.ok) {
    throw new Error("Distance matrix request failed")
  }

  const data = await response.json()

  if (data.status !== "OK") {
    return []
  }

  const results: DistanceMatrixResult[] = []

  for (let i = 0; i < data.rows.length; i++) {
    for (let j = 0; j < data.rows[i].elements.length; j++) {
      const element = data.rows[i].elements[j]
      if (element.status === "OK") {
        results.push({
          origin: data.origin_addresses[i],
          destination: data.destination_addresses[j],
          distance: element.distance,
          duration: element.duration,
        })
      }
    }
  }

  return results
}
