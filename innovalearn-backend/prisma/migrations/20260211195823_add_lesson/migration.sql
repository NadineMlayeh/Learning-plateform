-- CreateTable
CREATE TABLE "Lesson" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "pdfUrl" TEXT NOT NULL,
    "courseId" INTEGER NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
