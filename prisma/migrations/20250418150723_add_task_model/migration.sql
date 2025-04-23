-- AlterTable
ALTER TABLE "Company" ADD COLUMN "address" TEXT;
ALTER TABLE "Company" ADD COLUMN "city" TEXT;
ALTER TABLE "Company" ADD COLUMN "email" TEXT;
ALTER TABLE "Company" ADD COLUMN "phone" TEXT;
ALTER TABLE "Company" ADD COLUMN "state" TEXT;
ALTER TABLE "Company" ADD COLUMN "taxId" TEXT;
ALTER TABLE "Company" ADD COLUMN "website" TEXT;
ALTER TABLE "Company" ADD COLUMN "zipCode" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "address" TEXT;
ALTER TABLE "User" ADD COLUMN "birthDate" DATETIME;
ALTER TABLE "User" ADD COLUMN "city" TEXT;
ALTER TABLE "User" ADD COLUMN "mobilePhone" TEXT;
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "state" TEXT;
ALTER TABLE "User" ADD COLUMN "zipCode" TEXT;

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "dueDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "creatorId" TEXT NOT NULL,
    CONSTRAINT "Task_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_AssignedTasks" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_AssignedTasks_A_fkey" FOREIGN KEY ("A") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_AssignedTasks_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_AssignedTasks_AB_unique" ON "_AssignedTasks"("A", "B");

-- CreateIndex
CREATE INDEX "_AssignedTasks_B_index" ON "_AssignedTasks"("B");
