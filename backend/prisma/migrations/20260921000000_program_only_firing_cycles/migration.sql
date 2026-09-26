ALTER TABLE "FiringCycle"
    DROP CONSTRAINT "FiringCycle_execution_check";

ALTER TABLE "FiringCycle"
    ALTER COLUMN "programId" SET NOT NULL,
    ALTER COLUMN "programConfig" SET NOT NULL,
    DROP COLUMN "targetTemperature",
    DROP COLUMN "executionType";

DROP TYPE "FiringCycleExecutionType";
