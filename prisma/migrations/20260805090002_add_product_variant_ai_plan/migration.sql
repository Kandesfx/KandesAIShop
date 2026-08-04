-- Phase 6 P6-11: ProductVariant.aiPlanId — link variant to AI plan (for AI_RESELLER delivery)
-- Spec: docs/tasks/PHASE_6_AI_GATEWAY.md §P6-11
-- Deviation: D48

ALTER TABLE "product_variants" ADD COLUMN "ai_plan_id" TEXT;

CREATE INDEX "product_variants_ai_plan_id_idx" ON "product_variants"("ai_plan_id");

ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_ai_plan_id_fkey"
  FOREIGN KEY ("ai_plan_id") REFERENCES "ai_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;