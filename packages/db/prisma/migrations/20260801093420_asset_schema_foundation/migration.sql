-- CreateEnum
CREATE TYPE "AssetMediaType" AS ENUM ('IMAGE', 'AUDIO');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('AVAILABLE', 'PENDING_CLEANUP', 'DELETED');

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "coverAssetId" INTEGER;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "coverAssetId" INTEGER;

-- AlterTable
ALTER TABLE "Music" ADD COLUMN     "coverAssetId" INTEGER,
ADD COLUMN     "sourceAssetId" INTEGER;

-- CreateTable
CREATE TABLE "Asset" (
    "id" SERIAL NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mediaType" "AssetMediaType" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" BIGINT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "durationMs" INTEGER,
    "status" "AssetStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleInlineAsset" (
    "articleId" INTEGER NOT NULL,
    "assetId" INTEGER NOT NULL,

    CONSTRAINT "ArticleInlineAsset_pkey" PRIMARY KEY ("articleId","assetId")
);

-- CreateTable
CREATE TABLE "ActivityImageAsset" (
    "activityId" INTEGER NOT NULL,
    "assetId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "ActivityImageAsset_pkey" PRIMARY KEY ("activityId","assetId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Asset_storageKey_key" ON "Asset"("storageKey");

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

-- CreateIndex
CREATE INDEX "Asset_createdById_idx" ON "Asset"("createdById");

-- CreateIndex
CREATE INDEX "ArticleInlineAsset_assetId_idx" ON "ArticleInlineAsset"("assetId");

-- CreateIndex
CREATE INDEX "ActivityImageAsset_assetId_idx" ON "ActivityImageAsset"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityImageAsset_activityId_position_key" ON "ActivityImageAsset"("activityId", "position");

-- CreateIndex
CREATE INDEX "Article_coverAssetId_idx" ON "Article"("coverAssetId");

-- CreateIndex
CREATE INDEX "Category_coverAssetId_idx" ON "Category"("coverAssetId");

-- CreateIndex
CREATE INDEX "Music_sourceAssetId_idx" ON "Music"("sourceAssetId");

-- CreateIndex
CREATE INDEX "Music_coverAssetId_idx" ON "Music"("coverAssetId");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_coverAssetId_fkey" FOREIGN KEY ("coverAssetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_coverAssetId_fkey" FOREIGN KEY ("coverAssetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Music" ADD CONSTRAINT "Music_sourceAssetId_fkey" FOREIGN KEY ("sourceAssetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Music" ADD CONSTRAINT "Music_coverAssetId_fkey" FOREIGN KEY ("coverAssetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleInlineAsset" ADD CONSTRAINT "ArticleInlineAsset_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleInlineAsset" ADD CONSTRAINT "ArticleInlineAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityImageAsset" ADD CONSTRAINT "ActivityImageAsset_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityImageAsset" ADD CONSTRAINT "ActivityImageAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
