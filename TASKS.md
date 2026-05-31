# UGC Ad Studio Tasks

## Phase 0 — Foundation

- [x] choose stack and scaffold app
- [x] define environment variable contract
- [x] create basic layout and page shells
- [x] create shared types for brief, angles, scripts, frames, export packet

## Phase 1 — Core input flow

- [x] build product brief form
- [x] add local draft persistence
- [x] validate required fields
- [x] add example seed brief for testing

## Phase 2 — Text generation workflow

- [x] implement hook matrix generator
- [x] implement angle selection flow
- [x] implement script generator
- [x] implement shot list generator
- [x] structure output for export (via creator brief page)

## Phase 3 — Image-assisted workflow

- [x] implement storyboard frame prompt builder
- [x] generate 5 frame concepts per selected script
- [x] show frame gallery grouped by scene
- [x] allow frame regenerate per scene

## Phase 4 — Export / packaging

- [x] build creator brief summary page
- [x] export page as clean printable/shareable format
- [x] include hooks, script, shot list, frame references, CTA

## Phase 5 — QA / polish

- [x] add Pollinations BYOP login flow with local returned-key persistence
- [x] empty/loading/error states are mostly present
- [x] add loading skeletons for storyboard + export phases
- [x] add copy-to-clipboard for export sections and full brief
- [x] add print-specific CSS for clean PDF export
- [x] add second sample brief (DeskFlow Pro Stand) for multi-category QA
- [x] add third sample brief (BarkBond Reflective Harness) for pet safety QA
- [x] tighten prompt scaffolding with anti-generic rules (hooks, scripts, storyboard)
- [x] test sample product categories (beauty, hardware, pet safety)
- [x] document known limitations in README.md
- [x] verify strict no-key blocking behavior when user is not logged in
- [x] add lightweight automated validation tests
- [x] fix `next dev` CSS module parse failure (add postcss.config.mjs + autoprefixer dev dependency)

## Phase 6 — Deploy readiness

- [x] write README.md (exists with full app docs, env contract, BYOP auth model, known limitations)
- [x] write env example
- [x] verify build / lint / typecheck
- [x] verify test suite (26 tests: 21 validation + 5 workflow integration)
- [x] update DEPLOY.md with pre-flight checklist + human deployment steps
- [x] mark deploy readiness in state files (live BYOP smoke test passed — promoted to deploy_ready)
