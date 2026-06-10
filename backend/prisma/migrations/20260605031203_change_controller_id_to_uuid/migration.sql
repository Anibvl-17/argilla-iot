/*
  Warnings:

  - The primary key for the `Controller` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "Kiln" DROP CONSTRAINT "Kiln_controllerId_fkey";

-- AlterTable
ALTER TABLE "Controller" DROP CONSTRAINT "Controller_pkey",
ALTER COLUMN "controllerId" DROP DEFAULT,
ALTER COLUMN "controllerId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Controller_pkey" PRIMARY KEY ("controllerId");
DROP SEQUENCE "Controller_controllerId_seq";

-- AlterTable
ALTER TABLE "Kiln" ALTER COLUMN "controllerId" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "Kiln" ADD CONSTRAINT "Kiln_controllerId_fkey" FOREIGN KEY ("controllerId") REFERENCES "Controller"("controllerId") ON DELETE SET NULL ON UPDATE CASCADE;
