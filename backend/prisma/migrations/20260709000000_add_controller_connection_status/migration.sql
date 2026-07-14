CREATE TYPE "CtrlConnectionStatus" AS ENUM ('ONLINE', 'OFFLINE');

ALTER TABLE "Controller"
ADD COLUMN "connectionStatus" "CtrlConnectionStatus" NOT NULL DEFAULT 'OFFLINE';
