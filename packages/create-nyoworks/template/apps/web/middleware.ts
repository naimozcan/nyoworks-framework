// ═══════════════════════════════════════════════════════════════════════════════
// Next.js Middleware
// ═══════════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// ─────────────────────────────────────────────────────────────────────────────
// Protected Routes
// ─────────────────────────────────────────────────────────────────────────────

const protectedPaths = ["/dashboard", "/settings", "/profile"]
const authPaths = ["/login", "/register"]

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get("auth-token")?.value

  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path)
  )
  const isAuthPath = authPaths.some((path) => pathname.startsWith(path))

  if (isProtectedPath && !token) {
    const url = new URL("/login", request.url)
    url.searchParams.set("redirect", pathname)
    return NextResponse.redirect(url)
  }

  if (isAuthPath && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
