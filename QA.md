# UGC Ad Studio QA Checklist

## Core workflow

- [x] user can log in with Pollinations before generation
- [x] user can submit a brief without confusion
- [x] hook matrix returns structured results
- [x] script output maps to chosen angle
- [x] shot list matches script scenes
- [x] storyboard frames map to scenes (5 frames with prompts + Pollinations URLs)
- [x] export view includes all critical outputs (brief, angle, script, shot list, frames, CTA)
- [x] user can regenerate a single storyboard scene without resetting the whole storyboard

## UX

- [x] clear empty state
- [x] loading states are obvious
- [x] generation failures are recoverable
- [x] output layout is readable
- [x] loading skeletons for storyboard + export phases
- [x] print/export layout needs print-specific CSS pass

## Technical

- [x] app builds successfully
- [x] BYOP key path is wired through all generation routes
- [x] lint passes
- [x] typecheck passes
- [x] test suite passes
- [x] env handling is documented
- [x] `next dev` mode works (postcss + autoprefixer installed)

## Product quality

- [x] output is better than raw prompt dumping (strong prompt scaffolding with anti-generic rules)
- [x] workflow feels like a creator tool, not a demo
- [x] three product categories tested (beauty drink, hardware stand, pet harness)
- [x] no-key blocking verified server-side (hooks/scripts/storyboard all reject without clientKey)
- [x] authorized-key login flow verified structurally (BYOP panel + redirect URI + key storage + no-key blocking all pass)
- [x] live BYOP smoke test passed: hooks → scripts → storyboard (5 frames with ?key= URLs) → per-scene regeneration all confirmed working against gen.pollinations.ai
