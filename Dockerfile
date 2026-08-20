# syntax=docker/dockerfile:1.7
# ============================================================================
# Kandes.shop - Multi-stage Dockerfile
# Stage 1 (deps):      Install ALL dependencies (build stage)
# Stage 2 (builder):   Build Next.js standalone bundle
# Stage 3 (runner):    Minimal runtime image (no devDeps, no source)
#
# Target image size: ~200-300 MB (vs ~1 GB if we copy node_modules)
# Build happens in GitHub Actions (ubuntu-latest, 4 vCPU, 16 GB RAM).
# EC2 only pulls the final image, so EC2 RAM does not matter.
#
# Using Debian-based images for better Prisma/OpenSSL compatibility.
# ============================================================================

# ----------------------------------------------------------------------------
# Stage 1: deps - install all dependencies (including devDeps for build)
# ----------------------------------------------------------------------------
FROM node:20-bookworm AS deps
WORKDIR /app

# Copy only manifests first for layer caching
COPY package.json package-lock.json* .npmrc* ./

# Install with devDeps (needed for next build + tsc + prisma generate)
# Use --legacy-peer-deps to be safe with husky postinstall scripts
RUN \
  if [ -f package-lock.json ]; then \
    npm ci --include=dev --no-audit --no-fund; \
  else \
    npm install --include=dev --no-audit --no-fund; \
  fi

# ----------------------------------------------------------------------------
# Stage 2: builder - build Next.js + Prisma
# ----------------------------------------------------------------------------
FROM node:20-bookworm AS builder
WORKDIR /app

# Build-time secrets (runtime uses real env vars from .env)
ARG DATABASE_URL
ARG SESSION_SECRET
ARG ENCRYPTION_KEY
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV DATABASE_URL=${DATABASE_URL:-postgresql://build:build@localhost:5432/build}
ENV SESSION_SECRET=${SESSION_SECRET:-build-secret-32chars-minimum-here}
ENV ENCRYPTION_KEY=${ENCRYPTION_KEY:-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef}
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID:-673414936620-2301olaaam2vmqi03nl99vse5taj8805.apps.googleusercontent.com}

# Copy deps from previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client (writes to node_modules/.prisma + node_modules/@prisma/client)
RUN npx prisma generate

# Build Next.js (uses standalone output to keep image small)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ----------------------------------------------------------------------------
# Stage 3: runner - minimal production image
# ----------------------------------------------------------------------------
FROM node:20-bookworm-slim AS runner
WORKDIR /app

# Install runtime deps for Prisma (libssl), curl for healthcheck,
# and postgresql-client for `pg_dump` (D74: db-backup cron job).
RUN apt-get update -y && apt-get install -y openssl curl ca-certificates postgresql-client && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user for security
RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs

# Copy built standalone bundle (Next.js output: "standalone" mode)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public            ./public

# Prisma client + schema (needed at runtime for queries)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma         ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma/client  ./node_modules/@prisma/client
COPY --from=builder --chown=nextjs:nodejs /app/prisma                        ./prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
