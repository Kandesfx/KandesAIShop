-- CreateEnum
CREATE TYPE "FaqStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "FaqCategory" AS ENUM ('general', 'payment', 'delivery', 'account', 'refund', 'technical');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('new', 'in_progress', 'resolved', 'closed');

-- CreateTable
CREATE TABLE "faqs" (
    "id" TEXT NOT NULL,
    "category" "FaqCategory" NOT NULL DEFAULT 'general',
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "status" "FaqStatus" NOT NULL DEFAULT 'draft',
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_submissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" TEXT,
    "status" "ContactStatus" NOT NULL DEFAULT 'new',
    "ip_address" TEXT,
    "user_agent" TEXT,
    "assigned_to" TEXT,
    "internal_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "faqs_category_status_idx" ON "faqs"("category", "status");

-- CreateIndex
CREATE INDEX "faqs_status_position_idx" ON "faqs"("status", "position");

-- CreateIndex
CREATE INDEX "contact_submissions_status_created_at_idx" ON "contact_submissions"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "contact_submissions_email_idx" ON "contact_submissions"("email");
