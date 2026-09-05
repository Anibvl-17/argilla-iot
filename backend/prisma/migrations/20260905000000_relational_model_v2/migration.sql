-- This migration intentionally resets the application data. The previous
-- telemetry model cannot be represented as firing-cycle history without
-- inventing business data, and the reset was explicitly selected for v2.
DROP TABLE IF EXISTS "MaintenanceRecord" CASCADE;
DROP TABLE IF EXISTS "SupportTicket" CASCADE;
DROP TABLE IF EXISTS "SupportReason" CASCADE;
DROP TABLE IF EXISTS "Telemetry" CASCADE;
DROP TABLE IF EXISTS "FiringCycle" CASCADE;
DROP TABLE IF EXISTS "Program" CASCADE;
DROP TABLE IF EXISTS "Kiln" CASCADE;
DROP TABLE IF EXISTS "Controller" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

DROP TYPE IF EXISTS "Role" CASCADE;
DROP TYPE IF EXISTS "SwitchTypes" CASCADE;
DROP TYPE IF EXISTS "CtrlOperativeStatus" CASCADE;
DROP TYPE IF EXISTS "CtrlConnectionStatus" CASCADE;
DROP TYPE IF EXISTS "UserRole" CASCADE;
DROP TYPE IF EXISTS "FiringCycleExecutionType" CASCADE;
DROP TYPE IF EXISTS "FiringCycleStatus" CASCADE;
DROP TYPE IF EXISTS "ControllerActivityStatus" CASCADE;
DROP TYPE IF EXISTS "ConnectionStatus" CASCADE;
DROP TYPE IF EXISTS "OperationalStatus" CASCADE;
DROP TYPE IF EXISTS "SupportTicketStatus" CASCADE;
DROP TYPE IF EXISTS "MaintenanceType" CASCADE;
DROP TYPE IF EXISTS "SwitchType" CASCADE;

CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'TECHNICIAN', 'CLIENT');
CREATE TYPE "FiringCycleExecutionType" AS ENUM ('PROGRAM', 'DIRECT');
CREATE TYPE "FiringCycleStatus" AS ENUM ('RUNNING', 'COMPLETED', 'CANCELLED', 'ERROR');
CREATE TYPE "ControllerActivityStatus" AS ENUM ('IDLE', 'FIRING', 'PAUSED', 'ERROR');
CREATE TYPE "ConnectionStatus" AS ENUM ('ONLINE', 'OFFLINE');
CREATE TYPE "OperationalStatus" AS ENUM ('OPERATIONAL', 'MAINTENANCE', 'OUT_OF_SERVICE');
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
CREATE TYPE "MaintenanceType" AS ENUM ('PREVENTIVE', 'CORRECTIVE', 'INSPECTION');
CREATE TYPE "SwitchType" AS ENUM ('CONTACTOR', 'SSR');

CREATE TABLE "User" (
    "userId" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "Program" (
    "programId" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "configuration" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Program_pkey" PRIMARY KEY ("programId")
);

CREATE TABLE "Controller" (
    "controllerId" TEXT NOT NULL,
    "userId" INTEGER,
    "deviceSecretHash" TEXT NOT NULL,
    "pairingPinHash" TEXT,
    "pairingPinExpiresAt" TIMESTAMP(3),
    "temperature" DOUBLE PRECISION,
    "operationalStatus" "OperationalStatus" NOT NULL DEFAULT 'OPERATIONAL',
    "connectionStatus" "ConnectionStatus" NOT NULL DEFAULT 'OFFLINE',
    "activityStatus" "ControllerActivityStatus" NOT NULL DEFAULT 'IDLE',
    "switchCurrentCapacity" INTEGER NOT NULL DEFAULT 20,
    "switchType" "SwitchType" NOT NULL DEFAULT 'CONTACTOR',
    "manufacturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "firmwareVersion" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "firmwareUpdatedAt" TIMESTAMP(3),
    CONSTRAINT "Controller_pkey" PRIMARY KEY ("controllerId")
);

CREATE TABLE "Kiln" (
    "kilnId" SERIAL NOT NULL,
    "userId" INTEGER,
    "controllerId" TEXT,
    "name" TEXT NOT NULL DEFAULT 'Mi Horno Argillá',
    "liters" INTEGER NOT NULL,
    "phaseCount" INTEGER NOT NULL DEFAULT 1,
    "nominalVoltage" INTEGER NOT NULL DEFAULT 220,
    "nominalCurrent" INTEGER NOT NULL,
    "manufacturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "operationalStatus" "OperationalStatus" NOT NULL DEFAULT 'OPERATIONAL',
    "manufacturer" TEXT NOT NULL DEFAULT 'Argillá',
    "heatingCircuitConfiguration" JSONB NOT NULL DEFAULT '{"type":"ROOT","connectionType":"PARALLEL","elements":[]}',
    CONSTRAINT "Kiln_pkey" PRIMARY KEY ("kilnId")
);

CREATE TABLE "FiringCycle" (
    "firingCycleId" SERIAL NOT NULL,
    "kilnId" INTEGER NOT NULL,
    "programId" INTEGER,
    "executionType" "FiringCycleExecutionType" NOT NULL,
    "targetTemperature" DOUBLE PRECISION,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "status" "FiringCycleStatus" NOT NULL DEFAULT 'RUNNING',
    "programConfig" JSONB,
    CONSTRAINT "FiringCycle_pkey" PRIMARY KEY ("firingCycleId"),
    CONSTRAINT "FiringCycle_execution_check" CHECK (
        (
            "executionType" = 'PROGRAM'
            AND "programId" IS NOT NULL
            AND "programConfig" IS NOT NULL
            AND "targetTemperature" IS NULL
        )
        OR
        (
            "executionType" = 'DIRECT'
            AND "programId" IS NULL
            AND "programConfig" IS NULL
            AND "targetTemperature" IS NOT NULL
        )
    )
);

CREATE TABLE "Telemetry" (
    "telemetryId" SERIAL NOT NULL,
    "firingCycleId" INTEGER NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "setpointTemperature" DOUBLE PRECISION NOT NULL,
    "switchState" BOOLEAN NOT NULL,
    "stageIndex" INTEGER,
    "voltage" DOUBLE PRECISION NOT NULL,
    "current" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Telemetry_pkey" PRIMARY KEY ("telemetryId")
);

CREATE TABLE "SupportReason" (
    "supportReasonId" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupportReason_pkey" PRIMARY KEY ("supportReasonId")
);

CREATE TABLE "SupportTicket" (
    "supportTicketId" SERIAL NOT NULL,
    "supportReasonId" INTEGER NOT NULL,
    "createdByUserId" INTEGER NOT NULL,
    "assignedToUserId" INTEGER,
    "kilnId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("supportTicketId")
);

CREATE TABLE "MaintenanceRecord" (
    "maintenanceId" SERIAL NOT NULL,
    "kilnId" INTEGER,
    "controllerId" TEXT,
    "performedByUserId" INTEGER NOT NULL,
    "supportTicketId" INTEGER,
    "type" "MaintenanceType" NOT NULL,
    "title" TEXT NOT NULL,
    "workPerformed" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaintenanceRecord_pkey" PRIMARY KEY ("maintenanceId"),
    CONSTRAINT "MaintenanceRecord_target_check" CHECK (
        "kilnId" IS NOT NULL OR "controllerId" IS NOT NULL
    )
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "Program_userId_idx" ON "Program"("userId");
CREATE INDEX "Controller_userId_idx" ON "Controller"("userId");
CREATE UNIQUE INDEX "Kiln_controllerId_key" ON "Kiln"("controllerId");
CREATE INDEX "Kiln_userId_idx" ON "Kiln"("userId");
CREATE INDEX "FiringCycle_kilnId_startedAt_idx" ON "FiringCycle"("kilnId", "startedAt");
CREATE INDEX "FiringCycle_programId_idx" ON "FiringCycle"("programId");
CREATE INDEX "Telemetry_firingCycleId_timestamp_idx" ON "Telemetry"("firingCycleId", "timestamp");
CREATE UNIQUE INDEX "SupportReason_code_key" ON "SupportReason"("code");
CREATE INDEX "SupportTicket_supportReasonId_idx" ON "SupportTicket"("supportReasonId");
CREATE INDEX "SupportTicket_createdByUserId_idx" ON "SupportTicket"("createdByUserId");
CREATE INDEX "SupportTicket_assignedToUserId_idx" ON "SupportTicket"("assignedToUserId");
CREATE INDEX "SupportTicket_kilnId_idx" ON "SupportTicket"("kilnId");
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");
CREATE INDEX "MaintenanceRecord_kilnId_performedAt_idx" ON "MaintenanceRecord"("kilnId", "performedAt");
CREATE INDEX "MaintenanceRecord_controllerId_performedAt_idx" ON "MaintenanceRecord"("controllerId", "performedAt");
CREATE INDEX "MaintenanceRecord_performedByUserId_idx" ON "MaintenanceRecord"("performedByUserId");
CREATE INDEX "MaintenanceRecord_supportTicketId_idx" ON "MaintenanceRecord"("supportTicketId");

ALTER TABLE "Program" ADD CONSTRAINT "Program_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Controller" ADD CONSTRAINT "Controller_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Kiln" ADD CONSTRAINT "Kiln_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Kiln" ADD CONSTRAINT "Kiln_controllerId_fkey"
    FOREIGN KEY ("controllerId") REFERENCES "Controller"("controllerId") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FiringCycle" ADD CONSTRAINT "FiringCycle_kilnId_fkey"
    FOREIGN KEY ("kilnId") REFERENCES "Kiln"("kilnId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FiringCycle" ADD CONSTRAINT "FiringCycle_programId_fkey"
    FOREIGN KEY ("programId") REFERENCES "Program"("programId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Telemetry" ADD CONSTRAINT "Telemetry_firingCycleId_fkey"
    FOREIGN KEY ("firingCycleId") REFERENCES "FiringCycle"("firingCycleId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_supportReasonId_fkey"
    FOREIGN KEY ("supportReasonId") REFERENCES "SupportReason"("supportReasonId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assignedToUserId_fkey"
    FOREIGN KEY ("assignedToUserId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_kilnId_fkey"
    FOREIGN KEY ("kilnId") REFERENCES "Kiln"("kilnId") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_kilnId_fkey"
    FOREIGN KEY ("kilnId") REFERENCES "Kiln"("kilnId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_controllerId_fkey"
    FOREIGN KEY ("controllerId") REFERENCES "Controller"("controllerId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_performedByUserId_fkey"
    FOREIGN KEY ("performedByUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_supportTicketId_fkey"
    FOREIGN KEY ("supportTicketId") REFERENCES "SupportTicket"("supportTicketId") ON DELETE SET NULL ON UPDATE CASCADE;
