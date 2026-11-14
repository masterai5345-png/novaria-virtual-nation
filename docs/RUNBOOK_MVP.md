# NOVARIA MVP Runbook

This runbook configures the features currently present on branch `foundation/mvp`. A passing build does not mean that external accounts, providers, or 24/7 services are already active.

## 1. Database
1. Create a managed PostgreSQL database.
2. Set `DATABASE_URL` on the web service, worker, and daily scheduler.
3. Run `npm run db:migrate` from a secure shell or local environment.
4. Confirm `/api/health` reports database `ok`.
5. Confirm `city_leaders` has one active `mayor-otti` record and `agent_definitions` contains `ceo-orchestrator` and `scriptwriter`.

The migration is repeatable for the current schema and seed. Take a backup before applying future schema changes to a production database.

## 2. Google citizen sign-in
Create a Google OAuth Web client. Set on the web service:
- `AUTH_SECRET` (a random value of at least 32 characters)
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `NOVARIA_OWNER_EMAIL` (the exact Google email that owns the project)
- `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`

Authorized redirect URIs:
- Local: `http://localhost:3000/api/auth/callback/google`
- Production: `https://YOUR_RENDER_HOST/api/auth/callback/google`

Set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=false` until the database and OAuth credentials work. Google email verification is required. The first owner sign-in creates an owner citizen record only when `NOVARIA_OWNER_EMAIL` matches. Verify the role in the database.

## 3. Owner command queue and Claude worker
Set on the worker service only:
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL` (a model ID currently enabled for your Anthropic account)
- `DATABASE_URL`

The owner dashboard is at `/admin/ai` and requires the owner Google account and owner DB role. It accepts owner commands and stores them as jobs. The worker generates structured plans and creates approval requests. No external action is performed by the worker.

## 4. Daily content draft workflow
The Render cron runs `npm run enqueue:daily-content` at 01:00 UTC (08:00 WIB). It creates at most one job for the UTC date and only when public city events exist in the previous seven days.

The worker writes a script draft and shot list into `media_drafts`, then creates an owner approval request. This is not a video-rendering service; no actual video file is produced and no social post is published.

## 5. Verified follower-to-home logic
The function `recordVerifiedAudienceSnapshot` in `src/lib/construction.ts` accepts source metrics after a trusted platform connector has verified them. It stores a dated snapshot, computes net growth as gained minus lost, creates one community home per positive net unit, and uses idempotency/transactions to prevent duplicate builds.

The platform connector and its permissions are not implemented yet. Do not submit guessed values or manual estimates as verified follower data. Followers are audience metrics, not automatically registered NOVARIA citizens.

## 6. Deployment
1. Connect the private GitHub repository to Render.
2. Apply `render.yaml` after reviewing service costs.
3. Configure PostgreSQL, OAuth, and Claude environment variables in Render's secret settings.
4. Run `npm run db:migrate` once.
5. Test `/api/health`, Google sign-in, citizen profile, owner command queue, worker, and daily scheduler.
6. Keep the site in a private/invite beta until privacy, security, performance, backups, moderation, and support processes have been reviewed.

## 7. Still not implemented
- YouTube/Meta official API polling, refresh-token storage, and platform-specific analytics reconciliation.
- Real-time multiplayer, synchronized movement, and persistent real-time game state.
- 3D model/animation asset pipeline and full avatar customization.
- Video rendering, upload, scheduling, and social platform publishing.
- Comment ingestion, moderation, and automated replies.
- Offerwall, real-money ledger, payout rails, and withdrawal operations.
- End-to-end security audit, comprehensive monitoring, database backup automation, and incident response.

NOVA Coin in the public preview is illustrative and has no cash value. Cash rewards must remain disabled until a suitable provider approves the model and legal requirements are reviewed.
