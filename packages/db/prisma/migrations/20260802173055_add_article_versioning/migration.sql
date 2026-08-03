-- DropIndex
DROP INDEX "Article_alt_key";

-- DropIndex
DROP INDEX "Article_title_key";

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ArticleSnapshot" (
    "id" SERIAL NOT NULL,
    "articleId" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArticleSnapshot_articleId_idx" ON "ArticleSnapshot"("articleId");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleSnapshot_articleId_revision_key" ON "ArticleSnapshot"("articleId", "revision");

-- AddForeignKey
ALTER TABLE "ArticleSnapshot" ADD CONSTRAINT "ArticleSnapshot_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleSnapshot" ADD CONSTRAINT "ArticleSnapshot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
