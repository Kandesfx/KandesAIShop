-- D74: Re-issue the P5-07 notification columns on `users` table.
-- The previous migration `20260805030000_add_user_notification_prefs`
-- referenced `"user"` (which does not exist in Postgres — Prisma maps
-- `model User` -> table `users`), so it failed on every deploy and blocked
-- the subsequent AI migrations (`ai_ncc_keys`, `ncc_key_id`).
-- This migration applies the same DDL against the correct table name.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegram_chat_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "zalo_user_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notification_prefs" JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname  = 'idx_user_telegram_chat_id'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX "idx_user_telegram_chat_id" ON "users" ("telegram_chat_id") WHERE "telegram_chat_id" IS NOT NULL';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname  = 'idx_user_zalo_user_id'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX "idx_user_zalo_user_id" ON "users" ("zalo_user_id") WHERE "zalo_user_id" IS NOT NULL';
  END IF;
END $$;