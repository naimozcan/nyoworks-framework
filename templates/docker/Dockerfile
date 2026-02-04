# ═══════════════════════════════════════════════════════════════════════════════
# NYOWORKS Production Dockerfile
# Multi-stage build with distroless for security
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Dependencies
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/database/package.json ./packages/database/
COPY packages/validators/package.json ./packages/validators/
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN corepack enable pnpm && \
    pnpm install --frozen-lockfile --prod

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Builder
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN corepack enable pnpm && \
    pnpm install --frozen-lockfile && \
    pnpm turbo build --filter=@project/api

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3: Production (Distroless - No Shell)
# ─────────────────────────────────────────────────────────────────────────────
FROM gcr.io/distroless/nodejs22-debian12 AS production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/validators/dist ./packages/validators/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

USER nonroot:nonroot

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["/nodejs/bin/node", "-e", "fetch('http://localhost:3000/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"]

CMD ["dist/index.js"]
