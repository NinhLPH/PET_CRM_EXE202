-- Upgrade the existing PetCare CRM schema to API v1.
-- DropForeignKey
ALTER TABLE "booking_services" DROP CONSTRAINT "booking_services_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "booking_services" DROP CONSTRAINT "booking_services_service_id_fkey";

-- DropForeignKey
ALTER TABLE "booking_services" DROP CONSTRAINT "booking_services_service_price_id_fkey";

-- DropForeignKey
ALTER TABLE "booking_surcharges" DROP CONSTRAINT "booking_surcharges_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "booking_surcharges" DROP CONSTRAINT "booking_surcharges_booking_service_id_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_pet_id_fkey";

-- DropForeignKey
ALTER TABLE "crm_activities" DROP CONSTRAINT "crm_activities_created_by_fkey";

-- DropForeignKey
ALTER TABLE "crm_activities" DROP CONSTRAINT "crm_activities_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "crm_activities" DROP CONSTRAINT "crm_activities_pet_id_fkey";

-- DropForeignKey
ALTER TABLE "crm_activities" DROP CONSTRAINT "crm_activities_reminder_id_fkey";

-- DropForeignKey
ALTER TABLE "customers" DROP CONSTRAINT "customers_user_id_fkey";

-- DropForeignKey
ALTER TABLE "pet_reminders" DROP CONSTRAINT "pet_reminders_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "pet_reminders" DROP CONSTRAINT "pet_reminders_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "pet_reminders" DROP CONSTRAINT "pet_reminders_pet_id_fkey";

-- DropForeignKey
ALTER TABLE "pet_reminders" DROP CONSTRAINT "pet_reminders_service_id_fkey";

-- DropForeignKey
ALTER TABLE "pets" DROP CONSTRAINT "pets_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "reminder_configs" DROP CONSTRAINT "reminder_configs_service_id_fkey";

-- DropForeignKey
ALTER TABLE "service_prices" DROP CONSTRAINT "service_prices_service_id_fkey";

-- AlterTable
ALTER TABLE "booking_services" DROP CONSTRAINT "booking_services_pkey",
ALTER COLUMN "booking_service_id" SET DATA TYPE BIGINT,
ALTER COLUMN "booking_id" SET DATA TYPE BIGINT,
ALTER COLUMN "service_id" SET DATA TYPE BIGINT,
ALTER COLUMN "service_price_id" SET DATA TYPE BIGINT,
ADD CONSTRAINT "booking_services_pkey" PRIMARY KEY ("booking_service_id");

-- AlterTable
ALTER TABLE "booking_surcharges" DROP CONSTRAINT "booking_surcharges_pkey",
ALTER COLUMN "surcharge_id" SET DATA TYPE BIGINT,
ALTER COLUMN "booking_id" SET DATA TYPE BIGINT,
ALTER COLUMN "booking_service_id" SET DATA TYPE BIGINT,
ADD CONSTRAINT "booking_surcharges_pkey" PRIMARY KEY ("surcharge_id");

-- AlterTable
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_pkey",
ADD COLUMN     "cancellation_reason" VARCHAR(255),
ALTER COLUMN "booking_id" SET DATA TYPE BIGINT,
ALTER COLUMN "customer_id" SET DATA TYPE BIGINT,
ALTER COLUMN "pet_id" SET DATA TYPE BIGINT,
ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("booking_id");

-- AlterTable
ALTER TABLE "crm_activities" DROP CONSTRAINT "crm_activities_pkey",
ALTER COLUMN "activity_id" SET DATA TYPE BIGINT,
ALTER COLUMN "customer_id" SET DATA TYPE BIGINT,
ALTER COLUMN "pet_id" SET DATA TYPE BIGINT,
ALTER COLUMN "reminder_id" SET DATA TYPE BIGINT,
ALTER COLUMN "created_by" SET DATA TYPE BIGINT,
ADD CONSTRAINT "crm_activities_pkey" PRIMARY KEY ("activity_id");

-- AlterTable
ALTER TABLE "customers" DROP CONSTRAINT "customers_pkey",
ALTER COLUMN "customer_id" SET DATA TYPE BIGINT,
ALTER COLUMN "user_id" SET DATA TYPE BIGINT,
ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("customer_id");

-- AlterTable
ALTER TABLE "pet_reminders" DROP CONSTRAINT "pet_reminders_pkey",
ALTER COLUMN "reminder_id" SET DATA TYPE BIGINT,
ALTER COLUMN "pet_id" SET DATA TYPE BIGINT,
ALTER COLUMN "customer_id" SET DATA TYPE BIGINT,
ALTER COLUMN "booking_id" SET DATA TYPE BIGINT,
ALTER COLUMN "service_id" SET DATA TYPE BIGINT,
ADD CONSTRAINT "pet_reminders_pkey" PRIMARY KEY ("reminder_id");

-- AlterTable
ALTER TABLE "pets" DROP CONSTRAINT "pets_pkey",
ALTER COLUMN "pet_id" SET DATA TYPE BIGINT,
ALTER COLUMN "customer_id" SET DATA TYPE BIGINT,
ADD CONSTRAINT "pets_pkey" PRIMARY KEY ("pet_id");

-- AlterTable
ALTER TABLE "reminder_configs" DROP CONSTRAINT "reminder_configs_pkey",
ALTER COLUMN "reminder_config_id" SET DATA TYPE BIGINT,
ALTER COLUMN "service_id" SET DATA TYPE BIGINT,
ADD CONSTRAINT "reminder_configs_pkey" PRIMARY KEY ("reminder_config_id");

-- AlterTable
ALTER TABLE "service_prices" DROP CONSTRAINT "service_prices_pkey",
ALTER COLUMN "service_price_id" SET DATA TYPE BIGINT,
ALTER COLUMN "service_id" SET DATA TYPE BIGINT,
ADD CONSTRAINT "service_prices_pkey" PRIMARY KEY ("service_price_id");

-- AlterTable
ALTER TABLE "services" DROP CONSTRAINT "services_pkey",
ALTER COLUMN "service_id" SET DATA TYPE BIGINT,
ADD CONSTRAINT "services_pkey" PRIMARY KEY ("service_id");

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
ALTER COLUMN "user_id" SET DATA TYPE BIGINT,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("user_id");

-- SERIAL sequence limits must be widened as well as their columns.
ALTER SEQUENCE "users_user_id_seq" AS BIGINT;
ALTER SEQUENCE "customers_customer_id_seq" AS BIGINT;
ALTER SEQUENCE "pets_pet_id_seq" AS BIGINT;
ALTER SEQUENCE "services_service_id_seq" AS BIGINT;
ALTER SEQUENCE "service_prices_service_price_id_seq" AS BIGINT;
ALTER SEQUENCE "bookings_booking_id_seq" AS BIGINT;
ALTER SEQUENCE "booking_services_booking_service_id_seq" AS BIGINT;
ALTER SEQUENCE "booking_surcharges_surcharge_id_seq" AS BIGINT;
ALTER SEQUENCE "reminder_configs_reminder_config_id_seq" AS BIGINT;
ALTER SEQUENCE "pet_reminders_reminder_id_seq" AS BIGINT;
ALTER SEQUENCE "crm_activities_activity_id_seq" AS BIGINT;

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_requests" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "booking_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_token_hash_key" ON "user_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_expires_at_idx" ON "user_sessions"("user_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_requests_user_id_key_key" ON "idempotency_requests"("user_id", "key");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_prices" ADD CONSTRAINT "service_prices_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("service_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("pet_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("booking_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("service_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_service_price_id_fkey" FOREIGN KEY ("service_price_id") REFERENCES "service_prices"("service_price_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_surcharges" ADD CONSTRAINT "booking_surcharges_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("booking_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_surcharges" ADD CONSTRAINT "booking_surcharges_booking_service_id_fkey" FOREIGN KEY ("booking_service_id") REFERENCES "booking_services"("booking_service_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_configs" ADD CONSTRAINT "reminder_configs_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("service_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_reminders" ADD CONSTRAINT "pet_reminders_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("pet_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_reminders" ADD CONSTRAINT "pet_reminders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_reminders" ADD CONSTRAINT "pet_reminders_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("booking_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_reminders" ADD CONSTRAINT "pet_reminders_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("service_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("pet_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_reminder_id_fkey" FOREIGN KEY ("reminder_id") REFERENCES "pet_reminders"("reminder_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_requests" ADD CONSTRAINT "idempotency_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Enforce booking and reminder invariants across concurrent API instances.
CREATE UNIQUE INDEX "bookings_one_active_pet_slot_idx"
  ON "bookings" ("pet_id", "booking_date")
  WHERE "status" IN ('PENDING', 'CONFIRMED');

CREATE UNIQUE INDEX "reminder_configs_one_active_service_idx"
  ON "reminder_configs" ("service_id")
  WHERE "status" = 'ACTIVE';

CREATE UNIQUE INDEX "services_one_active_name_idx"
  ON "services" (lower("service_name"))
  WHERE "status" = 'ACTIVE';

ALTER TABLE "reminder_configs" ADD CONSTRAINT "reminder_days_v1_check"
  CHECK ("reminder_days" BETWEEN 8 AND 364);

ALTER TABLE "pets" ADD CONSTRAINT "pets_weight_v1_check"
  CHECK ("weight" > 0 AND "weight" <= 999.99);

ALTER TABLE "service_prices" ADD CONSTRAINT "service_prices_range_v1_check"
  CHECK ("min_weight" >= 0 AND ("max_weight" IS NULL OR "max_weight" > "min_weight"));

ALTER TABLE "service_prices" ADD CONSTRAINT "service_prices_money_v1_check"
  CHECK ("price" > 0 AND "price" = trunc("price"));

ALTER TABLE "booking_surcharges" ADD CONSTRAINT "surcharges_money_v1_check"
  CHECK ("amount" > 0 AND "amount" = trunc("amount"));

ALTER TABLE "bookings" ADD CONSTRAINT "bookings_discount_v1_check"
  CHECK ("discount_amount" >= 0 AND "discount_amount" = trunc("discount_amount"));

ALTER TABLE "idempotency_requests" ADD CONSTRAINT "idempotency_requests_booking_id_fkey"
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("booking_id") ON DELETE RESTRICT ON UPDATE CASCADE;
