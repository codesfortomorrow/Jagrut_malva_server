-- CreateTable
CREATE TABLE "hierarchy_designation" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "level" "hierarchy_level" NOT NULL,
    "status" "hierarchy_status" NOT NULL DEFAULT 'active',
    "description" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hierarchy_designation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_hierarchy_designation" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "node_id" INTEGER NOT NULL,
    "designation_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassigned_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_hierarchy_designation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hierarchy_designation_level_idx" ON "hierarchy_designation"("level");

-- CreateIndex
CREATE INDEX "hierarchy_designation_status_idx" ON "hierarchy_designation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "hierarchy_designation_level_name_key" ON "hierarchy_designation"("level", "name");

-- CreateIndex
CREATE INDEX "user_hierarchy_designation_user_id_idx" ON "user_hierarchy_designation"("user_id");

-- CreateIndex
CREATE INDEX "user_hierarchy_designation_node_id_idx" ON "user_hierarchy_designation"("node_id");

-- CreateIndex
CREATE INDEX "user_hierarchy_designation_designation_id_idx" ON "user_hierarchy_designation"("designation_id");

-- CreateIndex
CREATE INDEX "user_hierarchy_designation_is_active_idx" ON "user_hierarchy_designation"("is_active");

-- CreateIndex
CREATE INDEX "user_hierarchy_designation_node_id_designation_id_is_active_idx" ON "user_hierarchy_designation"("node_id", "designation_id", "is_active");

-- AddForeignKey
ALTER TABLE "user_hierarchy_designation" ADD CONSTRAINT "user_hierarchy_designation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_hierarchy_designation" ADD CONSTRAINT "user_hierarchy_designation_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "hierarchy_node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_hierarchy_designation" ADD CONSTRAINT "user_hierarchy_designation_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "hierarchy_designation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Partial Unique Index: prevent duplicate active assignments for the same user, node, and designation, while preserving historical assignments
CREATE UNIQUE INDEX "user_hierarchy_designation_active_user_node_designation_key" ON "user_hierarchy_designation"("user_id", "node_id", "designation_id") WHERE "is_active" = true;
