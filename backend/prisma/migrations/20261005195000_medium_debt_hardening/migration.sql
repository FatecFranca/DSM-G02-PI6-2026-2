ALTER TABLE "products"
  ALTER COLUMN "purchasePrice" TYPE DECIMAL(12, 2) USING ROUND("purchasePrice"::numeric, 2),
  ALTER COLUMN "salePrice" TYPE DECIMAL(12, 2) USING ROUND("salePrice"::numeric, 2);

ALTER TABLE "movements"
  ALTER COLUMN "unitCost" TYPE DECIMAL(12, 2) USING ROUND("unitCost"::numeric, 2),
  ALTER COLUMN "totalValue" TYPE DECIMAL(14, 2) USING ROUND("totalValue"::numeric, 2),
  ADD COLUMN "lotId" TEXT;

ALTER TABLE "lots" ADD COLUMN "addressId" TEXT;
UPDATE "lots" AS lot
SET "addressId" = address."id"
FROM "warehouse_addresses" AS address
WHERE address."code" = lot."address";

UPDATE "movements" AS movement
SET "lotId" = lot."id"
FROM "lots" AS lot
WHERE movement."lotNumber" = lot."lotNumber";

UPDATE "movements" AS movement
SET "customerId" = NULL
WHERE movement."customerId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "customers" AS customer WHERE customer."id" = movement."customerId"
  );

CREATE TABLE "inventory_count_items" (
  "id" TEXT NOT NULL,
  "expectedQuantity" INTEGER NOT NULL,
  "countedQuantity" INTEGER,
  "discrepancy" INTEGER NOT NULL DEFAULT 0,
  "countedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "inventoryCountId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "countedById" TEXT,
  CONSTRAINT "inventory_count_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "inventory_count_items_inventoryCountId_productId_key"
  ON "inventory_count_items"("inventoryCountId", "productId");
CREATE INDEX "inventory_count_items_inventoryCountId_countedQuantity_idx"
  ON "inventory_count_items"("inventoryCountId", "countedQuantity");

CREATE INDEX "products_status_currentStock_minStock_idx"
  ON "products"("status", "currentStock", "minStock");
CREATE INDEX "products_createdAt_idx" ON "products"("createdAt");
CREATE INDEX "warehouse_addresses_aisle_street_shelf_idx"
  ON "warehouse_addresses"("aisle", "street", "shelf");
CREATE INDEX "warehouse_addresses_status_code_idx" ON "warehouse_addresses"("status", "code");
CREATE INDEX "movements_createdAt_type_idx" ON "movements"("createdAt", "type");
CREATE INDEX "movements_productId_createdAt_idx" ON "movements"("productId", "createdAt");
CREATE INDEX "movements_supplierId_createdAt_idx" ON "movements"("supplierId", "createdAt");
CREATE INDEX "movements_customerId_idx" ON "movements"("customerId");
CREATE INDEX "movements_lotId_idx" ON "movements"("lotId");
CREATE INDEX "lots_productId_status_idx" ON "lots"("productId", "status");
CREATE INDEX "lots_expirationDate_status_idx" ON "lots"("expirationDate", "status");
CREATE INDEX "lots_addressId_idx" ON "lots"("addressId");
CREATE INDEX "inventory_counts_status_createdAt_idx" ON "inventory_counts"("status", "createdAt");
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");
CREATE INDEX "audit_logs_entity_createdAt_idx" ON "audit_logs"("entity", "createdAt");

ALTER TABLE "movements"
  ADD CONSTRAINT "movements_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "movements_lotId_fkey"
    FOREIGN KEY ("lotId") REFERENCES "lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "lots"
  ADD CONSTRAINT "lots_addressId_fkey"
    FOREIGN KEY ("addressId") REFERENCES "warehouse_addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_count_items"
  ADD CONSTRAINT "inventory_count_items_inventoryCountId_fkey"
    FOREIGN KEY ("inventoryCountId") REFERENCES "inventory_counts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "inventory_count_items_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "inventory_count_items_countedById_fkey"
    FOREIGN KEY ("countedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
