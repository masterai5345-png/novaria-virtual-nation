# Deploy NOVARIA MVP to Render

This branch contains the responsive 3D town preview, Google citizen sign-in integration, PostgreSQL persistence layer, owner command queue, approval inbox, and a proposal-only Claude worker. The public service is not fully production-ready until its external credentials, database, and operational checks are completed.

## 1. Connect the repository
1. Sign in to Render.
2. Choose **New → Blueprint** and connect GitHub.
3. Select `masterai5345-png/novaria-virtual-nation`.
4. Deploy branch `foundation/mvp` for the beta.
5. Review the services and estimated cost before confirming. The Blueprint contains a web service, background worker, and daily cron service.

## 2. Create PostgreSQL
1. Create a managed PostgreSQL database in Render (or use another managed PostgreSQL provider).
2. Copy its private/internal connection string when available.
3. Add that URL as `DATABASE_URL` to the web service, background worker, and daily cron service.
4. Run database setup from a secure one-off shell or local environment:
   `npm run db:migrate`
5. The migration applies `db/schema.sql` and `db/seed.sql`, creating the tables and the unique Mayor Otti seed.

Never put the database URL in browser code or commit it to GitHub.

## 3. Web service settings
The Blueprint sets:
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Health check: `/api/health`
- Node.js 22
- `NODE_ENV=production`

Set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=false` until the Google OAuth setup is complete.

## 4. Google citizen sign-in
Create a Google OAuth Web Client and add these environment variables to the web service:
- `AUTH_SECRET` — at least 32 random characters
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `NOVARIA_OWNER_EMAIL` — exact Google email for the project owner
- `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` only after the above values and the database migration are ready

Authorized redirect URIs:
- Local: `http://localhost:3000/api/auth/callback/google`
- Production: `https://YOUR_RENDER_HOST/api/auth/callback/google`

The first successful Google sign-in creates the citizen record. A sign-in whose Google email matches `NOVARIA_OWNER_EMAIL` receives the owner role. Verify that row in PostgreSQL before using the AI administration routes.

## 5. Claude worker
The `novaria-agent-worker` background worker requires:
- `DATABASE_URL`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL` — a model ID enabled for your Anthropic account
- `WORKER_POLL_MS` (optional; default 5000)

It processes owner commands into proposals and daily content jobs into video-script drafts. It has no tools for actual publishing, public replies, money transfers, account bans, or destructive changes. The worker is a long-running service; it continues independently of the browser.

## 6. Daily content scheduler
The cron service runs `npm run enqueue:daily-content` at 01:00 UTC (08:00 WIB). It only queues a daily content job when public, verified `city_events` exist in the last seven days. The Claude worker turns those events into a draft saved in `media_drafts` and asks for owner review.

The current pipeline generates a script and shot list, not a rendered video file. A video-generation/rendering provider and media storage are still required.

## 7. Test before inviting followers
1. Confirm `/api/health` reports database `ok`.
2. Test Google sign-in and the citizen profile on desktop and mobile.
3. Confirm the citizen record exists in PostgreSQL.
4. Sign in with the configured owner Google account and open `/admin/ai`.
5. Submit a test command and confirm it appears in the queue.
6. Verify the Claude worker creates an approval request.
7. Insert a test city event in a non-production database and confirm the daily content scheduler can queue a draft.
8. Test the touch joystick on a real phone.

## 8. Still not implemented
- Official YouTube/Meta follower polling and token refresh.
- Automatic follower snapshot ingestion from platform APIs.
- Real-time multiplayer and synchronized citizen movement.
- Full persistence for every game action.
- Video rendering and automatic publishing.
- Automatic social comment retrieval/replies.
- Offerwall, cash-reward ledger, payout provider, and withdrawals.
- Full security review, rate limiting for every admin operation, backups, alerting, and support processes.

Keep real-money features disabled. A deploy is not a launch: review privacy, data protection, OAuth scopes, infrastructure costs, moderation, and legal requirements before public access.
