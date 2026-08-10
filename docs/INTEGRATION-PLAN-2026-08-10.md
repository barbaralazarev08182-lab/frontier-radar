# Frontier Radar — Clean Integration Plan

**Date:** 2026-08-10  
**Goal:** move the accepted Today + Project Intelligence product into `main` without importing the entire visual experiment history.

This plan is intentionally non-destructive. It does not require deleting old branches or force-pushing.

---

## 1. Why a clean integration is needed

The current repository history contains many successful and failed experiments. The final Product Intelligence branch is substantially ahead of `main` while `main` also contains independent documentation changes.

Observed relationship at checkpoint time:

```text
main ↔ proto/project-intelligence-rebuild-v1
status: diverged
project branch ahead: 176 commits
project branch behind: 5 commits
```

A direct merge would make it difficult to distinguish:

- final production code
- visual experiments
- temporary QA code
- discarded renderer layers
- documentation-only history

Therefore the release strategy should integrate the **final state**, not preserve every experiment commit in the mainline story.

---

# 2. Target branch model

After cleanup, preferred model:

```text
main
  └─ single production source of truth

feature/* or integration/*
  └─ short-lived review branches

historical prototype branches
  └─ retained only if useful for archaeology/reference
```

Vercel desired mapping:

```text
main → Production
integration / feature → Preview
```

---

# 3. Step 0 — Freeze before integration

Before touching `main`:

- treat `proto/today-foil-candy-v4` as frozen Today reference
- treat `proto/project-intelligence-rebuild-v1` as frozen Project Intelligence reference
- keep checkpoint:
  - `docs/checkpoints/2026-08-10-experience-freeze.md`
- do not continue visual experimentation on either frozen branch

Recommended later, once release tooling is convenient:

```text
today-v1-freeze
project-intelligence-v1-freeze
```

as tags or equivalent permanent refs.

---

# 4. Step 1 — Create a clean integration branch from latest main

Create:

```text
integration/experience-v1
```

from the **latest** `main` at the time integration starts.

Do not branch from the prototype branch.

Reason:

- preserves current main history
- makes final code import explicit
- avoids silently reverting main-only docs/config changes

---

# 5. Step 2 — Inventory final code by product area

Do not cherry-pick 176 commits blindly.

Instead compare the frozen branches against `main` and classify files.

## A. Today production

Expected areas:

```text
src/app/today/
src/components/frontier/today-motion-production.tsx
src/components/frontier/today-stage-scroll-controller.tsx
src/components/frontier/today-signal-weave.tsx
src/components/frontier/today-signal-weave*.css / module.css
src/components/frontier/motion-lab/
src/app/qa/motion-lab/
```

For every file, decide:

```text
FINAL PRODUCT
QA / FIXTURE ONLY
HISTORICAL EXPERIMENT
DELETE / DO NOT IMPORT
```

Important: do not import retired foil/spectral/standalone compression renderers into production ownership.

## B. Daily Synthesis / data

Expected areas:

```text
src/lib/ai/daily-synthesis.ts
src/lib/ai/generate-daily-synthesis.ts
src/lib/db/repositories/daily-synthesis.ts
src/lib/feed/daily-synthesis.ts
supabase/migrations/0016_daily_synthesis_snapshots.sql
```

Confirm migration state before attempting to reapply anything.

## C. Project Intelligence

Final route boundary:

```text
src/app/project/[id]/page.tsx
src/app/project/[id]/layout.tsx
src/app/project/[id]/project-intelligence.css
src/app/project/[id]/project-intelligence-effects.css
src/app/project/[id]/project-intelligence-capture.css
src/app/project/[id]/project-intelligence-refinements.css
src/components/frontier/project-intelligence-motion.tsx
```

Import the frozen final files, not Spatial/Kinetic experiment files.

## D. Site navigation / shared UI

Inspect carefully:

```text
src/components/site-nav.tsx
```

Project Intelligence currently expects transparent nav integration. Verify this does not regress Today / Explore / Saved / Idea Lab.

---

# 6. Step 3 — Explicitly exclude rejected experiments

Do not import as production dependencies:

## Today rejected production layers

```text
today-spectral-field.tsx
today-compression-artifact.tsx
standalone foil/spectral renderer ownership
restore CSS created only to fight these renderers
```

Some files may remain in historical branches or QA, but the clean release should not rely on them unless a current final component demonstrably imports them.

## Project Intelligence rejected branches

```text
proto/project-intelligence-spatial-v1
proto/project-intelligence-kinetic-v1
proto/project-intelligence-v1
```

Do not merge these branches into integration.

---

# 7. Step 4 — Reconcile documentation

The clean integration branch should contain current versions of:

```text
README.md
AGENTS.md
docs/START-HERE.md
docs/checkpoints/2026-08-10-experience-freeze.md
docs/INTEGRATION-PLAN-2026-08-10.md
```

Historical docs should remain clearly marked historical:

```text
docs/PRD.md
docs/PHASES.md
```

Do not rewrite history to pretend rejected experiments never happened; simply keep them out of the current-start documentation.

---

# 8. Step 5 — CI gate

Before browser QA, run:

```bash
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
```

Required result:

```text
TypeScript PASS
ESLint PASS
Tests PASS
Production build PASS
```

If a migration/tooling task requires secrets, keep it separate from build validation.

---

# 9. Step 6 — Browser QA matrix

Build success is not enough.

## Today

Verify:

1. Hero continuous scroll
2. Hero exit
3. Compression stable frame
4. one gesture → Today’s 7
5. Today’s 7 stable frame
6. one gesture → Signal Weave
7. synthesis loading state still allows final chapter entry
8. Signal Weave internal scroll
9. full reverse path
10. slow wheel
11. fast trackpad fling
12. 06 blue / 07 orange identity
13. no foil ghosts / transparency regressions

## Project Intelligence

Verify:

1. Capture stable layout
2. Capture idle motion for 5–10 seconds
3. Capture pointer/parallax
4. Evidence stable layout
5. Evidence idle motion
6. Interrogation internal scrub
7. Interrogation sheets remain ~65% black opacity
8. reverse scrub from Interrogation
9. Resolution score-label readability
10. Resolution idle convergence
11. Build layout / action directions
12. Build idle motion
13. full forward path
14. full reverse path
15. top nav stays visually integrated / transparent

## Shared

Verify:

- target desktop viewport
- browser resize
- no horizontal accidental overflow
- reduced-motion behavior
- CTA/link clickability after motion layers

---

# 10. Step 7 — Preview deployment

Deploy `integration/experience-v1` as Preview.

Check:

- exact commit SHA
- Preview uses intended environment-variable scope
- no Hobby/private-repo author permission block
- real `/today` data path
- real `/project/[id]` path
- server/runtime errors

Do not manually promote the Preview yet.

---

# 11. Step 8 — Merge to main

Only after CI + browser QA:

- open a single integration PR to `main`
- summarize final imported product state, not experiment history
- prefer a clean merge/squash strategy that keeps release history understandable

After merge:

```text
main = official product code
```

Then allow Vercel Git integration to create the Production deployment from `main`.

---

# 12. Step 9 — Vercel production cleanup

After main is deployed successfully:

1. confirm stable Production domain points at main deployment
2. confirm GitHub repository Homepage uses stable domain, not random deployment hash
3. verify Production environment variables
4. verify Preview environment variables
5. verify Deployment Protection behavior
6. verify collaborator author behavior if collaborators will push branches
7. stop using manual Preview promotion as normal release flow

Target:

```text
GitHub main SHA == Vercel Production source SHA
```

---

# 13. Step 10 — GitHub repository cleanup

Only after Production from main is verified.

## Close stale draft PRs

Review and likely close as historical:

```text
PR #1 — Motion Lab: LAB-01 static composition + LAB-02 typography tear
PR #2 — Today production integration: synthesis + Signal Weave
```

Do not merge them after final integration if their content is already superseded.

## Branch cleanup candidates

Potential historical branches:

```text
codex/motion-lab-polish-1fbe2a2
codex/today-ui-polish-e121beef
feat/today-motion-lab
feat/today-production-integration
proto/project-intelligence-kinetic-v1
proto/project-intelligence-spatial-v1
proto/project-intelligence-v1
proto/today-optical-material-v1
proto/today-presence-field-v2
proto/today-spectral-specimens-v3
```

Before deleting any branch:

- ensure no unique required code remains
- ensure freeze refs/tags/checkpoints exist
- ensure main Production is verified

Deletion is cleanup, not part of integration itself.

---

# 14. Step 11 — Protect main

Current repository `main` was observed unprotected.

Recommended minimum policy after integration:

- require pull request before merging
- require CI status checks
- block force push
- optionally require branch to be up to date before merge

This becomes more important now that collaborators exist.

---

# 15. Definition of done

Integration is complete only when all are true:

```text
[ ] clean integration branch created from latest main
[ ] final Today code intentionally imported
[ ] final Daily Synthesis/data code intentionally imported
[ ] final Project Intelligence code intentionally imported
[ ] rejected renderer/3D/bridge experiments excluded
[ ] docs reconciled
[ ] typecheck PASS
[ ] lint PASS
[ ] tests PASS
[ ] build PASS
[ ] Today browser QA PASS
[ ] Project Intelligence browser QA PASS
[ ] integration PR merged to main
[ ] Vercel Production built from main
[ ] stable Production domain confirmed
[ ] GitHub Homepage updated to stable domain
[ ] stale PRs closed
[ ] branch cleanup reviewed
[ ] main protection enabled
```

Until the `main → Production` equality is verified, keep frozen prototype branches intact.
