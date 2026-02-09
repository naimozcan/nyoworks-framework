// ═══════════════════════════════════════════════════════════════════════════════
// Google Feature - React Hooks
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// useGoogleCalendar Hook
// ─────────────────────────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  location?: string
  description?: string
}

export function useGoogleCalendar() {
  const [isConnected, setIsConnected] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const connect = useCallback(async (authUrl: string) => {
    window.location.href = authUrl
  }, [])

  const disconnect = useCallback(async () => {
    setIsConnected(false)
    setEvents([])
  }, [])

  return {
    isConnected,
    events,
    isLoading,
    connect,
    disconnect,
    setEvents,
    setIsLoading,
    setIsConnected,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useGoogleMaps Hook
// ─────────────────────────────────────────────────────────────────────────────

export interface MapLocation {
  lat: number
  lng: number
  address?: string
}

export function useGoogleMaps() {
  const [center, setCenter] = useState<MapLocation>({ lat: 52.0705, lng: 4.3007 })
  const [zoom, setZoom] = useState(10)
  const [markers, setMarkers] = useState<MapLocation[]>([])

  const addMarker = useCallback((location: MapLocation) => {
    setMarkers(prev => [...prev, location])
  }, [])

  const removeMarker = useCallback((index: number) => {
    setMarkers(prev => prev.filter((_, i) => i !== index))
  }, [])

  const clearMarkers = useCallback(() => {
    setMarkers([])
  }, [])

  const focusOnLocation = useCallback((location: MapLocation, zoomLevel?: number) => {
    setCenter(location)
    if (zoomLevel) setZoom(zoomLevel)
  }, [])

  return {
    center,
    zoom,
    markers,
    setCenter,
    setZoom,
    addMarker,
    removeMarker,
    clearMarkers,
    focusOnLocation,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useNLAddress Hook (Netherlands-specific)
// ─────────────────────────────────────────────────────────────────────────────

export interface NLAddress {
  postalCode: string
  houseNumber: string
  houseNumberSuffix?: string
  street?: string
  city?: string
}

export function useNLAddress() {
  const [address, setAddress] = useState<NLAddress | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  const formatPostalCode = useCallback((input: string): string => {
    const cleaned = input.replace(/\s/g, "").toUpperCase()
    if (cleaned.length >= 6) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 6)}`
    }
    return cleaned
  }, [])

  const isValidPostalCode = useMemo(() => {
    if (!address?.postalCode) return false
    return /^[1-9][0-9]{3}\s?[A-Z]{2}$/i.test(address.postalCode)
  }, [address?.postalCode])

  return {
    address,
    isValidating,
    isValidPostalCode,
    setAddress,
    setIsValidating,
    formatPostalCode,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useRouteOptimization Hook
// ─────────────────────────────────────────────────────────────────────────────

export interface RouteStop {
  id: string
  location: MapLocation
  estimatedArrival?: Date
  duration?: number
}

export function useRouteOptimization() {
  const [stops, setStops] = useState<RouteStop[]>([])
  const [totalDistance, setTotalDistance] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [isOptimizing, setIsOptimizing] = useState(false)

  const addStop = useCallback((stop: RouteStop) => {
    setStops(prev => [...prev, stop])
  }, [])

  const removeStop = useCallback((stopId: string) => {
    setStops(prev => prev.filter(s => s.id !== stopId))
  }, [])

  const reorderStops = useCallback((fromIndex: number, toIndex: number) => {
    setStops(prev => {
      const result = [...prev]
      const [removed] = result.splice(fromIndex, 1)
      if (removed) {
        result.splice(toIndex, 0, removed)
      }
      return result
    })
  }, [])

  return {
    stops,
    totalDistance,
    totalDuration,
    isOptimizing,
    addStop,
    removeStop,
    reorderStops,
    setStops,
    setTotalDistance,
    setTotalDuration,
    setIsOptimizing,
  }
}
