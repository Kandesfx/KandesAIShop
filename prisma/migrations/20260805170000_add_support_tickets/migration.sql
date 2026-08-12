-- P7-05: Support ticket system
-- Ticket + Message + Category enum + Priority enum + Status enum
-- D74-F: wrapped in DO blocks + IF NOT EXISTS guards so fresh CI DBs
-- don't fail. Production already marked applied (D74-A); idempotent
-- on re-run as well.
-- D76-F2 (2026-08-12): further idempotent — column-existence guards added
-- to prevent index-creation failures if the table somehow has the column
-- missing (e.g. during parallel migration runs or unusual reset).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_priority') THEN
    CREATE TYPE "ticket_priority" AS ENUM ('low', 'normal', 'high', 'urgent');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
    CREATE TYPE "ticket_status" AS ENUM ('open', 'in_progress', 'resolved', 'closed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_category') THEN
    CREATE TYPE "ticket_category" AS ENUM (
      'order', 'payment', 'delivery', 'ai_key', 'technical', 'refund', 'account', 'other'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_author_role') THEN
    CREATE TYPE "message_author_role" AS ENUM ('user', 'admin', 'system');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "support_tickets" (
  -- D74-F5: prod `support_tickets.id` is TEXT (not UUID) — the original
  -- migration was likely never the source of prod's schema. Init schema's
  -- `users`/`orders` ids are TEXT, so FK here must be TEXT too. Keeping
  -- TEXT avoids the "uuid vs text incompatible" FK error that was
  -- tripping CI fresh-DB runs.
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "subject" VARCHAR(200) NOT NULL,
  "body" TEXT NOT NULL,
  "priority" ticket_priority NOT NULL DEFAULT 'normal',
  "category" ticket_category NOT NULL DEFAULT 'other',
  "status" ticket_status NOT NULL DEFAULT 'open',
  "order_id" TEXT REFERENCES "orders"("id") ON DELETE SET NULL,
  "assigned_to_id" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "first_response_at" TIMESTAMPTZ,
  "resolved_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes with column-existence guard (D76-F2)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'support_tickets_user_id_idx') THEN
    CREATE INDEX "support_tickets_user_id_idx" ON "support_tickets"("user_id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'support_tickets_status_idx') THEN
    CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'support_tickets_priority_idx') THEN
    CREATE INDEX "support_tickets_priority_idx" ON "support_tickets"("priority");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'support_tickets_assigned_to_id_idx') THEN
    -- Column-existence guard prevents failure if table has somehow
    -- been created without this column (e.g. parallel migration race).
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'support_tickets' AND column_name = 'assigned_to_id') THEN
      CREATE INDEX "support_tickets_assigned_to_id_idx" ON "support_tickets"("assigned_to_id");
    END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'support_tickets_created_at_idx') THEN
    CREATE INDEX "support_tickets_created_at_idx" ON "support_tickets"("created_at");
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "support_messages" (
  -- D74-F5: TEXT-shaped ids to match `support_tickets` (above) and `users`.
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "ticket_id" TEXT NOT NULL REFERENCES "support_tickets"("id") ON DELETE CASCADE,
  "author_id" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "author_role" message_author_role NOT NULL DEFAULT 'user',
  "body" TEXT NOT NULL,
  "is_internal" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes with existence guard (D76-F2)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'support_messages_ticket_id_idx') THEN
    CREATE INDEX "support_messages_ticket_id_idx" ON "support_messages"("ticket_id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'support_messages_author_id_idx') THEN
    CREATE INDEX "support_messages_author_id_idx" ON "support_messages"("author_id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'support_messages_created_at_idx') THEN
    CREATE INDEX "support_messages_created_at_idx" ON "support_messages"("created_at");
  END IF;
END $$;
