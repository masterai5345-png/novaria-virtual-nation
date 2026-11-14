# NOVARIA — A Living Virtual Nation

NOVARIA is a browser-first virtual nation project featuring a living 3D town, otter citizens, a single in-world mayor (Mayor Otti), community-driven development, and a future AI-operated media and city-management system.

## Current branch

`foundation/mvp` — initial web foundation and interactive 3D town preview.

## Requirements

- Node.js 20.9 or later
- npm
- Modern desktop or mobile browser with WebGL support

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Validate

```bash
npm run lint
npm run build
```

## Health endpoint

After starting the app, open http://localhost:3000/api/health.

## Current scope

- Responsive town landing experience
- Three.js procedural 3D town preview
- Procedural preview Otter and homes
- Demo missions and NOVA Coin balance
- Health endpoint

## Not connected yet

- Google login
- Persistent citizen database
- Social media analytics APIs
- Automated construction jobs
- Claude / AI agent orchestration
- YouTube or Meta publishing
- Offerwall or real-money payouts
- Multiplayer

Demo balances and mission rewards have no cash value. Do not enable cash withdrawals until provider approval, secure payment rails, compliance review, and a reconciled reward ledger exist.

See [Architecture](docs/ARCHITECTURE.md) and [AI Agent Roles](docs/AI_AGENT_ROLES.md).
