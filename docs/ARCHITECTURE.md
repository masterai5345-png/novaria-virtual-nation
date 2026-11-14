# NOVARIA Architecture

## Product direction
NOVARIA is a browser-first virtual nation. The public experience includes a 3D town, an otter citizen identity, Mayor Otti, homes, quests, city updates, and later multiplayer.

## Initial stack
- Next.js App Router + TypeScript
- Three.js for the browser 3D scene
- PostgreSQL for production persistence (planned)
- Background workers and scheduled jobs for recurring tasks (planned)
- Claude API behind a server-side orchestrator (planned)

## Initial milestone in this branch
- Responsive landing experience
- Interactive Three.js town preview
- Procedural preview houses and otter mascot
- Demo-only mission and NOVA Coin state
- Health endpoint that reports unconfigured integrations honestly

## Planned domain modules
- identity: citizen accounts, profiles, avatar selection
- city: population snapshots, districts, plots, structures, construction events
- world: NPC schedules, quests, events, world state
- media: content briefs, scripts, render jobs, approval queue, publishing logs
- community: comments, moderation, voting, support tickets
- finance: provider transactions, reward ledger, withdrawal requests, reconciliation
- agents: job queue, tool permissions, traces, human approvals

## Key invariants
1. Social followers are not automatically registered citizens.
2. One verified net-new follower unit can create one community-home event only when the selected social source provides sufficiently accurate data.
3. Every construction event must be idempotent (unique source + date + event key) to prevent duplicate homes.
4. NOVA Coin is a closed-loop game balance and is not redeemable for cash.
5. Real-money rewards are separate liabilities, credited only after a provider's signed postback and approval.
6. An AI agent may propose high-impact actions, but money movement, account deletion, publishing and security changes require explicit policies and/or human approval.
7. All AI actions must be recorded with actor, tool, input summary, result, timestamp, and approval state.

## Rollout
1. Foundation preview
2. Persistent citizen identity and database
3. City ledger and population automation
4. Admin AI Command Center
5. Media workflow and approved social integrations
6. Multiplayer and full world assets
7. Offerwall and payout integrations after provider approval and legal review

This branch is a development foundation, not a production-ready game or a cash-rewards service.