# BFF Persistence: Postgres Adapter

## Overview

`lib/bff/persistence.ts` now supports a Postgres backend while preserving the existing
`withDatabase(...)` contract used by the BFF service layer.

## Backend Selection

The backend is selected in this order:

1. `OOK_BFF_PERSISTENCE_BACKEND=file|postgres` (explicit override)
2. `OOK_BFF_DB_PATH` present -> `file`
3. `OOK_BFF_DATABASE_URL` or `DATABASE_URL` present -> `postgres`
4. fallback -> `file`

### Production Cutover Guard

Production cutover is enabled when either:

- `OOK_APP_ENV=production`, or
- `VERCEL_ENV=production`

When enabled:

- file persistence is rejected (`OOK_BFF_DB_PATH` and `OOK_BFF_PERSISTENCE_BACKEND=file` are forbidden)
- Postgres connection is mandatory (`OOK_BFF_DATABASE_URL` or `DATABASE_URL`)
- backend resolves to `postgres` only

## Migrations

- SQL migration files are read from `config/*.sql` (default).
- Current schema bootstrap file: `config/0001_bff_postgres_init.sql`.
- Migration runner script: `npm run db:migrate:bff`.

Optional migration directory override:

- `OOK_BFF_MIGRATIONS_DIR=/absolute/path/to/sql`

## Required Environment (Postgres)

- `DATABASE_URL` (or `OOK_BFF_DATABASE_URL`)

Optional:

- `OOK_BFF_DATABASE_SSL=require` to force SSL mode
- `OOK_BFF_DATABASE_POOL_MAX=10` for pool sizing
- `OOK_BFF_POSTGRES_SEED_STRATEGY=demo|catalog|none`
  - `demo`: catalog + demo account data
  - `catalog`: catalog-only seed (default when production cutover guard is on)
  - `none`: no seed data

## Staging Migration + Dry Run

Local/manual:

- `npm run db:migrate:bff`
- `npm run db:dry-run:staging`

Combined:

- `npm run db:cutover:staging`

CI workflow:

- `.github/workflows/staging-db-cutover.yml` (`workflow_dispatch`)
- requires repository secret: `STAGING_DATABASE_URL`

## Notes

- Tests continue to run in file mode by setting `OOK_BFF_DB_PATH` per proof.
- The service/API contracts are unchanged; only persistence backend behavior is swapped.
