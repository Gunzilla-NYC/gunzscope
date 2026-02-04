-- CreateTable
CREATE TABLE "portfolio_addresses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userProfileId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "label" TEXT,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "portfolio_addresses_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "user_profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "portfolio_snapshots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "address" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nftCount" INTEGER NOT NULL,
    "nftsWithPrice" INTEGER NOT NULL DEFAULT 0,
    "gunBalance" REAL NOT NULL DEFAULT 0,
    "totalGunSpent" REAL NOT NULL DEFAULT 0,
    "nftValueGun" REAL NOT NULL DEFAULT 0,
    "gunPriceUsd" REAL NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_addresses_userProfileId_address_key" ON "portfolio_addresses"("userProfileId", "address");

-- CreateIndex
CREATE INDEX "portfolio_snapshots_address_chain_idx" ON "portfolio_snapshots"("address", "chain");

-- CreateIndex
CREATE INDEX "portfolio_snapshots_timestamp_idx" ON "portfolio_snapshots"("timestamp");
