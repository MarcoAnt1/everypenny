/*
  Warnings:

  - A unique constraint covering the columns `[ownerId,name]` on the table `Account` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,categoryId,period]` on the table `Budget` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,parentId,name]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,name]` on the table `Tag` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Account_ownerId_name_key" ON "Account"("ownerId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_userId_categoryId_period_key" ON "Budget"("userId", "categoryId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "Category_userId_parentId_name_key" ON "Category"("userId", "parentId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_userId_name_key" ON "Tag"("userId", "name");
