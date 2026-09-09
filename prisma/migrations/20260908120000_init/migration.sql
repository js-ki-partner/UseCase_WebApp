-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Frequenz" AS ENUM ('TAEGLICH', 'MEHRMALS_WOECHENTLICH', 'WOECHENTLICH', 'MONATLICH', 'SELTENER');

-- CreateEnum
CREATE TYPE "Reifegrad" AS ENUM ('KURZ', 'PROZESS', 'BEWERTET');

-- CreateEnum
CREATE TYPE "UseCaseStatus" AS ENUM ('ENTWURF', 'EINGEREICHT', 'IN_PRUEFUNG', 'UEBERTRAGEN', 'WARTELISTE', 'ABGELEHNT', 'DUPLIKAT');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('NICHT_SYNCHRONISIERT', 'OK', 'FEHLER');

-- CreateTable
CREATE TABLE "tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "openprojectProjectId" TEXT,
    "accessTokenHash" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "brandingLogoUrl" TEXT,
    "brandingAccentColor" TEXT,
    "stundensatzDefault" INTEGER NOT NULL DEFAULT 80,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "use_case" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "titel" TEXT,
    "problemText" TEXT NOT NULL,
    "wunschergebnis" TEXT,
    "rolle" TEXT NOT NULL,
    "anzahlBetroffene" INTEGER NOT NULL,
    "frequenz" "Frequenz" NOT NULL,
    "dauerMinuten" INTEGER NOT NULL,
    "stundenpotenzialPa" INTEGER NOT NULL,
    "reifegrad" "Reifegrad" NOT NULL DEFAULT 'KURZ',
    "status" "UseCaseStatus" NOT NULL DEFAULT 'EINGEREICHT',
    "einreicherName" TEXT,
    "einreicherEmail" TEXT,
    "istAnonym" BOOLEAN NOT NULL DEFAULT false,
    "kiEinwilligung" BOOLEAN NOT NULL DEFAULT false,
    "kiEinwilligungAm" TIMESTAMP(3),
    "kiHinweisVersion" TEXT,
    "kiEinwilligungWiderrufenAm" TIMESTAMP(3),
    "openprojectWpId" INTEGER,
    "openprojectLockVersion" INTEGER,
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'NICHT_SYNCHRONISIERT',
    "syncFehler" TEXT,
    "syncedAt" TIMESTAMP(3),
    "duplikatVonId" TEXT,
    "notizIntern" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "use_case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "process_step" (
    "id" TEXT NOT NULL,
    "useCaseId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "input" TEXT,
    "output" TEXT,
    "system" TEXT,
    "dauerMinuten" INTEGER,
    "hatWartezeit" BOOLEAN NOT NULL DEFAULT false,
    "brauchtEntscheidung" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "process_step_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment" (
    "id" TEXT NOT NULL,
    "useCaseId" TEXT NOT NULL,
    "wertMin" INTEGER,
    "wertReal" INTEGER,
    "wertMax" INTEGER,
    "konfidenz" TEXT,
    "datenlage" TEXT,
    "fehlerkosten" TEXT,
    "koKriterien" JSONB,
    "ownerBeimKunden" TEXT,
    "notizIntern" TEXT,
    "bewertetVon" TEXT,
    "bewertetAm" TIMESTAMP(3),

    CONSTRAINT "assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_enrichment" (
    "id" TEXT NOT NULL,
    "useCaseId" TEXT NOT NULL,
    "titelVorschlag" TEXT,
    "kategorie" TEXT,
    "extrahierteSysteme" JSONB,
    "aehnlicheUseCases" JSONB,
    "anbieter" TEXT,
    "modell" TEXT,
    "verarbeitungLokal" BOOLEAN NOT NULL DEFAULT true,
    "erzeugtAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geprueft" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ai_enrichment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_transfer_log" (
    "id" TEXT NOT NULL,
    "useCaseId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "anbieter" TEXT NOT NULL,
    "modell" TEXT NOT NULL,
    "uebermittelteFelder" JSONB NOT NULL,
    "hinweisVersion" TEXT NOT NULL,
    "gesendetAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ergebnis" TEXT NOT NULL,

    CONSTRAINT "ai_transfer_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwortHash" TEXT NOT NULL,
    "totpSecret" TEXT,
    "totpAktiv" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "admin_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "magic_link" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "useCaseId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "magic_link_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_slug_key" ON "tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "use_case_uuid_key" ON "use_case"("uuid");

-- CreateIndex
CREATE INDEX "use_case_tenantId_status_idx" ON "use_case"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "process_step_useCaseId_position_key" ON "process_step"("useCaseId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_useCaseId_key" ON "assessment"("useCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_enrichment_useCaseId_key" ON "ai_enrichment"("useCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_user_email_key" ON "admin_user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "magic_link_tokenHash_key" ON "magic_link"("tokenHash");

-- AddForeignKey
ALTER TABLE "use_case" ADD CONSTRAINT "use_case_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "use_case" ADD CONSTRAINT "use_case_duplikatVonId_fkey" FOREIGN KEY ("duplikatVonId") REFERENCES "use_case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_step" ADD CONSTRAINT "process_step_useCaseId_fkey" FOREIGN KEY ("useCaseId") REFERENCES "use_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_useCaseId_fkey" FOREIGN KEY ("useCaseId") REFERENCES "use_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_enrichment" ADD CONSTRAINT "ai_enrichment_useCaseId_fkey" FOREIGN KEY ("useCaseId") REFERENCES "use_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_transfer_log" ADD CONSTRAINT "ai_transfer_log_useCaseId_fkey" FOREIGN KEY ("useCaseId") REFERENCES "use_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_transfer_log" ADD CONSTRAINT "ai_transfer_log_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "magic_link" ADD CONSTRAINT "magic_link_useCaseId_fkey" FOREIGN KEY ("useCaseId") REFERENCES "use_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

