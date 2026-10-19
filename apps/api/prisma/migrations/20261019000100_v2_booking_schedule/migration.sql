CREATE TYPE "BookingSource" AS ENUM ('CUSTOMER_WEB', 'COUNTER', 'PHONE', 'ZALO', 'OTHER');
CREATE TYPE "CancellationType" AS ENUM ('CUSTOMER_REQUEST', 'STORE', 'NO_SHOW');
CREATE TYPE "IdentityPurpose" AS ENUM ('LINK', 'RECOVERY');
ALTER TABLE "users" ADD COLUMN "can_verify_identity" BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE "identity_evidence" (
  "evidence_id" BIGSERIAL PRIMARY KEY,
  "purpose" "IdentityPurpose" NOT NULL,
  "subject_phone" VARCHAR(20) NOT NULL,
  "customer_id" BIGINT,
  "token_hash" VARCHAR(64) NOT NULL UNIQUE,
  "evidence_summary" VARCHAR(500) NOT NULL,
  "issued_by" BIGINT NOT NULL REFERENCES "users"("user_id"),
  "expires_at" TIMESTAMP(3) NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "identity_evidence_attempts_limit" CHECK ("attempts" BETWEEN 0 AND 3)
);
CREATE INDEX "identity_evidence_subject_phone_purpose_expires_at_idx"
  ON "identity_evidence"("subject_phone", "purpose", "expires_at");

ALTER TABLE "bookings"
  ADD COLUMN "scheduled_end" TIMESTAMP(3),
  ADD COLUMN "source" "BookingSource" NOT NULL DEFAULT 'CUSTOMER_WEB',
  ADD COLUMN "created_by" BIGINT,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "cancellation_type" "CancellationType",
  ADD COLUMN "cancelled_by" BIGINT;
ALTER TABLE "booking_services"
  ADD COLUMN "duration_minutes" INTEGER,
  ADD COLUMN "service_name_snapshot" VARCHAR(100);
CREATE INDEX "bookings_status_booking_date_scheduled_end_idx"
  ON "bookings"("status", "booking_date", "scheduled_end");
CREATE INDEX "bookings_completed_at_idx" ON "bookings"("completed_at");
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_scheduled_end_after_start"
  CHECK ("scheduled_end" IS NULL OR "scheduled_end" > "booking_date");
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_duration_positive"
  CHECK ("duration_minutes" IS NULL OR "duration_minutes" > 0);
ALTER TABLE "idempotency_requests"
  ADD COLUMN "operation" VARCHAR(30) NOT NULL DEFAULT 'CREATE',
  ADD COLUMN "adjustment_id" BIGINT,
  ADD COLUMN "result_total" DECIMAL(12,2);

CREATE TABLE "booking_adjustments" (
  "adjustment_id" BIGSERIAL PRIMARY KEY,
  "booking_id" BIGINT NOT NULL REFERENCES "bookings"("booking_id"),
  "delta" DECIMAL(12,2) NOT NULL,
  "reason" VARCHAR(255) NOT NULL,
  "created_by" BIGINT NOT NULL,
  "reversal_ref" BIGINT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "booking_adjustments_booking_id_created_at_adjustment_id_idx"
  ON "booking_adjustments"("booking_id", "created_at", "adjustment_id");
CREATE INDEX "booking_adjustments_created_at_idx" ON "booking_adjustments"("created_at");
ALTER TABLE "booking_adjustments" ADD CONSTRAINT "booking_adjustments_delta_integer"
  CHECK ("delta" = trunc("delta") AND "delta" <> 0);

CREATE TABLE "booking_events" (
  "event_id" BIGSERIAL PRIMARY KEY,
  "booking_id" BIGINT NOT NULL REFERENCES "bookings"("booking_id"),
  "action" VARCHAR(30) NOT NULL,
  "actor_id" BIGINT NOT NULL,
  "old_status" "BookingStatus",
  "new_status" "BookingStatus",
  "old_start" TIMESTAMP(3),
  "new_start" TIMESTAMP(3),
  "reason" VARCHAR(255),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "booking_events_booking_id_created_at_event_id_idx"
  ON "booking_events"("booking_id", "created_at", "event_id");

CREATE TABLE "working_schedules" (
  "id" BIGSERIAL PRIMARY KEY,
  "weekday" INTEGER NOT NULL UNIQUE,
  "intervals" JSONB NOT NULL,
  "capacity" INTEGER NOT NULL,
  "slot_step" INTEGER NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TIMESTAMP(3) NOT NULL
);
ALTER TABLE "working_schedules" ADD CONSTRAINT "working_schedules_limits"
  CHECK ("weekday" BETWEEN 0 AND 6 AND "capacity" > 0 AND "slot_step" > 0);
CREATE TABLE "date_exceptions" (
  "id" BIGSERIAL PRIMARY KEY,
  "local_date" DATE NOT NULL UNIQUE,
  "intervals" JSONB NOT NULL,
  "capacity" INTEGER NOT NULL,
  "slot_step" INTEGER NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL
);
ALTER TABLE "date_exceptions" ADD CONSTRAINT "date_exceptions_limits"
  CHECK ("capacity" > 0 AND "slot_step" > 0);
