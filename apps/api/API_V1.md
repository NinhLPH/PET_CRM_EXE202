# TailUp CRM API v1

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

The active v1 migration history is now in `prisma/migrations`:

- `20261018000000_v1_current_baseline` creates the complete v1 schema for a fresh database.
- `20261018000100_v1_invariants` adds six CHECK constraints and three partial unique indexes that Prisma's schema cannot represent directly.

On 2026-10-18 the configured development database already had the v1 tables and data, but its `_prisma_migrations` table was empty and the nine invariants were missing. The baseline SQL was compared with that database's tables, columns, keys, and indexes in a rolled-back isolated schema; the Prisma schema comparison also reported no difference. The baseline was marked applied on **that database only**, and the invariants migration was deployed. No application data was reset. `prisma migrate status` now reports the database up to date.

For a **fresh empty database**, run `npx prisma migrate deploy`; Prisma will execute both migrations. For an **existing database other than the one already reconciled**, inspect its `_prisma_migrations` history and actual schema first. An older environment may still have `20261001102343_init` recorded; its original SQL was not available in this repository, so do not mark the new baseline applied or run `migrate deploy` there without a separate comparison and recovery decision. The older generated migrations remain recoverable from Git commit `9d03fc7` but are not the active history.

Before deploying new migrations, run `npm run migration:preflight` and `npm run migration:verify` against a development or staging database. The verify script creates the v1 structure in an isolated schema and rolls it back; it does not alter application tables. Review SQL and take a database backup before applying a migration that changes existing data.

```sh
npx prisma migrate status
npx prisma migrate deploy
```

Re-run `npx prisma migrate status` and `npx prisma generate` after deployment. New v2 migrations must be appended to this active history; do not restore the older generated baseline/upgrade directories into it.

## Contract conventions

- IDs are decimal strings in JSON; money is integer VND; weights are decimal strings with at most two fractional digits; timestamps are ISO UTC.
- POST `/bookings` requires `Idempotency-Key` and `expectedBasePrice`. A changed quote returns HTTP 409 with `currentQuote`.
- Customer endpoints are scoped to the logged-in owner. Every `/admin` endpoint requires ADMIN. Only `POST /auth/register`, `POST /auth/login`, and the public service list/quote are anonymous.
- The workflow is one pet and one service per booking in v1. The data relationship supports multiple `booking_services` for v2. Reminder days are 8–364 and calendar dates use `Asia/Ho_Chi_Minh`.
