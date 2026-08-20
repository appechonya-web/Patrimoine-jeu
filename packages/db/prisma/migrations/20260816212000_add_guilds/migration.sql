CREATE TYPE "GuildStatus" AS ENUM ('ACTIVE', 'DISSOLVED');

CREATE TABLE "Guild" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "founderPlayerId" TEXT NOT NULL,
    "priceFloor" DECIMAL(10,2) NOT NULL,
    "status" "GuildStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdCycle" INTEGER NOT NULL,
    "dissolvedCycle" INTEGER,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GuildMembership" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "joinedCycle" INTEGER NOT NULL,

    CONSTRAINT "GuildMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GuildMembership_guildId_companyId_key" ON "GuildMembership"("guildId", "companyId");

ALTER TABLE "Guild" ADD CONSTRAINT "Guild_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GuildMembership" ADD CONSTRAINT "GuildMembership_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GuildMembership" ADD CONSTRAINT "GuildMembership_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
