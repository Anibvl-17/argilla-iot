-- Existing null ticket references cannot be repaired safely because every
-- support ticket must retain the kiln selected by its creator.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "SupportTicket" WHERE "kilnId" IS NULL) THEN
    RAISE EXCEPTION 'SupportTicket contains rows without kilnId';
  END IF;
END $$;

ALTER TABLE "SupportTicket"
  DROP CONSTRAINT "SupportTicket_kilnId_fkey";

ALTER TABLE "SupportTicket"
  ALTER COLUMN "kilnId" SET NOT NULL;

ALTER TABLE "SupportTicket"
  ADD CONSTRAINT "SupportTicket_kilnId_fkey"
  FOREIGN KEY ("kilnId") REFERENCES "Kiln"("kilnId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "SupportTicket_createdAt_idx"
  ON "SupportTicket"("createdAt");

CREATE INDEX "SupportTicket_assignedToUserId_status_createdAt_idx"
  ON "SupportTicket"("assignedToUserId", "status", "createdAt");
