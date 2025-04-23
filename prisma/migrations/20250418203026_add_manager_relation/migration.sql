/*
  Warnings:

  - You are about to drop the `Task` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_AssignedTasks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `address` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `taxId` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `website` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `zipCode` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `address` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `birthDate` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `mobilePhone` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `zipCode` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "_AssignedTasks_B_index";

-- DropIndex
DROP INDEX "_AssignedTasks_AB_unique";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Task";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_AssignedTasks";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'BASIC',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ownerId" TEXT NOT NULL,
    CONSTRAINT "Company_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Company" ("active", "createdAt", "id", "name", "ownerId", "plan", "updatedAt") SELECT "active", "createdAt", "id", "name", "ownerId", "plan", "updatedAt" FROM "Company";
DROP TABLE "Company";
ALTER TABLE "new_Company" RENAME TO "Company";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'EMPLOYEE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "companyId" TEXT,
    "hourlyRate" REAL,
    "managerId" TEXT,
    CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("companyId", "createdAt", "email", "hourlyRate", "id", "name", "password", "role", "updatedAt") SELECT "companyId", "createdAt", "email", "hourlyRate", "id", "name", "password", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
