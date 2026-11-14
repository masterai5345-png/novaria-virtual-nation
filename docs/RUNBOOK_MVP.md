# NOVARIA MVP Runbook

This runbook configures the features on branch `foundation/mvp`. A passing build does not mean external credentials, providers, or public hosting have been activated.

## 1. Deploy the Render Blueprint
1. Connect `masterai5345-png/novaria-virtual-nation` to Render as a **Blueprint**.
2. Use branch `foundation/mvp`.
3. Review the paid web service, worker, cron, and PostgreSQL resources before confirming.
4. During initial setup, provide `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `NOVARIA_OWNER_EMAIL`, `ANTHROPIC_API_KEY`, and `ANTHROPIC_MODEL`.
5. Render generates `AUTH_SECRET` and `AUDIENCE_INGEST_SECRET`.
6. The Blueprint connects `DATABASE_URL` to the web, worker, and cron services.
7. The web service runs `npm run db:migrate` before starting, applying `db/schema.sql` and `db/seed.sql`.

Render uses `sync: false` prompts only during initial Blueprint creation; add any later secrets manually in the service Environment settings. Keep every credential out of GitHub and this chat.

## 2. Google citizen sign-in
Create a Google OAuth Web client. Register:
- Local redirect: `http://localhost:3000/api/auth/callback/google`
- Production redirect: `https://YOUR_RENDER_HOST/api/auth/callback/google`

After deployment, set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` on the web service and redeploy. The Google email must be verified. A citizen record is created on first sign-in. The configured `NOVARIA_OWNER_EMAIL` receives the owner role; verify that database row before using owner tools.

## 3. Owner command queue and Claude worker
The admin dashboard is at `/admin/ai` and requires the owner Google account and owner database role. Commands are stored as jobs. The always-on worker processes them with Claude and saves proposals for owner review. It does not have tools for public posting, external replies, money transfers, account bans, or destructive actions.

## 4. Citizen missions and NOVA Coin
The founding missions are seeded from `db/seed.sql`. Signed-in citizens can complete each mission once. Completion is stored in `citizen_missions`, credits `citizen_wallets`, writes an idempotent `wallet_ledger` entry, and creates an anonymized city event. These tasks are currently self-confirmed exploration, not proof-of-work or cash earning. NOVA Coin has no cash value and cannot be withdrawn.

## 5. Daily content draft workflow
The Render cron runs `npm run enqueue:daily-content` at 01:00 UTC (08:00 WIB). It queues one job per day only when unused, verified public city events exist in the previous seven days. The worker writes an English video-script draft and shot list into `media_drafts`, then creates an owner approval request. This is not a video-rendering or publishing service.

## 6. Verified follower-to-home logic
`recordVerifiedAudienceSnapshot` stores a dated audience snapshot, computes net growth as gained minus lost, and creates one community home for each positive net unit. Unique snapshot/event keys and a transaction prevent repeated webhook deliveries from creating duplicate houses.

### Signed audience snapshot connector
The ingestion route is `POST /api/integrations/audience`. It is not a social network connector by itself. An approved YouTube/Meta connector must first obtain metrics through the platform's official API and then sign the exact request body with the generated `AUDIENCE_INGEST_SECRET`.

Signature format:
- `x-novaria-timestamp`: Unix timestamp in seconds.
- `x-novaria-signature`: lowercase hex HMAC-SHA256 of `<timestamp>.<exact raw JSON body>`.
- The timestamp must be within five minutes of server time.

Example Node.js signing snippet for a trusted server-side connector:

```js
import { createHmac } from "node:crypto";

const timestamp = Math.floor(Date.now() / 1000).toString();
const rawBody = JSON.stringify(snapshot);
const signature = createHmac("sha256", process.env.AUDIENCE_INGEST_SECRET)
  .update(`${timestamp}.${rawBody}`)
  .digest("hex");

await fetch(`${process.env.NOVARIA_URL}/api/integrations/audience`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-novaria-timestamp": timestamp,
    "x-novaria-signature": signature,
  },
  body: rawBody,
});
```

The HMAC authenticates the connector, not the truth of the metric. The connector must use official APIs and preserve account/source metadata. Platform API polling, OAuth permissions, token refresh and connector scheduling are still pending.

## 7. Verify the beta
- `/api/health` should report database `ok`.
- `/api/ai/status` should show configured Google/Claude integrations.
- Test citizen sign-in, persistent mission status, wallet balance and owner command history.
- Confirm the worker creates a proposal approval and daily script drafts only from unused public city events.
- Test the mobile joystick and camera controls on a real device.

## 8. Still not implemented
- Official YouTube/Meta follower polling, token refresh, and source-account configuration.
- Real-time multiplayer, synchronized character movement, and full persistent game state.
- Dynamic rendering of every stored home and advanced character GLB assets.
- Video rendering, upload, public publishing, and automatic comment replies.
- Offerwall, real-money reward ledger, payout rails, and withdrawals.
- Comprehensive security review, backups, monitoring, alerts, and incident response.

NOVA Coin in the public preview is illustrative game currency and has no cash value. Keep all money withdrawal features disabled.
