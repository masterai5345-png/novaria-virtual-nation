# Deploy NOVARIA Preview to Render

This guide deploys the current public-facing town preview only. It does not activate sign-in, PostgreSQL persistence, AI workers, social publishing, offerwalls, or payouts.

## 1. Connect the repository
1. Sign in to Render.
2. Choose **New → Web Service**.
3. Connect GitHub and select `masterai5345-png/novaria-virtual-nation`.
4. Set the branch to `foundation/mvp` while this work remains in review.

## 2. Build settings
- Runtime: Node
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Health check path: `/api/health`
- Node version: 22 or newer (the project requires Node 20.9+).

Use a paid always-on service for a public experience that should remain available. A free preview service may sleep or have resource limits. Background AI workers should be separate services when those integrations are implemented.

## 3. Environment variables
Set:
- `NODE_ENV=production`
- `NEXT_PUBLIC_APP_URL=https://YOUR-RENDER-URL`

Do not add placeholder API secrets. The current public preview does not require a Claude API key, Google OAuth secret, or social credentials.

## 4. Current deployment limitations
- The homepage and procedural 3D town preview can be served.
- The AI Command Center route intentionally returns 404 in production until administrator authentication and role-based authorization are implemented.
- `/api/health` reports integrations as not configured.
- Citizen sign-in and permanent citizen profiles are not implemented.
- PostgreSQL schema files are prepared but are not yet connected to the application.
- Real-money rewards and withdrawals are disabled.

## 5. After deployment
1. Test the homepage on desktop and a real mobile device.
2. Confirm that the 3D preview renders and that keyboard movement works.
3. Test the touch joystick on a phone.
4. Check `/api/health`.
5. Keep the service private or share it only as a preview until authentication, data persistence, moderation, and privacy controls are ready.

Do not merge this development branch into `main` or invite the public until the pull request checks pass and the remaining production prerequisites are reviewed.
