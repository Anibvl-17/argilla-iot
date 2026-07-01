/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `Controller` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Controller" ADD COLUMN     "operationStatus" TEXT NOT NULL DEFAULT 'OFF',
ADD COLUMN     "userId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Controller_userId_key" ON "Controller"("userId");

-- AddForeignKey
ALTER TABLE "Controller" ADD CONSTRAINT "Controller_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
