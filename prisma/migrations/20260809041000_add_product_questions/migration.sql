-- D74-F: idempotent so the duplicate 20260809041000 file can also
-- run safely (whichever executes first creates; this one no-ops).
-- D76-F2: added column-existence guard for `answered_by` FK index.

-- CreateTable
CREATE TABLE IF NOT EXISTS "product_questions" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "answered_by" TEXT,
    "answered_at" TIMESTAMP(3),
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'product_questions_product_id_created_at_idx') THEN
    CREATE INDEX "product_questions_product_id_created_at_idx" ON "product_questions"("product_id", "created_at" DESC);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'product_questions_user_id_idx') THEN
    CREATE INDEX "product_questions_user_id_idx" ON "product_questions"("user_id");
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_questions_product_id_fkey') THEN
    ALTER TABLE "product_questions" ADD CONSTRAINT "product_questions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_questions_user_id_fkey') THEN
    ALTER TABLE "product_questions" ADD CONSTRAINT "product_questions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_questions_answered_by_fkey') THEN
    -- Column-existence guard (D76-F2): if the table was created without
    -- `answered_by` column, skip FK creation to avoid error.
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'product_questions' AND column_name = 'answered_by') THEN
      ALTER TABLE "product_questions" ADD CONSTRAINT "product_questions_answered_by_fkey" FOREIGN KEY ("answered_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;
