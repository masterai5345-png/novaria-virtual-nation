# NOVARIA Database Foundation

## Files
- `schema.sql`: PostgreSQL tables and indexes for citizen identity, Mayor Otti, districts, home plots, houses, follower snapshots, construction events, city events, agent definitions/jobs/runs, approvals, media drafts, social comments, and audit events.
- `seed.sql`: idempotent seed rows for Mayor Otti, founding districts, and planned AI agent roles.

## Apply to a fresh PostgreSQL database
Run these files in order using an administrator-controlled PostgreSQL client:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/seed.sql
```

Do not use a production database until backups, access controls, and migration review are configured.

## Important data rules
1. Social followers are audience metrics, not registered NOVARIA citizens.
2. Record a dated snapshot per platform and source account.
3. Compute net change from verified data. Some platforms round public counters; use official analytics where available.
4. A construction event has a unique `idempotency_key`. A retry must reuse the same key and must not create duplicate homes.
5. Houses are attached to unique plots. A community home can later be claimed by a registered citizen.
6. Keep Mayor Otti as the sole active city leader. A partial unique index enforces one active mayor.
7. Agent jobs persist independently of the browser. Every run and approval should be traceable.
8. Public content must reference verified `city_events` or other approved factual data.
9. Do not place real-money balances or payout functionality into NOVA Coin. Cash rewards require a separate, approved provider ledger and legal review.

## Current application status
The schema is prepared but is not yet wired to a database client. The `/api/health` endpoint reports database integration as not configured until a real connection and migrations are implemented.
