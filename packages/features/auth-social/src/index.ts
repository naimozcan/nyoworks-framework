// ═══════════════════════════════════════════════════════════════════════════════
// Auth Social Feature - Main Export
// ═══════════════════════════════════════════════════════════════════════════════

export * from "./schema.js"
export {
  socialProvider,
  linkAccountInput,
  linkAccountOutput,
  unlinkAccountInput,
  unlinkAccountOutput,
  getLinkedAccountsInput,
  linkedAccountOutput,
  getLinkedAccountsOutput,
  getOAuthUrlInput,
  getOAuthUrlOutput,
  socialLoginInput,
  socialLoginOutput,
  type LinkAccountInput,
  type LinkAccountOutput,
  type UnlinkAccountInput,
  type UnlinkAccountOutput,
  type GetLinkedAccountsOutput,
  type LinkedAccountOutput,
  type GetOAuthUrlInput,
  type GetOAuthUrlOutput,
  type SocialLoginInput,
  type SocialLoginOutput,
} from "./validators.js"
export * from "./router.js"
export * from "./providers.js"
export * from "./hooks.js"
