-- CreateEnum
CREATE TYPE "admin_status" AS ENUM ('active');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('active', 'blocked');

-- CreateEnum
CREATE TYPE "otp_transport" AS ENUM ('email', 'mobile');

-- CreateEnum
CREATE TYPE "setting_type" AS ENUM ('binary', 'multi_select', 'single_select');

-- CreateEnum
CREATE TYPE "setting_context" AS ENUM ('user', 'System');

-- CreateEnum
CREATE TYPE "role_type" AS ENUM ('system', 'custom');

-- CreateEnum
CREATE TYPE "role_status" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "hierarchy_level" AS ENUM ('prant', 'jila', 'khand_nagar', 'mandal_basti', 'gram_mohalla');

-- CreateEnum
CREATE TYPE "hierarchy_status" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "publish_issue_status" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "dispatch_status" AS ENUM ('draft', 'dispatched', 'in_transit', 'received', 'discrepancy', 'forwarded', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "consumer_status" AS ENUM ('active', 'inactive');

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
CREATE TABLE "admin" (
    "id" SERIAL NOT NULL,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "profile_image" TEXT,
    "status" "admin_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_meta" (
    "password_salt" TEXT,
    "password_hash" TEXT,
    "admin_id" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "username" TEXT,
    "email" TEXT NOT NULL,
    "dial_code" TEXT,
    "mobile" TEXT,
    "profile_image" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "country" TEXT,
    "status" "user_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_meta" (
    "google_id" TEXT,
    "password_salt" TEXT,
    "password_hash" TEXT,
    "user_id" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "otp" (
    "code" TEXT NOT NULL,
    "attempt" SMALLINT NOT NULL DEFAULT 1,
    "last_sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retries" SMALLINT NOT NULL DEFAULT 0,
    "transport" "otp_transport" NOT NULL,
    "target" TEXT NOT NULL,
    "last_code_verified" BOOLEAN NOT NULL DEFAULT false,
    "blocked" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "setting" (
    "id" SERIAL NOT NULL,
    "mapped_to" TEXT NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "type" "setting_type" NOT NULL,
    "context" "setting_context" NOT NULL,
    "default" JSONB NOT NULL,
    "is_defined_options" BOOLEAN NOT NULL,
    "parent_id" INTEGER,

    CONSTRAINT "setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "setting_option" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "value" TEXT NOT NULL,
    "setting_id" INTEGER NOT NULL,

    CONSTRAINT "setting_option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_setting" (
    "selection" JSONB NOT NULL,
    "user_id" INTEGER NOT NULL,
    "setting_id" INTEGER NOT NULL,

    CONSTRAINT "user_setting_pkey" PRIMARY KEY ("user_id","setting_id")
);

-- CreateTable
CREATE TABLE "system_setting" (
    "selection" JSONB NOT NULL,
    "setting_id" INTEGER NOT NULL,

    CONSTRAINT "system_setting_pkey" PRIMARY KEY ("setting_id")
);

-- CreateTable
CREATE TABLE "role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "type" "role_type" NOT NULL DEFAULT 'custom',
    "status" "role_status" NOT NULL DEFAULT 'active',
    "is_protected" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "privilege" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "privilege_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_privilege" (
    "role_id" INTEGER NOT NULL,
    "privilege_id" INTEGER NOT NULL,

    CONSTRAINT "role_privilege_pkey" PRIMARY KEY ("role_id","privilege_id")
);

-- CreateTable
CREATE TABLE "user_role" (
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_pkey" PRIMARY KEY ("user_id","role_id")
);

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

-- CreateTable
CREATE TABLE "user_hierarchy_designation" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "node_id" INTEGER NOT NULL,
    "designation_id" INTEGER NOT NULL,
    "reporting_id" INTEGER,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassigned_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_hierarchy_designation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publish_issue" (
    "id" SERIAL NOT NULL,
    "issue_no" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "publish_date" TIMESTAMP(3) NOT NULL,
    "total_copies" INTEGER NOT NULL,
    "file_path" TEXT,
    "status" "publish_issue_status" NOT NULL DEFAULT 'draft',
    "published_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publish_issue_pkey" PRIMARY KEY ("id")
);

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
    "dispatched_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispatch_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumer" (
    "id" SERIAL NOT NULL,
    "full_name" TEXT NOT NULL,
    "father_name" TEXT NOT NULL,
    "whatsapp_mobile" TEXT NOT NULL,
    "additional_mobile" TEXT,
    "full_address" TEXT NOT NULL,
    "postal_gram" TEXT,
    "post" TEXT,
    "tehsil" TEXT,
    "pincode" TEXT,
    "jila_id" INTEGER NOT NULL,
    "khand_id" INTEGER NOT NULL,
    "mandal_id" INTEGER NOT NULL,
    "gram_id" INTEGER NOT NULL,
    "registrar_name" TEXT NOT NULL,
    "registrar_mobile" TEXT NOT NULL,
    "registered_by_id" INTEGER,
    "status" "consumer_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consumer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hierarchy_designation_level_idx" ON "hierarchy_designation"("level");

-- CreateIndex
CREATE INDEX "hierarchy_designation_status_idx" ON "hierarchy_designation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "hierarchy_designation_level_name_key" ON "hierarchy_designation"("level", "name");

-- CreateIndex
CREATE UNIQUE INDEX "admin_email_key" ON "admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_meta_admin_id_key" ON "admin_meta"("admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_mobile_key" ON "user"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "user_meta_google_id_key" ON "user_meta"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_meta_user_id_key" ON "user_meta"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "otp_transport_target_key" ON "otp"("transport", "target");

-- CreateIndex
CREATE UNIQUE INDEX "setting_context_mapped_to_key" ON "setting"("context", "mapped_to");

-- CreateIndex
CREATE UNIQUE INDEX "setting_option_setting_id_value_key" ON "setting_option"("setting_id", "value");

-- CreateIndex
CREATE UNIQUE INDEX "role_name_key" ON "role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "privilege_key_key" ON "privilege"("key");

-- CreateIndex
CREATE INDEX "hierarchy_node_level_idx" ON "hierarchy_node"("level");

-- CreateIndex
CREATE INDEX "hierarchy_node_parent_id_idx" ON "hierarchy_node"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "hierarchy_node_parent_id_name_key" ON "hierarchy_node"("parent_id", "name");

-- CreateIndex
CREATE INDEX "user_hierarchy_designation_user_id_idx" ON "user_hierarchy_designation"("user_id");

-- CreateIndex
CREATE INDEX "user_hierarchy_designation_node_id_idx" ON "user_hierarchy_designation"("node_id");

-- CreateIndex
CREATE INDEX "user_hierarchy_designation_designation_id_idx" ON "user_hierarchy_designation"("designation_id");

-- CreateIndex
CREATE INDEX "user_hierarchy_designation_reporting_id_idx" ON "user_hierarchy_designation"("reporting_id");

-- CreateIndex
CREATE INDEX "user_hierarchy_designation_is_active_idx" ON "user_hierarchy_designation"("is_active");

-- CreateIndex
CREATE INDEX "user_hierarchy_designation_node_id_designation_id_is_active_idx" ON "user_hierarchy_designation"("node_id", "designation_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "publish_issue_issue_no_key" ON "publish_issue"("issue_no");

-- CreateIndex
CREATE INDEX "publish_issue_status_idx" ON "publish_issue"("status");

-- CreateIndex
CREATE INDEX "publish_issue_publish_date_idx" ON "publish_issue"("publish_date");

-- CreateIndex
CREATE INDEX "publish_issue_published_by_id_idx" ON "publish_issue"("published_by_id");

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

-- CreateIndex
CREATE INDEX "dispatch_entry_dispatched_by_id_idx" ON "dispatch_entry"("dispatched_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "consumer_whatsapp_mobile_key" ON "consumer"("whatsapp_mobile");

-- CreateIndex
CREATE INDEX "consumer_whatsapp_mobile_idx" ON "consumer"("whatsapp_mobile");

-- CreateIndex
CREATE INDEX "consumer_jila_id_idx" ON "consumer"("jila_id");

-- CreateIndex
CREATE INDEX "consumer_khand_id_idx" ON "consumer"("khand_id");

-- CreateIndex
CREATE INDEX "consumer_mandal_id_idx" ON "consumer"("mandal_id");

-- CreateIndex
CREATE INDEX "consumer_gram_id_idx" ON "consumer"("gram_id");

-- CreateIndex
CREATE INDEX "consumer_registered_by_id_idx" ON "consumer"("registered_by_id");

-- CreateIndex
CREATE INDEX "consumer_status_idx" ON "consumer"("status");

-- AddForeignKey
ALTER TABLE "admin_meta" ADD CONSTRAINT "admin_meta_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_meta" ADD CONSTRAINT "user_meta_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "setting" ADD CONSTRAINT "setting_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "setting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "setting_option" ADD CONSTRAINT "setting_option_setting_id_fkey" FOREIGN KEY ("setting_id") REFERENCES "setting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_setting" ADD CONSTRAINT "user_setting_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_setting" ADD CONSTRAINT "user_setting_setting_id_fkey" FOREIGN KEY ("setting_id") REFERENCES "setting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_setting" ADD CONSTRAINT "system_setting_setting_id_fkey" FOREIGN KEY ("setting_id") REFERENCES "setting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_privilege" ADD CONSTRAINT "role_privilege_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_privilege" ADD CONSTRAINT "role_privilege_privilege_id_fkey" FOREIGN KEY ("privilege_id") REFERENCES "privilege"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hierarchy_node" ADD CONSTRAINT "hierarchy_node_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "hierarchy_node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_hierarchy_designation" ADD CONSTRAINT "user_hierarchy_designation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_hierarchy_designation" ADD CONSTRAINT "user_hierarchy_designation_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "hierarchy_node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_hierarchy_designation" ADD CONSTRAINT "user_hierarchy_designation_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "hierarchy_designation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_hierarchy_designation" ADD CONSTRAINT "user_hierarchy_designation_reporting_id_fkey" FOREIGN KEY ("reporting_id") REFERENCES "admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_issue" ADD CONSTRAINT "publish_issue_published_by_id_fkey" FOREIGN KEY ("published_by_id") REFERENCES "admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_entry" ADD CONSTRAINT "dispatch_entry_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "publish_issue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_entry" ADD CONSTRAINT "dispatch_entry_from_point_id_fkey" FOREIGN KEY ("from_point_id") REFERENCES "hierarchy_node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_entry" ADD CONSTRAINT "dispatch_entry_to_point_id_fkey" FOREIGN KEY ("to_point_id") REFERENCES "hierarchy_node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_entry" ADD CONSTRAINT "dispatch_entry_received_by_id_fkey" FOREIGN KEY ("received_by_id") REFERENCES "admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_entry" ADD CONSTRAINT "dispatch_entry_dispatched_by_id_fkey" FOREIGN KEY ("dispatched_by_id") REFERENCES "admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumer" ADD CONSTRAINT "consumer_jila_id_fkey" FOREIGN KEY ("jila_id") REFERENCES "hierarchy_node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumer" ADD CONSTRAINT "consumer_khand_id_fkey" FOREIGN KEY ("khand_id") REFERENCES "hierarchy_node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumer" ADD CONSTRAINT "consumer_mandal_id_fkey" FOREIGN KEY ("mandal_id") REFERENCES "hierarchy_node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumer" ADD CONSTRAINT "consumer_gram_id_fkey" FOREIGN KEY ("gram_id") REFERENCES "hierarchy_node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumer" ADD CONSTRAINT "consumer_registered_by_id_fkey" FOREIGN KEY ("registered_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
