ALTER TABLE "User"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "anonymizedAt" TIMESTAMP(3);

ALTER TABLE "Controller"
ADD COLUMN "pairingFailedAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "pairingBlockedUntil" TIMESTAMP(3);

ALTER TABLE "Kiln"
ALTER COLUMN "heatingCircuitConfiguration" DROP DEFAULT;

CREATE UNIQUE INDEX "Controller_pairing_suffix_key"
ON "Controller" (RIGHT("controllerId", 6));
