-- Phase 7-RB (D55): KH opt-in pin NCC key + rotation policy.
ALTER TABLE "ai_api_keys"
  ADD COLUMN IF NOT EXISTS "rotation_policy" TEXT NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS "pinned_ncc_key_id" TEXT;

-- Rename existing ambiguous relation 'apiKeys' để giữ namespacing rõ ràng.
-- Prisma tự generate relation name khi có >1 relation giữa 2 model.
-- Không cần DROP constraint vì Prisma migration sinh constraint name trùng pattern.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'ai_api_keys_pinned_ncc_key_id_idx'
  ) THEN
    CREATE INDEX "ai_api_keys_pinned_ncc_key_id_idx"
      ON "ai_api_keys"("pinned_ncc_key_id");
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'ai_api_keys_rotation_policy_idx'
  ) THEN
    CREATE INDEX "ai_api_keys_rotation_policy_idx"
      ON "ai_api_keys"("rotation_policy");
  END IF;
END$$;

-- FK constraint cho pinned_ncc_key_id → ai_ncc_keys(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ai_api_keys_pinned_ncc_key_id_fkey'
  ) THEN
    ALTER TABLE "ai_api_keys"
      ADD CONSTRAINT "ai_api_keys_pinned_ncc_key_id_fkey"
      FOREIGN KEY ("pinned_ncc_key_id") REFERENCES "ai_ncc_keys"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;