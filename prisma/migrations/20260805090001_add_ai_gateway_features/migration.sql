-- Phase 6 P6-01 (cont): DeliveryStrategy.AI_RESELLER + AiPlan.softCapTokens
-- + AiApiKey.nccKeyId/source/lastBalance* + AiUsage nullable costUsd/upstreamCostUsd
-- Deviations: D46, D47, D48

ALTER TYPE "DeliveryStrategy" ADD VALUE 'AI_RESELLER';

ALTER TABLE "ai_plans" ADD COLUMN "soft_cap_tokens" BIGINT;

ALTER TABLE "ai_api_keys" ADD COLUMN "ncc_key_id" TEXT;
ALTER TABLE "ai_api_keys" ADD COLUMN "source" "AiKeySource" NOT NULL DEFAULT 'kandes_purchased';
ALTER TABLE "ai_api_keys" ADD COLUMN "last_balance_check_at" TIMESTAMP(3);
ALTER TABLE "ai_api_keys" ADD COLUMN "last_balance_usd" DECIMAL(12, 2);

CREATE INDEX "ai_api_keys_ncc_key_id_idx" ON "ai_api_keys"("ncc_key_id");

ALTER TABLE "ai_api_keys" ADD CONSTRAINT "ai_api_keys_ncc_key_id_fkey"
  FOREIGN KEY ("ncc_key_id") REFERENCES "ai_ncc_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_usage" ALTER COLUMN "cost_usd" DROP NOT NULL;
ALTER TABLE "ai_usage" ADD COLUMN "upstream_cost_usd" DECIMAL(12, 6);