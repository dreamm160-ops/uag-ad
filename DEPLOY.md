# UGC Ad Studio — Deploy Notes

## Status

**Deployed.** Production Vercel deploy completed on 2026-05-31 09:07 UTC. App key update redeployed on 2026-05-31 10:34 UTC.

- Production URL: `https://scrollstop-ugc-studio.vercel.app`
- Latest deployment: `https://scrollstop-ugc-studio-cl6fufo2e-dreamm160-8254s-projects.vercel.app`
- Vercel project: `scrollstop-ugc-studio`
- Vercel account: `dreamm160-8254s-projects`
- GitHub repo: `https://github.com/dreamm160-ops/uag-ad`
- GitHub branch: `main`

Pollinations BYOP callback URI confirmed by user: `https://scrollstop-ugc-studio.vercel.app/`.

All technical gates pass:
- [x] Build passes
- [x] Typecheck passes
- [x] 28 automated tests pass (21 validation + 5 workflow integration + 2 Pollinations model tests)
- [x] No-key blocking works server-side on all 4 API routes
- [x] BYOP auth UI present (one-click Login with Pollinations, no manual key input)
- [x] 3 sample briefs across product categories (beauty, hardware, pet safety)
- [x] Print-specific CSS for PDF export
- [x] Per-scene frame regeneration
- [x] Copy-to-clipboard for all export sections
- [x] Env example + README docs exist
- [x] PostCSS config + autoprefixer installed (fixes `next dev` CSS parse failure)

## Launch requirements

Before deployment, confirm:

1. [x] App builds successfully (`npm run build`)
2. [x] TypeScript typecheck passes (`npm run lint` / `tsc --noEmit`)
3. [x] Tests pass (`npm test`)
4. [x] BYOP auth flow visible in UI
5. [x] No hidden owner spend-key fallback in production
6. [x] Env vars documented in `.env.example`
7. [x] Live end-to-end generation test with funded Pollinations user key (passed: hooks → scripts → storyboard → frame regeneration)
8. [x] Vercel account details provided by human
9. [x] Production deploy completed
10. [x] Pollinations callback URI added by human
11. [x] GitHub repo added on `main`

## Expected env vars

```bash
# Publishable app key used as Pollinations BYOP client_id / app attribution
# This is NOT a spend key — it's for attribution and developer earnings.
NEXT_PUBLIC_POLLINATIONS_APP_KEY=pk_...

# Which text model to use for generation
POLLINATIONS_TEXT_MODEL=openai

# Development-only: allow mock fallback when no user key is present.
# Must be "false" in production.
POLLINATIONS_ALLOW_MOCK=false
```

## Pollinations app-key setup

1. Register your app with Pollinations to get a publishable key (`pk_...`).
2. Register the exact web callback URI in Pollinations:
   - Local dev: `http://localhost:3100`
   - Production: `https://scrollstop-ugc-studio.vercel.app/`
3. Without a matching redirect URI, Pollinations login will fail before the app receives the user key.

## Pollinations auth model

- Primary path: user clicks **Login with Pollinations** and authorizes via Pollinations BYOP redirect flow.
- The app key (`pk_...`) identifies the app for attribution and developer earnings.
- Pollinations returns a user-authorized key (`sk_...`) that is stored in browser `localStorage` and sent as `clientKey`.
- No hidden owner spend-key fallback in normal app runtime.
- Direct image URLs use the user-authorized key via `?key=` per `POLLINATIONS-API.md`.
- Manual key entry is intentionally not exposed in the UI.

## Build + test commands

```bash
npm install
npm run lint        # TypeScript typecheck
npm test            # Vitest suite (26 tests)
npm run build       # Production build
npm run start       # Start on port 3000 (or set PORT)
```

## Deployment model

- One Vercel project for this app only.
- Separate Vercel account per app (tracked later in registry).
- No auto-deploy until human provides account details.

## Deployment steps (for human)

1. Create Vercel project for `ugc-ad-studio`.
2. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_POLLINATIONS_APP_KEY`
   - `POLLINATIONS_TEXT_MODEL`
   - `POLLINATIONS_ALLOW_MOCK=false`
3. Register the production callback URI (`https://scrollstop-ugc-studio.vercel.app/`) in Pollinations.
4. Deploy.
5. Smoke test: open app → Login with Pollinations → load sample brief → generate hooks → select angle → generate scripts → generate storyboard → verify frames render.
6. Mark `deployed` → update `REGISTRY.json`.

## Deployment options

### Option A: GitHub Actions (recommended)
1. Fork/push this repo to your GitHub account.
2. Create a Vercel project at <https://vercel.com/new>.
3. Link the GitHub repo to the Vercel project.
4. Add these secrets in GitHub → Settings → Secrets:
   - `VERCEL_TOKEN` — from <https://vercel.com/account/tokens>
   - `VERCEL_ORG_ID` — from Vercel project settings
   - `VERCEL_PROJECT_ID` — from Vercel project settings
   - `NEXT_PUBLIC_POLLINATIONS_APP_KEY` — your `pk_...` key
5. Push to `main` branch → auto-deploy via GitHub Actions.

### Option B: Vercel CLI (manual)
```bash
# 1. Login to Vercel
npx vercel login

# 2. Link project (creates .vercel/project.json)
cd apps/ugc-ad-studio
npx vercel link

# 3. Set environment variables
npx vercel env add NEXT_PUBLIC_POLLINATIONS_APP_KEY
npx vercel env add POLLINATIONS_TEXT_MODEL openai
npx vercel env add POLLINATIONS_ALLOW_MOCK false

# 4. Deploy
npx vercel --prod
```

### Option C: Vercel Dashboard (drag-and-drop)
1. Build locally: `cd apps/ugc-ad-studio && npm run build`
2. Zip the entire `apps/ugc-ad-studio` directory.
3. Go to <https://vercel.com/new>.
4. Import the zip.
5. Add environment variables in the Vercel dashboard.
6. Deploy.

## After deploy — critical steps

1. **Register callback URI in Pollinations BYOP settings:**
   - Production callback URI: `https://scrollstop-ugc-studio.vercel.app/`
   - Add this exact URI as an allowed redirect in your Pollinations app settings.

2. **Browser smoke test:**
   - Open production URL
   - Click "Login with Pollinations"
   - Complete OAuth → should redirect back with key stored
   - Load sample brief → Generate hooks → Select angle → Generate scripts → Generate storyboard
   - Verify all 4 phases work end-to-end

3. **Update `REGISTRY.json`:**
   - Set `vercel.projectCreated: true`
   - Set `vercel.accountAssigned: true`
   - Set `vercel.accountLabel: "<your-vercel-team>"`
   - Move status from `deploy_ready` to `deployed`

## Known blockers

None. Vercel deployment, Pollinations callback setup, GitHub repo setup, and production smoke checks pass.
