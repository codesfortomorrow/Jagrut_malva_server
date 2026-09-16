-- CreateEnum
CREATE TYPE "dispatch_status" AS ENUM ('draft', 'dispatched', 'in_transit', 'received', 'discrepancy', 'forwarded', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "dispatch_entry" (
    "id" SERIAL NOT NULL,
    "issue_id" INTEGER NOT NULL,
    "from_point_id" INTEGER,
    "to_point_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "dispatch_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tracking_link" TEXT,
    "status" "dispatch_status" NOT NULL DEFAULT 'dispatched',
    "received_quantity" INTEGER,
    "received_at" TIMESTAMP(3),
    "received_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispatch_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dispatch_entry_issue_id_idx" ON "dispatch_entry"("issue_id");

-- CreateIndex
CREATE INDEX "dispatch_entry_from_point_id_idx" ON "dispatch_entry"("from_point_id");

-- CreateIndex
CREATE INDEX "dispatch_entry_to_point_id_idx" ON "dispatch_entry"("to_point_id");

-- CreateIndex
CREATE INDEX "dispatch_entry_status_idx" ON "dispatch_entry"("status");

-- CreateIndex
CREATE INDEX "dispatch_entry_dispatch_date_idx" ON "dispatch_entry"("dispatch_date");

-- CreateIndex
CREATE INDEX "dispatch_entry_received_by_id_idx" ON "dispatch_entry"("received_by_id");

-- AddForeignKey
ALTER TABLE "dispatch_entry" ADD CONSTRAINT "dispatch_entry_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "publish_issue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_entry" ADD CONSTRAINT "dispatch_entry_from_point_id_fkey" FOREIGN KEY ("from_point_id") REFERENCES "hierarchy_node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_entry" ADD CONSTRAINT "dispatch_entry_to_point_id_fkey" FOREIGN KEY ("to_point_id") REFERENCES "hierarchy_node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_entry" ADD CONSTRAINT "dispatch_entry_received_by_id_fkey" FOREIGN KEY ("received_by_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
