CREATE TABLE "GuildMessage" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdCycle" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildMessage_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "GuildMessage" ADD CONSTRAINT "GuildMessage_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
