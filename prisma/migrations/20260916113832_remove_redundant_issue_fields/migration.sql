/*
  Warnings:

  - You are about to drop the column `chief_editor` on the `publish_issue` table. All the data in the column will be lost.
  - You are about to drop the column `month_year` on the `publish_issue` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "publish_issue" DROP COLUMN "chief_editor",
DROP COLUMN "month_year";
