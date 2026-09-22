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
    ADD COLUMN "controllerCycleId" TEXT,
    ADD COLUMN "statusReasonCode" TEXT,
    ADD COLUMN "statusReason" TEXT;

UPDATE "FiringCycle"
SET "controllerCycleId" = 'legacy-' || "firingCycleId"::TEXT
WHERE "controllerCycleId" IS NULL;

ALTER TABLE "FiringCycle" ALTER COLUMN "controllerCycleId" SET NOT NULL;

ALTER TABLE "Telemetry"
    ADD COLUMN "sampleSequence" INTEGER,
    ADD COLUMN "sampleType" "TelemetrySampleType";

WITH numbered AS (
    SELECT
        "telemetryId",
        ROW_NUMBER() OVER (
            PARTITION BY "firingCycleId"
            ORDER BY "timestamp", "telemetryId"
        ) - 1 AS sequence
    FROM "Telemetry"
)
UPDATE "Telemetry" AS telemetry
SET
    "sampleSequence" = numbered.sequence,
    "sampleType" = 'PERIODIC'
FROM numbered
WHERE telemetry."telemetryId" = numbered."telemetryId";

ALTER TABLE "Telemetry"
    ALTER COLUMN "sampleSequence" SET NOT NULL,
    ALTER COLUMN "sampleType" SET NOT NULL;

DO $$
DECLARE
    duplicated_names TEXT;
BEGIN
    SELECT STRING_AGG("name", ', ' ORDER BY "name")
    INTO duplicated_names
    FROM (
        SELECT "name"
        FROM "Program"
        WHERE "userId" IS NULL
        GROUP BY "name"
        HAVING COUNT(*) > 1
    ) AS duplicates;

    IF duplicated_names IS NOT NULL THEN
        RAISE EXCEPTION 'Programas globales duplicados; resolver antes de migrar: %', duplicated_names;
    END IF;
END $$;

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
