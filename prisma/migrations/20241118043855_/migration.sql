/*
  Warnings:

  - A unique constraint covering the columns `[to]` on the table `Article` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Article" ALTER COLUMN "to" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "Article_to_key" ON "Article"("to");
