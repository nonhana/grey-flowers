/*
  Warnings:

  - Made the column `path` on table `Comment` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Comment" ALTER COLUMN "path" SET NOT NULL;

-- AlterTable
ALTER TABLE "_ArticleTags" ADD CONSTRAINT "_ArticleTags_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_ArticleTags_AB_unique";
