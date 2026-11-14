# NOVARIA — A Living Virtual Nation

NOVARIA is a browser-first virtual nation project featuring a procedural 3D coastal town, otter citizens, the single in-world mayor Mayor Otti, community-driven development, and an evolving AI-operated media and city-management system.

## Current branch

`foundation/mvp` — 3D town preview, Google citizen authentication integration, PostgreSQL persistence, owner-only AI command queue, proposal-only Claude worker, daily content-script scheduler, and approval inbox.

## Requirements

- Node.js 20.9 or later (Node 22 recommended)
- npm
- PostgreSQL for citizen profiles and background jobs
- Modern browser with WebGL support

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Database setup

Set `DATABASE_URL`, then run:

```bash
npm run db:migrate
```

This applies `db/schema.sql` and `db/seed.sql`.

## Validate

```bash
npm run lint
npm run build
```

## Run the Claude worker

Set `DATABASE_URL`, `ANTHROPIC_API_KEY`, and `ANTHROPIC_MODEL`, then run:

```bash
npm run worker
```

The worker generates owner plans and video-script drafts for review; it does not publish, reply publicly, or transfer money.

## Schedule a daily story

```bash
npm run enqueue:daily-content
```

This queues at most one daily job and only when verified public city events exist in the previous seven days.

## Health and status

- `/api/health`
- `/api/ai/status`
- `/api/city/overview`

## Current functionality

- Responsive town landing page and Three.js procedural 3D preview
- Keyboard and touch joystick movement
- Google OAuth citizen registration (requires OAuth and PostgreSQL configuration)
- Permanent citizen profile in PostgreSQL
- Mayor Otti and founding districts in seed data
- Database-backed city counts when configured
- Owner-only AI command queue and proposal inbox
- Claude worker for owner plans and daily script drafts (requires Anthropic credentials)
- Verified follower snapshot to idempotent community-house construction service (platform connector pending)

## Not connected / not production-ready

- Official YouTube/Meta API polling and token refresh
- Real-time multiplayer
- Actual video rendering or platform publishing
- Automatic public comment ingestion/replies
- Offerwall, cash reward ledger, and withdrawals
- Full monitoring, backups, and security audit

NOVA Coin balances in the preview have no cash value. Social followers are not automatically registered citizens. All real-money reward functionality remains disabled.

See [Architecture](docs/ARCHITECTURE.md), [AI Agent Roles](docs/AI_AGENT_ROLES.md), [Database Schema](docs/DATABASE_SCHEMA.md), and [MVP Runbook](docs/RUNBOOK_MVP.md).
