/*
  Warnings:

  - Added the required column `passwordHash` to the `Player` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "passwordHash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Player" ALTER COLUMN "passwordHash" DROP DEFAULT;
