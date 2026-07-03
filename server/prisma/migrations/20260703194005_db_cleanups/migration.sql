/*
  Warnings:

  - You are about to alter the column `currency` on the `Account` table. The data in that column could be lost. The data in that column will be cast from `Text` to `Char(3)`.

*/
-- AlterTable
ALTER TABLE "Account" ALTER COLUMN "currency" SET DATA TYPE CHAR(3);

-- AlterTable
ALTER TABLE "TransactionTag" ADD COLUMN     "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
