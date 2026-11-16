# NOVARIA Village Zero — safe prototype

Branch: `feature/village-zero-instagram-commands`.

## Goal
An **actually empty** town on Day 0, growing only after follower commands are accepted. The existing production home page and database remain unchanged.

## Implemented
- `/village-zero`: isolated Three.js scene containing just bare terrain at Day 0. The browser can simulate comments and watch houses, roads, trees, shops and parks appear.
- `src/lib/village-zero.ts`: allowlisted, no-cost, deterministic comment parser. Each source comment ID is accepted once. Buildings are placed on available tiles. No arbitrary text execution.
- Browser-local demo persistence and reset. The demo is **not** Instagram integration, database persistence or live follower-driven building.
- Village is empty by default (no buildings, initial citizens or infrastructure).

## Next milestones — not implemented
1. Admin approval of visual style and rules.
2. Server-side database migration for world epochs, commands, proposals and plots. Retain the existing populated city separately for archival/history; NEVER drop or reset existing tables.
3. Verified Instagram Business/Creator account connection with official Meta Instagram API, correct permissions, valid webhook signature and configured comment subscriptions. API availability and App Review may limit use.
4. Ingest comments only on a designated NOVARIA account and selected posts. Deduplicate by (account_id, media_id, comment_id), validate author/source, rate-limit votes, and moderate. Never blindly trust usernames or text.
5. Two operating modes: (a) vote-based building command once per user per episode and (b) owner-approved direct commands. Keep a publicly visible ledger of accepted and rejected proposals.
6. Transactional world updates, placement collision and zoning checks, idempotent rebuild event log, WebSocket/SSE updates, signed render snapshots, rollback, audit and moderation.
7. Produce daily vertical videos from event snapshots with reusable 3D camera tracks; try local FFmpeg/Remotion or zero-cost scheduled rendering where allowed.
8. Publish only through the officially approved platform API and authorized permissions, initially behind owner approval.

## Cost and safety
- Village commands don't require Claude or any LLM.
- Running Ollama locally can remove inference API costs but still uses local hardware/electricity.
- Render's existing web/worker/cron/DB are on paid plans. Prototype branch does NOT alter service plans, production or billing.
- Avoid automatic redeploy of `foundation/mvp`, never modify paid resources without the owner's explicit authorization.
- Never expose Meta access tokens or application secrets to browsers or logs.
