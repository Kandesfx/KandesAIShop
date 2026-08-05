-- AlterTable
ALTER TABLE "orders" ADD COLUMN "expires_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "orders_status_expires_at_idx" ON "orders"("status", "expires_at");