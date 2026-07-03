/*
  Warnings:

  - You are about to drop the column `createAt` on the `TransactionTag` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TransactionTag" DROP COLUMN "createAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
