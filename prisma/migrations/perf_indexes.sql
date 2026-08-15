-- Performance indexes — Phase 11-PERF
-- Run via: psql $DATABASE_URL -f prisma/migrations/perf_indexes.sql
--
-- These complement Prisma @@index declarations for AI gateway tables.
-- Idempotent (uses IF NOT EXISTS) — safe to run multiple times.

-- AI usage: time-based aggregations (dashboard, exports)
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at_desc ON ai_usage(created_at DESC);

-- AI usage: by provider+model for analytics
CREATE INDEX IF NOT EXISTS idx_ai_usage_provider_model ON ai_usage(provider, model);

-- AI API keys: by user+status for listing
CREATE INDEX IF NOT EXISTS idx_ai_api_keys_user_status ON ai_api_keys(user_id, status);

-- AI API keys: by plan for plan-based queries
CREATE INDEX IF NOT EXISTS idx_ai_api_keys_plan ON ai_api_keys(plan_id);

-- AI API keys: by user+createdAt for activity feeds
CREATE INDEX IF NOT EXISTS idx_ai_api_keys_user_created ON ai_api_keys(user_id, created_at DESC);

-- AI API keys: by status+expiresAt for cleanup queries
CREATE INDEX IF NOT EXISTS idx_ai_api_keys_status_expires ON ai_api_keys(status, expires_at);

-- NCC keys: by provider+status for routing
CREATE INDEX IF NOT EXISTS idx_ai_ncc_keys_provider_status ON ai_ncc_keys(provider, status);

-- Analyze tables to refresh statistics
ANALYZE ai_usage;
ANALYZE ai_api_keys;
ANALYZE ai_ncc_keys;
