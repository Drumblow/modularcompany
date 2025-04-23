-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amount" REAL NOT NULL,
    "date" DATETIME NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "paymentMethod" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "userId" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "receiptUrl" TEXT,
    "confirmedAt" DATETIME,
    "creatorId" TEXT,
    CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "payments_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentTimeEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "timeEntryId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    CONSTRAINT "PaymentTimeEntry_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaymentTimeEntry_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "TimeEntry" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTimeEntry_paymentId_timeEntryId_key" ON "PaymentTimeEntry"("paymentId", "timeEntryId");
