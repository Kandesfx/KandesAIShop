# syntax=docker/dockerfile:1.7
# ============================================================================
# Kandes.shop - Multi-stage Dockerfile
# Stage 1 (deps):      Install ALL dependencies (build stage)
# Stage 2 (builder):   Build Next.js standalone bundle
# Stage 3 (runner):    Minimal runtime image (no devDeps, no source)
#
# Target image size: ~150-200 MB (vs ~1 GB if we copy node_modules)
# Build happens in GitHub Actions (ubuntu-latest, 4 vCPU, 16 GB RAM).
# EC2 only pulls the final image, so EC2 RAM does not matter.
# ============================================================================

# ----------------------------------------------------------------------------
# Stage 1: deps - install all dependencies (including devDeps for build)
# ----------------------------------------------------------------------------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
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
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Dummy DATABASE_URL for build-time validation (runtime uses real env var)
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL:-postgresql://build:build@localhost:5432/build}

# Copy deps from previous stage
COPY --from=deps /app/node_modules ./node_modules

# Dummy DATABASE_URL for build-time validation (runtime uses real env var)
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL:-postgresql://build:build@localhost:5432/build}

COPY . .

# Generate Prisma client (writes to node_modules/.prisma + node_modules/@prisma/client)
RUN npx prisma generate

# Build Next.js (uses standalone output to keep image small)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ----------------------------------------------------------------------------
# Stage 3: runner - minimal production image
# ----------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

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
