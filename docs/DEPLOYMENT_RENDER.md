# Deploy NOVARIA MVP to Render

The repository includes a Render Blueprint at `render.yaml`. It provisions:
- A Node.js web service for the 3D town and citizen APIs.
- A managed PostgreSQL database in Singapore.
- A continuously running background worker for Claude jobs.
- A daily cron service that queues verified city-story drafts.

The Blueprint uses paid compute and a paid basic PostgreSQL tier. Review the estimated monthly cost shown by Render before confirming deployment. Render currently supports PostgreSQL databases in Blueprints and service-to-database references; the exact plan and regional availability are defined in the file. <https://render.com/docs/blueprint-spec>

## 1. Connect the repository
1. Sign in to Render.
2. Choose **New → Blueprint** and connect GitHub.
3. Select `masterai5345-png/novaria-virtual-nation`.
4. Choose branch `foundation/mvp`.
5. Review the proposed web, worker, cron, and PostgreSQL services and the cost estimate.
6. Confirm creation only after reviewing the paid services.

## 2. Set the secrets during Blueprint creation
Render prompts for secret values marked `sync: false`. Enter:
- `AUTH_GOOGLE_ID` — Google OAuth Web Client ID.
- `AUTH_GOOGLE_SECRET` — Google OAuth Web Client Secret.
- `NOVARIA_OWNER_EMAIL` — the exact Google account email that owns NOVARIA.
- `ANTHROPIC_API_KEY` — Anthropic API key for Claude.
- `ANTHROPIC_MODEL` — a Claude model ID enabled for your Anthropic account.

Render generates `AUTH_SECRET` and `AUDIENCE_INGEST_SECRET` automatically. Keep both private. The generated audience secret must be copied securely to any trusted metrics connector that sends signed snapshots.

The Blueprint connects the PostgreSQL connection string to all three services automatically. The web service runs `npm run db:migrate` as its pre-deploy command, applying the schema and seed data before the application starts.

## 3. Google citizen sign-in
Create a Google OAuth Web Client in Google Cloud Console. Add these Authorized redirect URIs:
- Local: `http://localhost:3000/api/auth/callback/google`
- Production: `https://YOUR_RENDER_HOST/api/auth/callback/google`

After the first deployment, open the web service's Environment page and set:
- `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`

Save the change and trigger a new deployment so the public client bundle includes the enabled sign-in button. Sign in using the email configured in `NOVARIA_OWNER_EMAIL`. The first matching sign-in creates the owner citizen record. Verify the owner role using the database before using `/admin/ai`.

## 4. Claude worker
The `novaria-agent-worker` background worker starts with:
- `DATABASE_URL` from the managed PostgreSQL database.
- `ANTHROPIC_API_KEY`.
- `ANTHROPIC_MODEL`.
- `WORKER_POLL_MS=5000`.

It can prepare owner plans and daily script drafts. It does not publish, reply publicly, transfer money, ban accounts, or perform destructive actions. The worker is a long-running service; it continues even when the dashboard browser is closed.

## 5. Daily story scheduler
The cron service runs `npm run enqueue:daily-content` at 01:00 UTC (08:00 WIB). It only queues a new draft when unused, verified public `city_events` exist in the last seven days. The Claude worker writes a script and shot list to `media_drafts`, then creates an owner approval request.

This pipeline produces a script draft, not a rendered video file. A video-generation/rendering service, asset storage, and platform publishing credentials are still required for automatic finished videos.

## 6. Verify the deployment
1. Open `https://YOUR_RENDER_HOST/api/health` and confirm database status is `ok`.
2. Confirm `/api/ai/status` reports the configured integrations.
3. Test Google sign-in and citizen profile.
4. Sign in with the owner Google account and open `/admin/ai`.
5. Submit a test command and confirm the worker prepares an approval request.
6. Complete a citizen mission and confirm its status and NOVA Coin ledger persist after reload.
7. Test the touch joystick on a real phone.

## 7. Still not connected
- Official YouTube/Meta OAuth and follower analytics polling.
- A trusted platform connector that pushes signed metrics to `POST /api/integrations/audience`.
- Real-time multiplayer and synchronized citizen movement.
- Dynamic 3D rendering of all persisted homes and advanced GLB character assets.
- Video rendering, upload, and automatic social publishing.
- Comment ingestion, moderation workflow, and automatic replies.
- Offerwall, cash-reward ledger, and withdrawal provider.
- Comprehensive security review, backups, monitoring, alerting, and support operations.

Keep NOVA Coin separate from real money. Real-money reward and payout features are disabled. Do not invite the public until OAuth, database persistence, security, moderation, privacy, performance, and operating costs have been checked.
