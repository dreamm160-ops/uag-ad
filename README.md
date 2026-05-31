# UGC Ad Studio

A Pollinations-powered creative workstation that turns one product brief into structured UGC ad angles, scripts, shot lists, and storyboard frames.

## What it does

- Takes a structured product brief (name, audience, offer, tone, goal, constraints).
- Generates a hook matrix with 4 distinct angles, 3 hooks each, and CTAs.
- Turns a chosen angle into 3 script variants plus a shot list.
- Generates storyboard prompts with realistic UGC-style image references.
- Packages everything into an exportable creator brief.

## Tech stack

- Next.js 15 (App Router)
- TypeScript
- Pollinations AI (text + image) via BYOP auth

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
# Publishable app key used as Pollinations BYOP client_id / app attribution
NEXT_PUBLIC_POLLINATIONS_APP_KEY=pk_...

# Optional: which text model to use
POLLINATIONS_TEXT_MODEL=openai

# Optional: allow mock fallback when no user key is present (dev only)
POLLINATIONS_ALLOW_MOCK=false
``

## Scripts

```bash
npm run dev       # Start dev server (requires NODE_ENV=development in this environment)
npm run build     # Production build
npm run start     # Start production server
npm run lint      # TypeScript typecheck (noEmit)
npm test          # Vitest suite (26 tests)
```

> Note: `next dev` requires `postcss` and `autoprefixer` (installed as dev dependencies). If CSS fails to parse in dev mode, ensure `NODE_ENV=development` is set.

## Project structure

```
src/
  app/
    page.tsx                # Main UI with brief intake, stepper, and export
    globals.css             # App styling + print styles
    layout.tsx              # Root layout
    api/generate/
      hooks/route.ts        # Hook matrix generation API
      scripts/route.ts      # Script + shot list generation API
      storyboard/route.ts   # Storyboard frame generation API
  lib/
    types.ts                # Shared TypeScript types
    pollinations.ts         # Pollinations client + prompt builders
    sample-brief.ts         # Built-in sample briefs for testing
```

## Quality gates

- Core workflow: brief → hooks → angle → scripts → shot list → storyboard → export
- Build and typecheck pass
- No-key blocking works (server rejects requests without `clientKey`)
- Mock fallback available for local dev when `POLLINATIONS_ALLOW_MOCK=true`
- Print-specific CSS hides chrome and shows clean white background for PDF export

## Known limitations

- Storyboard frames show Pollinations image URLs, not pre-rendered images (by design; user key is needed for live image generation).
- Export is browser print-to-PDF; no server-side PDF generation yet.
- No persistent user accounts or cloud storage — everything is session-local.
- Voiceover preview is not yet implemented.

## License

MIT — portfolio app for the Lab Apps builder loop.
