# NOVARIA MVP Runbook

This runbook takes the repository from source code to a configured beta. The app is not production-ready merely because it builds.

## 1. Database
1. Create a managed PostgreSQL database (Render PostgreSQL or another provider).
2. Set `DATABASE_URL` on the web service and worker.
3. From a secure local environment or one-off deployment shell, run:
   `npm run db:migrate`
4. Confirm `/api/health` reports database reachable and seeded.

Do not expose database credentials to the browser or commit them to Git.

## 2. Google citizen sign-in
Create a Google OAuth Web client. Set:
- `AUTH_SECRET` (at least 32 random characters)
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `NOVARIA_OWNER_EMAIL` (the exact Google email that owns the project)
- `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`

Authorized redirect URIs:
- Local: `http://localhost:3000/api/auth/callback/google`
- Production: `https://YOUR_RENDER_HOST/api/auth/callback/google`

After the first owner sign-in, run the seed/migration and check the owner row has `account_role='owner'`. If the owner email was not set before first login, set it, sign out, and sign in again.

Never share OAuth secrets in chat or commit them.

## 3. Claude CEO worker
Set on the worker service only:
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL` (a model ID currently enabled for your Anthropic account)
- `DATABASE_URL`

The worker takes queued owner commands and prepares an AI plan in `approval_requests`. It has no tools for direct payments, publishing, account bans, or destructive data actions. The dashboard displays the plan as awaiting owner review. Do not grant it external permissions until every tool has its own authorization, idempotency and audit safeguards.

## 4. Social account integrations
The current Growth Monitor does not read real follower data. Before enabling:
- Complete YouTube/Meta developer setup and channel/page permissions.
- Use official analytics APIs and token refresh storage.
- Reconcile daily snapshots and account for platform rounding/availability.
- Test on one selected source account.
Followers are audience metrics, not automatically registered NOVARIA citizens.

## 5. Preview deployment
1. Connect the GitHub repository to Render.
2. Use branch `foundation/mvp` until the PR is reviewed.
3. Apply the Blueprint or create the web service and worker manually.
4. Set secrets in Render Environment, not in repository files.
5. Run migrations once against the managed PostgreSQL database.
6. Check `/api/health`, Google sign-in, citizen profile, and owner command queue.
7. Keep the service as a private/invite beta until privacy, security, performance, backups, and support processes are reviewed.

## 6. Still not implemented
- Real-time multiplayer.
- Fully persistent movement/game state.
- Real follower API polling / one-house-per-follower production automation.
- Automatic video rendering from generated scenes.
- Public social publishing and automatic comment replies.
- Offerwall, real cash reward ledger, or withdrawal provider.
- Production admin approval UI for all action classes.

NOVA Coin shown on the public preview is illustrative and has no cash value. Real-money features must remain disabled until providers approve the business model and legal requirements are reviewed.
