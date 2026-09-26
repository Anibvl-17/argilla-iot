CREATE TABLE "Country" (
    "countryId" SERIAL NOT NULL,
    "isoCode" VARCHAR(2) NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "Country_pkey" PRIMARY KEY ("countryId")
);

CREATE TABLE "Region" (
    "regionId" SERIAL NOT NULL,
    "countryId" INTEGER NOT NULL,
    "code" VARCHAR(2) NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "Region_pkey" PRIMARY KEY ("regionId")
);

CREATE TABLE "Commune" (
    "communeId" SERIAL NOT NULL,
    "regionId" INTEGER NOT NULL,
    "code" VARCHAR(5) NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "Commune_pkey" PRIMARY KEY ("communeId")
);

ALTER TABLE "User"
ADD COLUMN "countryId" INTEGER,
ADD COLUMN "communeId" INTEGER,
DROP COLUMN "countryCode",
DROP COLUMN "regionCode",
DROP COLUMN "communeCode";

CREATE UNIQUE INDEX "Country_isoCode_key" ON "Country"("isoCode");
CREATE UNIQUE INDEX "Region_countryId_code_key" ON "Region"("countryId", "code");
CREATE INDEX "Region_countryId_idx" ON "Region"("countryId");
CREATE UNIQUE INDEX "Commune_code_key" ON "Commune"("code");
CREATE INDEX "Commune_regionId_idx" ON "Commune"("regionId");
CREATE INDEX "User_countryId_idx" ON "User"("countryId");
CREATE INDEX "User_communeId_idx" ON "User"("communeId");

ALTER TABLE "Region"
ADD CONSTRAINT "Region_countryId_fkey"
FOREIGN KEY ("countryId") REFERENCES "Country"("countryId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Commune"
ADD CONSTRAINT "Commune_regionId_fkey"
FOREIGN KEY ("regionId") REFERENCES "Region"("regionId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "User"
ADD CONSTRAINT "User_countryId_fkey"
FOREIGN KEY ("countryId") REFERENCES "Country"("countryId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "User"
ADD CONSTRAINT "User_communeId_fkey"
FOREIGN KEY ("communeId") REFERENCES "Commune"("communeId")
ON DELETE RESTRICT ON UPDATE CASCADE;
