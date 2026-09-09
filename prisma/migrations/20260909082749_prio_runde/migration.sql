-- CreateTable
CREATE TABLE "prio_runde" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "budgetProTeilnehmer" INTEGER NOT NULL DEFAULT 1000,
    "zugangsCode" TEXT NOT NULL,
    "offen" BOOLEAN NOT NULL DEFAULT true,
    "useCaseIds" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geschlossenAm" TIMESTAMP(3),

    CONSTRAINT "prio_runde_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prio_stimme" (
    "id" TEXT NOT NULL,
    "prioRundeId" TEXT NOT NULL,
    "teilnehmerName" TEXT,
    "verteilung" JSONB NOT NULL,
    "abgegebenAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prio_stimme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "prio_runde_zugangsCode_key" ON "prio_runde"("zugangsCode");

-- CreateIndex
CREATE INDEX "prio_runde_tenantId_idx" ON "prio_runde"("tenantId");

-- CreateIndex
CREATE INDEX "prio_stimme_prioRundeId_idx" ON "prio_stimme"("prioRundeId");

-- AddForeignKey
ALTER TABLE "prio_runde" ADD CONSTRAINT "prio_runde_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prio_stimme" ADD CONSTRAINT "prio_stimme_prioRundeId_fkey" FOREIGN KEY ("prioRundeId") REFERENCES "prio_runde"("id") ON DELETE CASCADE ON UPDATE CASCADE;
