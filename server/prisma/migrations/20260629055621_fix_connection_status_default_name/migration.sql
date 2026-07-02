-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Connection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requesterId" TEXT NOT NULL,
    "inviteeId" TEXT,
    "inviteeEmail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "shareAllAccounts" BOOLEAN NOT NULL DEFAULT false,
    "shareAllBudgets" BOOLEAN NOT NULL DEFAULT false,
    "shareAllCategories" BOOLEAN NOT NULL DEFAULT false,
    "shareAllGoals" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Connection_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Connection_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Connection" ("createdAt", "id", "inviteeEmail", "inviteeId", "requesterId", "shareAllAccounts", "shareAllBudgets", "shareAllCategories", "shareAllGoals", "status", "updatedAt") SELECT "createdAt", "id", "inviteeEmail", "inviteeId", "requesterId", "shareAllAccounts", "shareAllBudgets", "shareAllCategories", "shareAllGoals", "status", "updatedAt" FROM "Connection";
DROP TABLE "Connection";
ALTER TABLE "new_Connection" RENAME TO "Connection";
CREATE UNIQUE INDEX "Connection_requesterId_inviteeEmail_key" ON "Connection"("requesterId", "inviteeEmail");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
