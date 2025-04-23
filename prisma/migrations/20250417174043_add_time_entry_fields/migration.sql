-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN "approved" BOOLEAN;
ALTER TABLE "TimeEntry" ADD COLUMN "project" TEXT;
ALTER TABLE "TimeEntry" ADD COLUMN "rejected" BOOLEAN;
ALTER TABLE "TimeEntry" ADD COLUMN "rejectionReason" TEXT;
