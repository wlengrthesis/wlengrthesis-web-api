/*
  Warnings:

  - You are about to drop the column `sequences` on the `dataset` table. All the data in the column will be lost.
  - Added the required column `sequence` to the `dataset` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "dataset" DROP COLUMN "sequences",
ADD COLUMN     "sequence" TEXT NOT NULL;
