// ═══════════════════════════════════════════════════════════════════════════════
// NYOWORKS MCP Server - Constants
// ═══════════════════════════════════════════════════════════════════════════════

const TASK_LOCK_TIMEOUT_MINUTES = 30
const VALID_PHASES = ["DISCOVERY", "ARCHITECTURE", "DESIGN", "PLANNING", "BACKEND", "FRONTEND", "QA", "DEPLOYMENT"]
const VALID_ROLES = ["lead", "architect", "designer", "backend", "frontend", "data", "qa", "devops"]
const ALL_FEATURES = ["payments", "appointments", "inventory", "crm", "cms", "ecommerce", "analytics", "notifications", "audit", "export", "realtime"]

const BIBLE_ROLE_MAPPING: Record<string, string[]> = {
  lead: ["product", "_tracking"],
  architect: ["product", "data", "api", "infra"],
  designer: ["ui"],
  backend: ["features", "data", "api"],
  frontend: ["features", "ui"],
  data: ["data"],
  qa: ["quality", "features"],
  devops: ["infra"],
}

const PHASE_ORDER: Record<string, number> = {
  DISCOVERY: 1,
  ARCHITECTURE: 2,
  DESIGN: 3,
  PLANNING: 4,
  BACKEND: 5,
  FRONTEND: 6,
  QA: 7,
  DEPLOYMENT: 8,
}

const PHASE_ACTIVE_ROLES: Record<string, { primary: string; support: string[] }> = {
  DISCOVERY: { primary: "lead", support: [] },
  ARCHITECTURE: { primary: "architect", support: ["lead", "data"] },
  DESIGN: { primary: "designer", support: ["lead", "frontend"] },
  PLANNING: { primary: "lead", support: ["architect"] },
  BACKEND: { primary: "backend", support: ["data"] },
  FRONTEND: { primary: "frontend", support: ["designer"] },
  QA: { primary: "qa", support: ["backend", "frontend", "devops"] },
  DEPLOYMENT: { primary: "devops", support: ["lead"] },
}

const PHASE_TRANSITIONS: Record<string, { from: string; to: string; checks: string[] }> = {
  DISCOVERY_to_ARCHITECTURE: {
    from: "DISCOVERY",
    to: "ARCHITECTURE",
    checks: ["config_exists", "vision_documented"],
  },
  ARCHITECTURE_to_DESIGN: {
    from: "ARCHITECTURE",
    to: "DESIGN",
    checks: ["schema_exists", "api_documented"],
  },
  DESIGN_to_PLANNING: {
    from: "DESIGN",
    to: "PLANNING",
    checks: ["ui_specs_exist", "user_flows_documented"],
  },
  PLANNING_to_BACKEND: {
    from: "PLANNING",
    to: "BACKEND",
    checks: ["tasks_created"],
  },
  BACKEND_to_FRONTEND: {
    from: "BACKEND",
    to: "FRONTEND",
    checks: ["api_tests_pass", "api_coverage_80"],
  },
  FRONTEND_to_QA: {
    from: "FRONTEND",
    to: "QA",
    checks: ["build_success", "i18n_complete"],
  },
  QA_to_DEPLOYMENT: {
    from: "QA",
    to: "DEPLOYMENT",
    checks: ["e2e_tests_pass", "security_scan_pass"],
  },
}

const DEFAULT_SUB_PHASES: Record<string, Array<{ id: string; name: string; primaryRole: string; supportRoles: string[]; description: string }>> = {
  BACKEND: [
    { id: "IMPL", name: "Implementation", primaryRole: "backend", supportRoles: ["data"], description: "API endpoints, services, business logic" },
    { id: "TEST", name: "Testing", primaryRole: "backend", supportRoles: ["qa"], description: "Unit tests, integration tests" },
    { id: "REVIEW", name: "Review", primaryRole: "lead", supportRoles: ["architect"], description: "Code review, Bible compliance check" },
  ],
  FRONTEND: [
    { id: "CONTRACT", name: "UI Contract", primaryRole: "architect", supportRoles: ["frontend"], description: "Create API types for frontend consumption" },
    { id: "THEME", name: "Theme Setup", primaryRole: "designer", supportRoles: ["frontend"], description: "TweakCN theme integration into globals.css" },
    { id: "LAYOUT", name: "Layout Setup", primaryRole: "architect", supportRoles: ["designer"], description: "Route groups, layout components" },
    { id: "COMPONENTS", name: "Components", primaryRole: "designer", supportRoles: ["frontend"], description: "Feature components per ui/components.md" },
    { id: "PAGES", name: "Pages", primaryRole: "frontend", supportRoles: ["designer"], description: "Page implementation per specs" },
  ],
  QA: [
    { id: "UNIT", name: "Unit Tests", primaryRole: "qa", supportRoles: ["backend", "frontend"], description: "Component and function tests" },
    { id: "INTEGRATION", name: "Integration Tests", primaryRole: "qa", supportRoles: ["backend"], description: "API integration tests" },
    { id: "E2E", name: "E2E Tests", primaryRole: "qa", supportRoles: ["frontend"], description: "Playwright end-to-end tests" },
    { id: "SECURITY", name: "Security Audit", primaryRole: "qa", supportRoles: ["devops"], description: "Security scanning, OWASP checks" },
  ],
}

const VISUAL_GUIDANCE: Record<string, Array<{ library: string; package: string; usage: string; docsUrl: string; license: string }>> = {
  charts: [{ library: "Recharts (via shadcn/ui Charts)", package: "recharts", usage: "Bar, line, pie, donut, sparkline charts. Use shadcn Chart component wrapper.", docsUrl: "https://ui.shadcn.com/docs/components/chart", license: "MIT" }],
  animations: [{ library: "Motion (Framer Motion)", package: "motion", usage: "Layout animations, page transitions, micro-interactions. Use AnimatePresence for mount/unmount.", docsUrl: "https://motion.dev", license: "MIT" }],
  effects: [
    { library: "Magic UI", package: "@magic-ui/react", usage: "Hero sections, backgrounds, text animations. 150+ ready components. Copy-paste, do NOT install.", docsUrl: "https://magicui.design", license: "MIT" },
    { library: "Aceternity UI", package: "N/A (copy-paste)", usage: "Advanced effects: aurora, spotlight, vortex. Copy-paste approach.", docsUrl: "https://ui.aceternity.com", license: "Free tier" },
  ],
  backgrounds: [{ library: "Magic UI", package: "@magic-ui/react", usage: "Dot patterns, grid patterns, animated gradients, particle effects.", docsUrl: "https://magicui.design", license: "MIT" }],
  icons: [{ library: "Lucide React", package: "lucide-react", usage: "1500+ tree-shakable icons. ONLY icon library to use.", docsUrl: "https://lucide.dev", license: "ISC" }],
  loading: [{ library: "Skeleton (shadcn/ui)", package: "built-in", usage: "Loading states. Use Skeleton component from shadcn. Never spinner from scratch.", docsUrl: "https://ui.shadcn.com/docs/components/skeleton", license: "MIT" }],
  tables: [{ library: "TanStack Table (via shadcn/ui Data Table)", package: "@tanstack/react-table", usage: "Sortable, filterable, paginated data tables. Use shadcn DataTable wrapper.", docsUrl: "https://ui.shadcn.com/docs/components/data-table", license: "MIT" }],
  lottie: [{ library: "dotlottie-react", package: "@dotlottie/react-player", usage: "Complex animations: success, onboarding, empty state. Lazy load always.", docsUrl: "https://dotlottie.io", license: "MIT" }],
  forms: [{ library: "React Hook Form + Zod (via shadcn/ui Form)", package: "react-hook-form + zod", usage: "All forms. Use shadcn Form component with Zod resolver.", docsUrl: "https://ui.shadcn.com/docs/components/form", license: "MIT" }],
}

export {
  TASK_LOCK_TIMEOUT_MINUTES,
  VALID_PHASES,
  VALID_ROLES,
  ALL_FEATURES,
  BIBLE_ROLE_MAPPING,
  PHASE_ORDER,
  PHASE_ACTIVE_ROLES,
  PHASE_TRANSITIONS,
  DEFAULT_SUB_PHASES,
  VISUAL_GUIDANCE,
}
