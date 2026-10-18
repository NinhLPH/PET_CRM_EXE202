-- The development database was created from the Prisma schema without these
-- application-level constraints. Add them after the verified v1 baseline.
-- Keep this migration transactional so a failed preflight leaves no partial set.
BEGIN;

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

COMMIT;
