DO $$
DECLARE
    direct_cycle_count BIGINT;
BEGIN
    SELECT COUNT(*)
    INTO direct_cycle_count
    FROM "FiringCycle"
    WHERE "executionType" = 'DIRECT';

    IF direct_cycle_count > 0 THEN
        RAISE EXCEPTION
            'No se puede eliminar DIRECT: existen % ciclos de quema directa. Resuélvalos explícitamente antes de migrar; la migración no eliminará ni convertirá datos.',
            direct_cycle_count;
    END IF;
END $$;

ALTER TABLE "FiringCycle"
    DROP CONSTRAINT "FiringCycle_execution_check";

ALTER TABLE "FiringCycle"
    ALTER COLUMN "programId" SET NOT NULL,
    ALTER COLUMN "programConfig" SET NOT NULL,
    DROP COLUMN "targetTemperature",
    DROP COLUMN "executionType";

DROP TYPE "FiringCycleExecutionType";
