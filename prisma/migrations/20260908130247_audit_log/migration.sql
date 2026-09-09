-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor" TEXT NOT NULL,
    "aktion" TEXT NOT NULL,
    "zielTyp" TEXT,
    "zielId" TEXT,
    "tenantId" TEXT,
    "ip" TEXT,
    "detail" JSONB,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_log_tenantId_createdAt_idx" ON "audit_log"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_log_zielTyp_zielId_idx" ON "audit_log"("zielTyp", "zielId");
