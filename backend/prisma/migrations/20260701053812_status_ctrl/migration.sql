-- CreateEnum
CREATE TYPE "CtrlOperativeStatus" AS ENUM ('ON', 'OFF');

-- AlterTable
ALTER TABLE "Controller" ADD COLUMN     "operativeStatus" "CtrlOperativeStatus" NOT NULL DEFAULT 'OFF';
