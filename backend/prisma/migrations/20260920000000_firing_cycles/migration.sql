CREATE TYPE "FiringCycleStatus_new" AS ENUM (
    'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED', 'ERROR', 'UNKNOWN'
);
ALTER TABLE "FiringCycle" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "FiringCycle"
    ALTER COLUMN "status" TYPE "FiringCycleStatus_new"
    USING ("status"::TEXT::"FiringCycleStatus_new");
DROP TYPE "FiringCycleStatus";
ALTER TYPE "FiringCycleStatus_new" RENAME TO "FiringCycleStatus";
ALTER TABLE "FiringCycle" ALTER COLUMN "status" SET DEFAULT 'RUNNING';

CREATE TYPE "TelemetrySampleType" AS ENUM ('INITIAL', 'PERIODIC', 'FINAL');

ALTER TABLE "Program" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "Kiln" ADD COLUMN "selectedProgramId" INTEGER;

ALTER TABLE "FiringCycle"
    ADD COLUMN "controllerCycleId" TEXT NOT NULL,
    ADD COLUMN "statusReasonCode" TEXT,
    ADD COLUMN "statusReason" TEXT;

ALTER TABLE "Telemetry"
    ADD COLUMN "sampleSequence" INTEGER NOT NULL,
    ADD COLUMN "sampleType" "TelemetrySampleType" NOT NULL;

CREATE UNIQUE INDEX "Program_global_name_key"
    ON "Program"("name")
    WHERE "userId" IS NULL;
CREATE UNIQUE INDEX "FiringCycle_controllerCycleId_key"
    ON "FiringCycle"("controllerCycleId");
CREATE UNIQUE INDEX "FiringCycle_one_active_per_kiln_key"
    ON "FiringCycle"("kilnId")
    WHERE "status" IN ('RUNNING', 'PAUSED');
CREATE INDEX "Kiln_selectedProgramId_idx" ON "Kiln"("selectedProgramId");
CREATE UNIQUE INDEX "Telemetry_firingCycleId_sampleSequence_key"
    ON "Telemetry"("firingCycleId", "sampleSequence");

ALTER TABLE "Kiln" ADD CONSTRAINT "Kiln_selectedProgramId_fkey"
    FOREIGN KEY ("selectedProgramId") REFERENCES "Program"("programId")
    ON DELETE RESTRICT ON UPDATE CASCADE;
