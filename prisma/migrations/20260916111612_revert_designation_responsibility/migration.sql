/*
  Warnings:

  - You are about to drop the `designation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `responsibility_assignment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "designation" DROP CONSTRAINT "designation_default_reports_to_id_fkey";

-- DropForeignKey
ALTER TABLE "responsibility_assignment" DROP CONSTRAINT "responsibility_assignment_designation_id_fkey";

-- DropForeignKey
ALTER TABLE "responsibility_assignment" DROP CONSTRAINT "responsibility_assignment_hierarchy_node_id_fkey";

-- DropForeignKey
ALTER TABLE "responsibility_assignment" DROP CONSTRAINT "responsibility_assignment_reporting_manager_id_fkey";

-- DropForeignKey
ALTER TABLE "responsibility_assignment" DROP CONSTRAINT "responsibility_assignment_user_id_fkey";

-- DropTable
DROP TABLE "designation";

-- DropTable
DROP TABLE "responsibility_assignment";
