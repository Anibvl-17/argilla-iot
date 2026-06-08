/*
  Warnings:

  - You are about to drop the column `macAddress` on the `Controller` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Controller_macAddress_key";

-- AlterTable
ALTER TABLE "Controller" DROP COLUMN "macAddress";
