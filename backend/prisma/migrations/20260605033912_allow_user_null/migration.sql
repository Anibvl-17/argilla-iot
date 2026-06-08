-- DropForeignKey
ALTER TABLE "Kiln" DROP CONSTRAINT "Kiln_userId_fkey";

-- AlterTable
ALTER TABLE "Kiln" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Kiln" ADD CONSTRAINT "Kiln_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
