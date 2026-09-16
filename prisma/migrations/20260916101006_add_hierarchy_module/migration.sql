-- CreateEnum
CREATE TYPE "hierarchy_level" AS ENUM ('sangh', 'jila', 'khand_nagar', 'mandal_basti', 'gram_mohalla');

-- CreateEnum
CREATE TYPE "hierarchy_status" AS ENUM ('active', 'inactive');

-- CreateTable
CREATE TABLE "hierarchy_node" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "level" "hierarchy_level" NOT NULL,
    "status" "hierarchy_status" NOT NULL DEFAULT 'active',
    "description" TEXT NOT NULL DEFAULT '',
    "parent_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hierarchy_node_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hierarchy_node_level_idx" ON "hierarchy_node"("level");

-- CreateIndex
CREATE INDEX "hierarchy_node_parent_id_idx" ON "hierarchy_node"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "hierarchy_node_parent_id_name_key" ON "hierarchy_node"("parent_id", "name");

-- AddForeignKey
ALTER TABLE "hierarchy_node" ADD CONSTRAINT "hierarchy_node_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "hierarchy_node"("id") ON DELETE SET NULL ON UPDATE CASCADE;
