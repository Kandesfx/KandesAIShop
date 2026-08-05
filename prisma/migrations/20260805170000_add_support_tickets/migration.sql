-- P7-05: Support ticket system
-- Ticket + Message + Category enum + Priority enum + Status enum

-- Priority enum
CREATE TYPE "ticket_priority" AS ENUM ('low', 'normal', 'high', 'urgent');

-- Status enum
CREATE TYPE "ticket_status" AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- Category enum
CREATE TYPE "ticket_category" AS ENUM (
  'order', 'payment', 'delivery', 'ai_key', 'technical', 'refund', 'account', 'other'
);

-- Author role for messages
CREATE TYPE "message_author_role" AS ENUM ('user', 'admin', 'system');

-- Support ticket
CREATE TABLE "support_tickets" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "subject" VARCHAR(200) NOT NULL,
  "body" TEXT NOT NULL,
  "priority" ticket_priority NOT NULL DEFAULT 'normal',
  "category" ticket_category NOT NULL DEFAULT 'other',
  "status" ticket_status NOT NULL DEFAULT 'open',
  "order_id" UUID REFERENCES "orders"("id") ON DELETE SET NULL,
  "assigned_to_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "first_response_at" TIMESTAMPTZ,
  "resolved_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "support_tickets_user_id_idx" ON "support_tickets"("user_id");
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");
CREATE INDEX "support_tickets_priority_idx" ON "support_tickets"("priority");
CREATE INDEX "support_tickets_assigned_to_id_idx" ON "support_tickets"("assigned_to_id");
CREATE INDEX "support_tickets_created_at_idx" ON "support_tickets"("created_at");

-- Support message
CREATE TABLE "support_messages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "ticket_id" UUID NOT NULL REFERENCES "support_tickets"("id") ON DELETE CASCADE,
  "author_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "author_role" message_author_role NOT NULL DEFAULT 'user',
  "body" TEXT NOT NULL,
  "is_internal" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "support_messages_ticket_id_idx" ON "support_messages"("ticket_id");
CREATE INDEX "support_messages_author_id_idx" ON "support_messages"("author_id");
CREATE INDEX "support_messages_created_at_idx" ON "support_messages"("created_at");