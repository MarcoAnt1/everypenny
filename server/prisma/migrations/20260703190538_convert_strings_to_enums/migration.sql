/*
  Warnings:

  - The `role` column on the `AccountShare` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Connection` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Goal` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `direction` column on the `Transaction` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Transaction` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `type` on the `Account` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `period` on the `Budget` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `type` on the `Transaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('checking', 'savings', 'credit_card', 'cash', 'investment');

-- CreateEnum
CREATE TYPE "TxType" AS ENUM ('income', 'expense', 'transfer');

-- CreateEnum
CREATE TYPE "TxStatus" AS ENUM ('cleared', 'pending', 'reconciled');

-- CreateEnum
CREATE TYPE "TxDirection" AS ENUM ('in', 'out');

-- CreateEnum
CREATE TYPE "BudgetPeriod" AS ENUM ('monthly', 'quarterly', 'yearly');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('active', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "ShareRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED');

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "type",
ADD COLUMN     "type" "AccountType" NOT NULL;

-- AlterTable
ALTER TABLE "AccountShare" DROP COLUMN "role",
ADD COLUMN     "role" "ShareRole" NOT NULL DEFAULT 'EDITOR';

-- AlterTable
ALTER TABLE "Budget" DROP COLUMN "period",
ADD COLUMN     "period" "BudgetPeriod" NOT NULL;

-- AlterTable
ALTER TABLE "Connection" DROP COLUMN "status",
ADD COLUMN     "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Goal" DROP COLUMN "status",
ADD COLUMN     "status" "GoalStatus" NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "direction",
ADD COLUMN     "direction" "TxDirection",
DROP COLUMN "type",
ADD COLUMN     "type" "TxType" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "TxStatus" NOT NULL DEFAULT 'cleared';

-- CreateIndex
CREATE UNIQUE INDEX "Budget_userId_categoryId_period_key" ON "Budget"("userId", "categoryId", "period");

-- CreateIndex
CREATE INDEX "Connection_status_idx" ON "Connection"("status");
