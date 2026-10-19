-- CreateEnum
CREATE TYPE "InventoryJobStatus" AS ENUM ('pending', 'processing', 'completed', 'partial', 'failed');

-- AlterTable
ALTER TABLE "inventory_counts" ADD COLUMN     "adjustedItems" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "failedItems" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobError" TEXT,
ADD COLUMN     "jobFinishedAt" TIMESTAMP(3),
ADD COLUMN     "jobQueuedAt" TIMESTAMP(3),
ADD COLUMN     "jobStatus" "InventoryJobStatus";

-- AlterTable
ALTER TABLE "inventory_count_items" ADD COLUMN     "adjustedAt" TIMESTAMP(3),
ADD COLUMN     "adjustmentError" TEXT;

-- CreateIndex
CREATE INDEX "inventory_counts_jobStatus_idx" ON "inventory_counts"("jobStatus");

