/*
  Warnings:

  - You are about to drop the column `direction` on the `Transaction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "direction";

-- DropEnum
DROP TYPE "TxDirection";
