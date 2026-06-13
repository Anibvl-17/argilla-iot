-- DropForeignKey
ALTER TABLE "Telemetry" DROP CONSTRAINT "Telemetry_kilnId_fkey";

-- AddForeignKey
ALTER TABLE "Telemetry" ADD CONSTRAINT "Telemetry_kilnId_fkey" FOREIGN KEY ("kilnId") REFERENCES "Kiln"("kilnId") ON DELETE CASCADE ON UPDATE CASCADE;
