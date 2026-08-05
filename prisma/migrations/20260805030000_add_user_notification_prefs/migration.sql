-- P5-07: Notification opt-in columns + NotificationPreference table
ALTER TABLE "user" ADD COLUMN "telegram_chat_id" TEXT UNIQUE;
ALTER TABLE "user" ADD COLUMN "zalo_user_id" TEXT UNIQUE;
ALTER TABLE "user" ADD COLUMN "notification_prefs" JSONB;

CREATE INDEX "idx_user_telegram_chat_id" ON "user" ("telegram_chat_id");
CREATE INDEX "idx_user_zalo_user_id" ON "user" ("zalo_user_id");
