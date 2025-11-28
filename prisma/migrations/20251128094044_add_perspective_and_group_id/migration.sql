-- AlterTable
ALTER TABLE "generations" ADD COLUMN     "generationGroupId" TEXT,
ADD COLUMN     "perspective" TEXT;

-- CreateIndex
CREATE INDEX "generations_generationGroupId_idx" ON "generations"("generationGroupId");
