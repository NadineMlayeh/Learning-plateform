-- CreateEnum
CREATE TYPE "FormationType" AS ENUM ('ONLINE', 'PRESENTIEL');

-- CreateTable
CREATE TABLE "Formation" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "type" "FormationType" NOT NULL,
    "location" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "formateurId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Formation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Formation" ADD CONSTRAINT "Formation_formateurId_fkey" FOREIGN KEY ("formateurId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
