// ═══════════════════════════════════════════════════════════════════════════════
// tRPC API Package
// ═══════════════════════════════════════════════════════════════════════════════

export { appRouter, type AppRouter } from "./router"
export { createContext, type Context, type User } from "./context"
export {
  router,
  publicProcedure,
  protectedProcedure,
  tenantProcedure,
  createCallerFactory,
} from "./trpc"
export type {
  FeatureContext,
  AuthenticatedContext,
  TenantContext,
  RequestInfoContext,
  AuthenticatedRequestContext,
  TenantRequestContext,
} from "./feature-context"
