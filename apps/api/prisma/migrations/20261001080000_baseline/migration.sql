-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."ActivityType" AS ENUM ('CALL', 'ZALO', 'NOTE');

-- CreateEnum
CREATE TYPE "public"."BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ContactMethod" AS ENUM ('PHONE', 'ZALO', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ReminderStatus" AS ENUM ('PENDING', 'DUE', 'CONTACTED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('CUSTOMER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."ServiceStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."Species" AS ENUM ('DOG', 'CAT');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateTable
CREATE TABLE "public"."booking_services" (
    "booking_service_id" SERIAL NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "service_id" INTEGER NOT NULL,
    "service_price_id" INTEGER NOT NULL,
    "pet_weight_snapshot" DECIMAL(5,2) NOT NULL,
    "base_price" DECIMAL(12,2) NOT NULL,
    "final_price" DECIMAL(12,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_services_pkey" PRIMARY KEY ("booking_service_id")
);

-- CreateTable
CREATE TABLE "public"."booking_surcharges" (
    "surcharge_id" SERIAL NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "booking_service_id" INTEGER,
    "surcharge_name" VARCHAR(100) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "note" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_surcharges_pkey" PRIMARY KEY ("surcharge_id")
);

-- CreateTable
CREATE TABLE "public"."bookings" (
    "booking_id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "pet_id" INTEGER NOT NULL,
    "booking_date" TIMESTAMP(3) NOT NULL,
    "status" "public"."BookingStatus" NOT NULL,
    "note" TEXT,
    "estimated_total" DECIMAL(12,2),
    "final_total" DECIMAL(12,2),
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("booking_id")
);

-- CreateTable
CREATE TABLE "public"."crm_activities" (
    "activity_id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "pet_id" INTEGER,
    "reminder_id" INTEGER,
    "type" "public"."ActivityType" NOT NULL,
    "content" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_activities_pkey" PRIMARY KEY ("activity_id")
);

-- CreateTable
CREATE TABLE "public"."customers" (
    "customer_id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "full_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "address" VARCHAR(255),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("customer_id")
);

-- CreateTable
CREATE TABLE "public"."pet_reminders" (
    "reminder_id" SERIAL NOT NULL,
    "pet_id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "service_id" INTEGER NOT NULL,
    "completed_date" TIMESTAMP(3) NOT NULL,
    "reminder_date" TIMESTAMP(3) NOT NULL,
    "status" "public"."ReminderStatus" NOT NULL,
    "contacted_at" TIMESTAMP(3),
    "contact_method" "public"."ContactMethod",
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_reminders_pkey" PRIMARY KEY ("reminder_id")
);

-- CreateTable
CREATE TABLE "public"."pets" (
    "pet_id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "species" "public"."Species" NOT NULL,
    "breed" VARCHAR(100),
    "weight" DECIMAL(5,2) NOT NULL,
    "allergy_note" TEXT,
    "special_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pets_pkey" PRIMARY KEY ("pet_id")
);

-- CreateTable
CREATE TABLE "public"."reminder_configs" (
    "reminder_config_id" SERIAL NOT NULL,
    "service_id" INTEGER NOT NULL,
    "reminder_days" INTEGER NOT NULL,
    "status" "public"."ServiceStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reminder_configs_pkey" PRIMARY KEY ("reminder_config_id")
);

-- CreateTable
CREATE TABLE "public"."service_prices" (
    "service_price_id" SERIAL NOT NULL,
    "service_id" INTEGER NOT NULL,
    "species" "public"."Species",
    "min_weight" DECIMAL(5,2) NOT NULL,
    "max_weight" DECIMAL(5,2),
    "price" DECIMAL(12,2) NOT NULL,
    "effective_from" TIMESTAMP(3),
    "effective_to" TIMESTAMP(3),
    "status" "public"."ServiceStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_prices_pkey" PRIMARY KEY ("service_price_id")
);

-- CreateTable
CREATE TABLE "public"."services" (
    "service_id" SERIAL NOT NULL,
    "service_name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "estimated_duration" INTEGER,
    "status" "public"."ServiceStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("service_id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "user_id" SERIAL NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "public"."Role" NOT NULL,
    "status" "public"."UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_user_id_key" ON "public"."customers"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "public"."users"("phone" ASC);

-- AddForeignKey
ALTER TABLE "public"."booking_services" ADD CONSTRAINT "booking_services_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("booking_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."booking_services" ADD CONSTRAINT "booking_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("service_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."booking_services" ADD CONSTRAINT "booking_services_service_price_id_fkey" FOREIGN KEY ("service_price_id") REFERENCES "public"."service_prices"("service_price_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."booking_surcharges" ADD CONSTRAINT "booking_surcharges_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("booking_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."booking_surcharges" ADD CONSTRAINT "booking_surcharges_booking_service_id_fkey" FOREIGN KEY ("booking_service_id") REFERENCES "public"."booking_services"("booking_service_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("pet_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."crm_activities" ADD CONSTRAINT "crm_activities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."crm_activities" ADD CONSTRAINT "crm_activities_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."crm_activities" ADD CONSTRAINT "crm_activities_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("pet_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."crm_activities" ADD CONSTRAINT "crm_activities_reminder_id_fkey" FOREIGN KEY ("reminder_id") REFERENCES "public"."pet_reminders"("reminder_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customers" ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pet_reminders" ADD CONSTRAINT "pet_reminders_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("booking_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pet_reminders" ADD CONSTRAINT "pet_reminders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pet_reminders" ADD CONSTRAINT "pet_reminders_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("pet_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pet_reminders" ADD CONSTRAINT "pet_reminders_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("service_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pets" ADD CONSTRAINT "pets_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reminder_configs" ADD CONSTRAINT "reminder_configs_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("service_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_prices" ADD CONSTRAINT "service_prices_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("service_id") ON DELETE RESTRICT ON UPDATE CASCADE;
