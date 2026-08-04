-- Phase 6 P6-01: AI NCC key pool + 2 enums
-- Spec: docs/tasks/PHASE_6_AI_GATEWAY.md (reseller model)
-- Deviations: D46, D47, D48, D52

CREATE TYPE "AiNccKeyStatus" AS ENUM ('active', 'low_balance', 'exhausted', 'disabled');
CREATE TYPE "AiKeySource" AS ENUM ('kandes_purchased', 'user_provided');

-- Thêm 'ccpro' vào enum AiProvider (Phase 6 reseller).
-- Dùng IF NOT EXISTS để idempotent nếu enum đã có ccpro sẵn (Phase 6 init).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'ccpro'
      AND enumtypid = '"AiProvider"'::regtype
  ) THEN
    ALTER TYPE "AiProvider" ADD VALUE 'ccpro';
  END IF;
END$$;

CREATE TABLE "ai_ncc_keys" (
  "id" TEXT NOT NULL,
  "provider" "AiProvider" NOT NULL,
  "api_key_encrypted" BYTEA NOT NULL,
  "total_quota_usd" DECIMAL(12, 2) NOT NULL,
  "remaining_usd" DECIMAL(12, 2) NOT NULL,
  "nickname" TEXT,
  "status" "AiNccKeyStatus" NOT NULL DEFAULT 'active',
  "last_synced_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_ncc_keys_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_ncc_keys_status_remaining_usd_idx" ON "ai_ncc_keys"("status", "remaining_usd" DESC);