/*
  Warnings:

  - You are about to drop the column `doRecommend` on the `dataset` table. All the data in the column will be lost.
  - You are about to drop the column `numHeplful` on the `dataset` table. All the data in the column will be lost.
  - You are about to drop the column `rating` on the `dataset` table. All the data in the column will be lost.
  - You are about to drop the column `text` on the `dataset` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `dataset` table. All the data in the column will be lost.
  - Added the required column `label` to the `dataset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sequences` to the `dataset` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "dataset" DROP COLUMN "doRecommend",
DROP COLUMN "numHeplful",
DROP COLUMN "rating",
DROP COLUMN "text",
DROP COLUMN "updatedAt",
ADD COLUMN     "label" TEXT NOT NULL,
ADD COLUMN     "sequences" TEXT NOT NULL;
