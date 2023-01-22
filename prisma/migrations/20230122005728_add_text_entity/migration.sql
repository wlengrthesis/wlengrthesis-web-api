-- CreateTable
CREATE TABLE "texts" (
    "id" SERIAL NOT NULL,
    "text" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "texts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "texts" ADD CONSTRAINT "texts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
