# NOVARIA AI Command Center

## Current implementation
- Development-only dashboard at `/admin/ai`.
- Read-only status endpoint at `/api/ai/status`.
- Agent roles are displayed as planned or not configured.
- The command composer is intentionally disabled.
- The page returns 404 in production until administrator authentication and role-based access control are implemented.

## Production prerequisites
1. Add owner/admin authentication with server-side session verification.
2. Add role-based authorization for every admin API route.
3. Add PostgreSQL schema for agent_jobs, agent_runs, approvals, and audit_events.
4. Add a durable queue and background worker process.
5. Add Claude API calls on the server only; never expose API keys in browser bundles.
6. Give agents narrowly scoped tools with JSON schemas, input validation, timeouts, retries, and idempotency keys.
7. Add approval gates for publishing, financial actions, user bans, refunds, data deletion, and large world edits.
8. Add observability, error alerts, rate limits, and a global kill switch.

## Execution model
The dashboard is a control plane. Agent work must run in server-side workers, not in a browser tab. Jobs must persist if a user closes the website or the hosting process restarts.

## Current limitation
This dashboard is a visual and architectural preview. It does not call Claude, execute city changes, read social accounts, publish content, reply to comments, or transfer money.

## Citizen game economy
- Mission definitions are seeded in `db/seed.sql`.
- Citizen completion is stored in `citizen_missions` and protected by a unique citizen/mission constraint.
- NOVA Coin is tracked in `citizen_wallets` and an idempotent `wallet_ledger`.
- The public UI labels NOVA Coin as a non-cash game balance. No cash redemption or withdrawal endpoints exist.
- Current mission completion is self-confirmed exploration; future interactive proof-of-action checks should be added before competitive rewards.
