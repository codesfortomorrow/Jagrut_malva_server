-- CreateEnum
CREATE TYPE "publish_issue_status" AS ENUM ('draft', 'published', 'archived');

-- CreateTable
CREATE TABLE "publish_issue" (
    "id" SERIAL NOT NULL,
    "issue_no" TEXT NOT NULL,
    "publish_date" TIMESTAMP(3) NOT NULL,
    "total_copies" INTEGER NOT NULL,
    "file_path" TEXT,
    "status" "publish_issue_status" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publish_issue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "publish_issue_issue_no_key" ON "publish_issue"("issue_no");

-- CreateIndex
CREATE INDEX "publish_issue_status_idx" ON "publish_issue"("status");

-- CreateIndex
CREATE INDEX "publish_issue_publish_date_idx" ON "publish_issue"("publish_date");
