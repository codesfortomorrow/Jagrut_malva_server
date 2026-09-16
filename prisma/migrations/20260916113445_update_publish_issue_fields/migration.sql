-- AlterTable
ALTER TABLE "publish_issue" ADD COLUMN     "chief_editor" TEXT,
ADD COLUMN     "month_year" TEXT,
ADD COLUMN     "page_count" INTEGER,
ADD COLUMN     "price_per_copy" DOUBLE PRECISION,
ADD COLUMN     "title" TEXT NOT NULL DEFAULT '';
