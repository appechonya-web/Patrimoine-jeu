CREATE TYPE "PressCategory" AS ENUM ('BANKRUPTCY', 'CARTEL_BUST', 'HOSTILE_TAKEOVER', 'AUCTION_WON');

CREATE TABLE "PressArticle" (
    "id" TEXT NOT NULL,
    "category" "PressCategory" NOT NULL,
    "headline" TEXT NOT NULL,
    "cycle" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PressArticle_pkey" PRIMARY KEY ("id")
);
