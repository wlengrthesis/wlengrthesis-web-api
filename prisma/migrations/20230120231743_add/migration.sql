-- CreateTable
CREATE TABLE "dataset" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "rating" TEXT NOT NULL,
    "doRecommend" TEXT NOT NULL,
    "numHeplful" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dataset_pkey" PRIMARY KEY ("id")
);
