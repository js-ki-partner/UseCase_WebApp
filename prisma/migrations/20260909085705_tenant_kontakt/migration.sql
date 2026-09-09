-- AlterTable
ALTER TABLE "use_case" ADD COLUMN     "kundenkontext" TEXT;

-- CreateTable
CREATE TABLE "tenant_kontakt" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "zugangTokenHash" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "letzterLoginAm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_kontakt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_kontakt_tenantId_idx" ON "tenant_kontakt"("tenantId");

-- AddForeignKey
ALTER TABLE "tenant_kontakt" ADD CONSTRAINT "tenant_kontakt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
