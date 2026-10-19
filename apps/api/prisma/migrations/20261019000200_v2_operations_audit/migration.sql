ALTER TABLE "idempotency_requests" ADD COLUMN "result" JSONB;
ALTER TABLE "pet_reminders"
  ADD COLUMN "replacement_reason" VARCHAR(50),
  ADD COLUMN "replaced_by_reminder_id" BIGINT;
ALTER TABLE "pet_reminders" ADD CONSTRAINT "pet_reminders_replaced_by_reminder_id_fkey"
  FOREIGN KEY ("replaced_by_reminder_id") REFERENCES "pet_reminders"("reminder_id");

CREATE TABLE "audit_events" (
  "audit_id" BIGSERIAL PRIMARY KEY,
  "actor_id" BIGINT NOT NULL REFERENCES "users"("user_id"),
  "action" VARCHAR(50) NOT NULL,
  "object_type" VARCHAR(50) NOT NULL,
  "object_id" VARCHAR(100) NOT NULL,
  "reason" VARCHAR(255),
  "change" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "audit_events_created_at_audit_id_idx" ON "audit_events"("created_at", "audit_id");
CREATE INDEX "audit_events_object_type_object_id_created_at_idx" ON "audit_events"("object_type", "object_id", "created_at");
CREATE INDEX "audit_events_actor_id_created_at_idx" ON "audit_events"("actor_id", "created_at");

CREATE TABLE "request_rate_limits" (
  "key" VARCHAR(120) PRIMARY KEY,
  "count" INTEGER NOT NULL,
  "reset_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "request_rate_limits_count_positive" CHECK ("count" > 0)
);
