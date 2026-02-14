-- CreateTable
CREATE TABLE "Enrollment" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "formationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_studentId_formationId_key" ON "Enrollment"("studentId", "formationId");

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
