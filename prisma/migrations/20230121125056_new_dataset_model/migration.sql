/*
  Warnings:

  - You are about to drop the column `label` on the `dataset` table. All the data in the column will be lost.
  - You are about to drop the column `sequence` on the `dataset` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[modelId]` on the table `dataset` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `modelId` to the `dataset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vocabulary` to the `dataset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vocabularyActualSize` to the `dataset` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "dataset" DROP COLUMN "label",
DROP COLUMN "sequence",
ADD COLUMN     "modelId" TEXT NOT NULL,
ADD COLUMN     "vocabulary" TEXT NOT NULL,
ADD COLUMN     "vocabularyActualSize" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "dataset_modelId_key" ON "dataset"("modelId");
