-- CreateTable
CREATE TABLE "designation" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "default_reports_to_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "designation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responsibility_assignment" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "designation_id" INTEGER NOT NULL,
    "hierarchy_node_id" INTEGER NOT NULL,
    "reporting_manager_id" INTEGER,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "responsibility_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "designation_name_key" ON "designation"("name");

-- CreateIndex
CREATE INDEX "designation_default_reports_to_id_idx" ON "designation"("default_reports_to_id");

-- CreateIndex
CREATE INDEX "responsibility_assignment_user_id_idx" ON "responsibility_assignment"("user_id");

-- CreateIndex
CREATE INDEX "responsibility_assignment_hierarchy_node_id_idx" ON "responsibility_assignment"("hierarchy_node_id");

-- CreateIndex
CREATE INDEX "responsibility_assignment_designation_id_idx" ON "responsibility_assignment"("designation_id");

-- CreateIndex
CREATE INDEX "responsibility_assignment_end_date_idx" ON "responsibility_assignment"("end_date");

-- AddForeignKey
ALTER TABLE "designation" ADD CONSTRAINT "designation_default_reports_to_id_fkey" FOREIGN KEY ("default_reports_to_id") REFERENCES "designation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsibility_assignment" ADD CONSTRAINT "responsibility_assignment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsibility_assignment" ADD CONSTRAINT "responsibility_assignment_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "designation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsibility_assignment" ADD CONSTRAINT "responsibility_assignment_hierarchy_node_id_fkey" FOREIGN KEY ("hierarchy_node_id") REFERENCES "hierarchy_node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsibility_assignment" ADD CONSTRAINT "responsibility_assignment_reporting_manager_id_fkey" FOREIGN KEY ("reporting_manager_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
