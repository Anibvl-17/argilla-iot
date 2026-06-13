/*
  Warnings:

  - The `pin` column on the `Controller` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Controller" DROP COLUMN "pin",
ADD COLUMN     "pin" INTEGER;
