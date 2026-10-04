# PetCare CRM API v1

This backend implements the 45 MVP operations under the exact paths in `PetCare_CRM_Workflow_MVP_v1.docx`. Swagger UI is available at `/openapi` after startup. Route handlers and business services are organized by domain under `src`.

## Runtime

- Node.js 24, PostgreSQL, Prisma 7.
- Copy `.env.example` to `.env` and set `DATABASE_URL` and `CORS_ORIGINS` for the actual web origin. Session cookie is `HttpOnly`, `SameSite=Lax`, and `Secure` in production. Cross-origin browser calls must send credentials.
- `npm install`, `npx prisma generate`, `npm run build`, then `npm run start:prod`.
- Create the first ADMIN with `ADMIN_PHONE` and `ADMIN_PASSWORD` (12+ characters) using `npm run seed:admin`, or include it when running `npm run seed:demo`. The admin-only script refuses to promote an existing customer account.

## Demo data

Using a supported Node.js version (22.22.3+ or 24.15.0+), set `DATABASE_URL`, `ADMIN_PHONE`, `ADMIN_PASSWORD` (12+ characters), and `SEED_CUSTOMER_PASSWORD` (8+ characters) in `apps/api/.env`. From `apps/api`, check that `DATABASE_URL` points to your development database and that all tables already match `prisma/schema.prisma`, then run `npm run seed:demo`. This does not create tables or run migrations.

The command creates an ADMIN if needed, 30 sample customers (10 with login accounts), 50 pets, 6 services with DOG/CAT price bands and reminder settings, 24 bookings across all statuses, and related reminders and CRM activities. The first 10 customer phone numbers are `0991000001` through `0991000010`; they use `SEED_CUSTOMER_PASSWORD` for login. The remaining customer numbers continue through `0991000030` and have no account. Re-running the command only creates missing demo records; it never resets passwords or overwrites existing records. If an existing phone or demo identifier belongs to other data, the command stops with an error.

`seed:admin` remains available when you only need an ADMIN account. Do not run `seed:demo` against a production database.

## Database migration

The repository contains a generated baseline matching the database structure inspected on 2026-10-01 and a second migration that adds BIGINT IDs, sessions, idempotency, cancellation reason and concurrency indexes. Neither migration was applied to the configured remote database while developing this change.

For a **fresh empty database**, run `npx prisma migrate deploy`. For the **configured existing database**, Prisma reports an already applied migration named `20261001102343_init`, but its original `migration.sql` is missing from this checkout and Git remote. Its recorded SHA-256 checksum is `4d3ef0bb09aa16ea4b1558edfcd870b63f26b86a1d92de7092dea31e99289008`. Retrieve that original migration directory before deploying to this database. The generated baseline is for fresh installs and is not a substitute for the missing original migration file. After recovery, replace the generated `20261001080000_baseline` directory with the original `20261001102343_init` directory, confirm its checksum matches the database, back up the database, run `npm run migration:preflight`, and deploy the upgrade migration.

```sh
npx prisma migrate status
npx prisma migrate deploy
```

Do not run `migrate deploy` on the configured database until the history mismatch is resolved. Review the SQL and allow a maintenance window on an existing database because changing primary and foreign keys requires table locks. Re-run `npx prisma migrate status` and `npx prisma generate` after deployment.

## Contract conventions

- IDs are decimal strings in JSON; money is integer VND; weights are decimal strings with at most two fractional digits; timestamps are ISO UTC.
- POST `/bookings` requires `Idempotency-Key` and `expectedBasePrice`. A changed quote returns HTTP 409 with `currentQuote`.
- Customer endpoints are scoped to the logged-in owner. Every `/admin` endpoint requires ADMIN. Only `POST /auth/register`, `POST /auth/login`, and the public service list/quote are anonymous.
- The workflow is one pet and one service per booking in v1. The data relationship supports multiple `booking_services` for v2. Reminder days are 8–364 and calendar dates use `Asia/Ho_Chi_Minh`.
