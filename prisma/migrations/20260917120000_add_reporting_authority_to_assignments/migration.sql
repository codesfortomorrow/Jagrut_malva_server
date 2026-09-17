-- AlterTable
ALTER TABLE "user_hierarchy_designation" ADD COLUMN IF NOT EXISTS "reporting_id" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_hierarchy_designation_reporting_id_idx" ON "user_hierarchy_designation"("reporting_id");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_hierarchy_designation_reporting_id_fkey'
  ) THEN
    ALTER TABLE "user_hierarchy_designation" ADD CONSTRAINT "user_hierarchy_designation_reporting_id_fkey" FOREIGN KEY ("reporting_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
