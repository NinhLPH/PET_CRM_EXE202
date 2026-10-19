CREATE TABLE "resource_operations" (
  "id" BIGSERIAL PRIMARY KEY,
  "actor_id" BIGINT NOT NULL REFERENCES "users"("user_id"),
  "key" VARCHAR(100) NOT NULL,
  "operation" VARCHAR(40) NOT NULL,
  "request_hash" VARCHAR(64) NOT NULL,
  "resource_id" VARCHAR(100) NOT NULL,
  "result" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "resource_operations_actor_id_key_key" UNIQUE ("actor_id", "key")
);
