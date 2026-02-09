// ═══════════════════════════════════════════════════════════════════════════════
// tRPC API Package
// ═══════════════════════════════════════════════════════════════════════════════

export { appRouter, type AppRouter } from "./router"
export { createContext, type Context, type User } from "./context"
export {
  router,
  publicProcedure,
  publicTenantProcedure,
  protectedProcedure,
  tenantProcedure,
  createCallerFactory,
} from "./trpc"
export type {
  FeatureContext,
  AuthenticatedContext,
  TenantContext,
} from "./feature-context"

// ─────────────────────────────────────────────────────────────────────────────
// App-Scoped Context (FAZ 6 Security)
// ─────────────────────────────────────────────────────────────────────────────

export {
  createAppContext,
  extractAppIdFromPath,
  isValidAppId,
  getAppRouteConfig,
  checkCrossAppAccess,
  getAppCORSConfig,
  createAppScopedMiddleware,
  VALID_APP_IDS,
} from "./app-context"

export type {
  AppContext,
  AppContextOptions,
  AppRouteConfig,
  CrossAppCheckResult,
  CORSConfig,
} from "./app-context"
