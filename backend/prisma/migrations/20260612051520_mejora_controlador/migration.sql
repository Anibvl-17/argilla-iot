-- CreateEnum
CREATE TYPE "SwitchTypes" AS ENUM ('SSR', 'CONTACTOR');

-- AlterTable
ALTER TABLE "Controller" ADD COLUMN     "switchAmps" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "switchType" "SwitchTypes" NOT NULL DEFAULT 'CONTACTOR';
