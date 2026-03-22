/*
  Warnings:

  - You are about to drop the column `videoUrl` on the `Lesson` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Lesson" DROP COLUMN "videoUrl";

-- CreateTable
CREATE TABLE "NotebookNote" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotebookNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotebookTodo" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotebookTodo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotebookNote_userId_createdAt_idx" ON "NotebookNote"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "NotebookTodo_userId_completed_createdAt_idx" ON "NotebookTodo"("userId", "completed", "createdAt");

-- AddForeignKey
ALTER TABLE "NotebookNote" ADD CONSTRAINT "NotebookNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotebookTodo" ADD CONSTRAINT "NotebookTodo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
