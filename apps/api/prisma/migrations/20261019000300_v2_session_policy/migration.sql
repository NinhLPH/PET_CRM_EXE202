ALTER TABLE "user_sessions" ADD COLUMN "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "user_sessions_user_id_revoked_at_created_at_idx"
  ON "user_sessions"("user_id", "revoked_at", "created_at");
