-- P5-07: Notification opt-in columns + NotificationPreference table
-- D74-A: switched `user` -> `users` (Prisma @@map) + IF NOT EXISTS guards
-- so this works on both fresh CI DBs and the production RDS where it's
-- already been resolved as applied (see CONTEXT.md D74-A).
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
    CREATE UNIQUE INDEX "idx_user_telegram_chat_id"
      ON "users" ("telegram_chat_id")
      WHERE "telegram_chat_id" IS NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname  = 'idx_user_zalo_user_id'
  ) THEN
    CREATE UNIQUE INDEX "idx_user_zalo_user_id"
      ON "users" ("zalo_user_id")
      WHERE "zalo_user_id" IS NOT NULL;
  END IF;
END $$;
