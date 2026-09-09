-- AlterTable
ALTER TABLE "ai_enrichment" ADD COLUMN     "fehler" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'WARTEND',
ADD COLUMN     "verarbeitetAm" TIMESTAMP(3);
