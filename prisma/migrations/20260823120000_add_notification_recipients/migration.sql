-- P10 B1: Add NotificationRecipient (admin on-call list) + OrderSlaEscalationLog (audit trail).
-- NotificationRecipient thay thế việc hard-code 1 TELEGRAM_ADMIN_CHAT_ID env — giờ nhiều admin
-- có thể nhận đồng thời với channels riêng (email, telegram, zalo, sms, voice).
-- OrderSlaEscalationLog ghi lại MỖI LẦN escalate (idempotent lookup qua notificationId) để
-- hỗ trợ repeat/loud mode và audit/debug.

-- ============================================
-- 1) notification_recipients
-- ============================================
CREATE TABLE IF NOT EXISTS "notification_recipients" (
    "id"                TEXT PRIMARY KEY,
    "user_id"           TEXT REFERENCES "users"("id") ON DELETE SET NULL,
    "label"             TEXT NOT NULL,
    "channels"          JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- channels schema:
    --   {
    --     "email"?: { "to": "admin@example.com" },
    --     "telegram"?: { "chatId": "123456789" },
    --     "zalo"?: { "userId": "zalo-uid" },
    --     "sms"?: { "phone": "+84912345678" },
    --     "voice"?: { "phone": "+84912345678" }
    --   }
    "is_on_call"        BOOLEAN NOT NULL DEFAULT false,
    "is_active"         BOOLEAN NOT NULL DEFAULT true,
    "priority"          INT NOT NULL DEFAULT 100,   -- thấp = quan trọng hơn (escalate trước)
    "notes"             TEXT,
    "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"        TEXT REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_notification_recipients_active_oncall"
    ON "notification_recipients" ("is_active", "is_on_call", "priority");

CREATE INDEX IF NOT EXISTS "idx_notification_recipients_user"
    ON "notification_recipients" ("user_id") WHERE "user_id" IS NOT NULL;

-- ============================================
-- 2) order_sla_escalation_log
-- ============================================
CREATE TABLE IF NOT EXISTS "order_sla_escalation_log" (
    "id"                  TEXT PRIMARY KEY,
    "order_id"            TEXT NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
    "threshold_level"     INT NOT NULL,                  -- 1 | 2 | 3
    "channel"             TEXT NOT NULL,                  -- email|telegram|zalo|sms|voice
    "recipient_id"        TEXT REFERENCES "notification_recipients"("id") ON DELETE SET NULL,
    "recipient_target"    TEXT NOT NULL,                  -- email/chat_id/phone gốc (cho log/debug, không dùng làm FK)
    "notification_id"     TEXT,                           -- FK tới notifications nếu enqueue
    "is_loud"             BOOLEAN NOT NULL DEFAULT false, -- true nếu là escalation lặp lại (mỗi 15p)
    "attempt_number"      INT NOT NULL DEFAULT 1,         -- lần thứ N cho cùng (order, level, channel)
    "status"              TEXT NOT NULL,                  -- enqueued | sent | failed | skipped
    "error_message"       TEXT,
    "triggered_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_order_sla_escalation_log_order_level"
    ON "order_sla_escalation_log" ("order_id", "threshold_level", "triggered_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_order_sla_escalation_log_recent"
    ON "order_sla_escalation_log" ("triggered_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_order_sla_escalation_log_status"
    ON "order_sla_escalation_log" ("status", "triggered_at" DESC);
