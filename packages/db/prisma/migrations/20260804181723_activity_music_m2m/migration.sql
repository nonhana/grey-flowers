/*
  Warnings:

  - You are about to drop the column `activityId` on the `Music` table. All the data in the column will be lost.

*/
-- 动态 ⇄ 音乐 改多对多（ActivityMusic）。先建连接表，回填存量后再删除单外键列。
-- CreateTable
CREATE TABLE "ActivityMusic" (
    "activityId" INTEGER NOT NULL,
    "musicId" INTEGER NOT NULL,

    CONSTRAINT "ActivityMusic_pkey" PRIMARY KEY ("activityId","musicId")
);

-- CreateIndex
CREATE INDEX "ActivityMusic_musicId_idx" ON "ActivityMusic"("musicId");

-- AddForeignKey
ALTER TABLE "ActivityMusic" ADD CONSTRAINT "ActivityMusic_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityMusic" ADD CONSTRAINT "ActivityMusic_musicId_fkey" FOREIGN KEY ("musicId") REFERENCES "Music"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 回填存量：把旧单外键里每条活动⇄音乐关系搬进连接表（顺序在删列之前）。
INSERT INTO "ActivityMusic" ("activityId", "musicId")
SELECT "activityId", "id" FROM "Music"
WHERE "activityId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "Music" DROP CONSTRAINT "Music_activityId_fkey";

-- AlterTable
ALTER TABLE "Music" DROP COLUMN "activityId";
