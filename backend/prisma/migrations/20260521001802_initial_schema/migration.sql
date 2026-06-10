/*
  Warnings:

  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `User` table. All the data in the column will be lost.
  - Added the required column `name` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
DROP COLUMN "createdAt",
DROP COLUMN "id",
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "userId" SERIAL NOT NULL,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("userId");

-- CreateTable
CREATE TABLE "Controller" (
    "controllerId" SERIAL NOT NULL,
    "macAddress" TEXT NOT NULL,
    "pin" TEXT,
    "status" TEXT NOT NULL DEFAULT 'offline',

    CONSTRAINT "Controller_pkey" PRIMARY KEY ("controllerId")
);

-- CreateTable
CREATE TABLE "Kiln" (
    "kilnId" SERIAL NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Mi Horno Argillá',
    "liters" INTEGER NOT NULL,
    "phases" INTEGER NOT NULL DEFAULT 1,
    "volts" INTEGER NOT NULL DEFAULT 220,
    "amps" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "controllerId" INTEGER,

    CONSTRAINT "Kiln_pkey" PRIMARY KEY ("kilnId")
);

-- CreateTable
CREATE TABLE "Telemetry" (
    "telemetryId" SERIAL NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "switchState" BOOLEAN NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kilnId" INTEGER NOT NULL,

    CONSTRAINT "Telemetry_pkey" PRIMARY KEY ("telemetryId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Controller_macAddress_key" ON "Controller"("macAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Kiln_controllerId_key" ON "Kiln"("controllerId");

-- AddForeignKey
ALTER TABLE "Kiln" ADD CONSTRAINT "Kiln_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kiln" ADD CONSTRAINT "Kiln_controllerId_fkey" FOREIGN KEY ("controllerId") REFERENCES "Controller"("controllerId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Telemetry" ADD CONSTRAINT "Telemetry_kilnId_fkey" FOREIGN KEY ("kilnId") REFERENCES "Kiln"("kilnId") ON DELETE RESTRICT ON UPDATE CASCADE;
