# Frontier Radar — Main Integration Checkpoint

**Date:** 2026-08-10  
**Status:** COMPLETE

This checkpoint records the completion of the clean integration of the accepted Today + Signal Weave + Project Intelligence experience into `main`.

## Result

PR:

```text
#3 — Integrate frozen Today + Project Intelligence experience v1
```

Squash merge commit on `main`:

```text
225cf8dd5c412f9fbf45bd9cbfdbb4a249fe225a
```

From this point forward:

```text
main = current production code source of truth
```

Old prototype branches remain historical references only.

## Integration strategy used

The prototype branch history had diverged heavily from `main` and contained many successful and failed visual experiments.

Instead of merging roughly 181 prototype-history commits, the integration was rebuilt from the then-current `main` and only the final accepted files were assembled.

The integration branch was:

```text
integration/experience-v1
```

It contained two clean commits before squash merge:

1. assemble the accepted experience state;
2. align Daily Synthesis migration history with production.

## Included product areas

- Today production experience
- LAB-03–06 visual source required by Today
- gesture-gated Today stage controller
- Signal Weave
- Daily Synthesis persistence/repository support
- Project Intelligence 01–05
- Project Intelligence idle/capture/refinement layers
- collaborator / agent documentation

## Explicitly excluded experiment areas

- foil renderer
- spectral renderer
- standalone compression artifact renderer
- LAB restore patch layer
- Project Intelligence full Spatial / R3F experiment
- Project Intelligence Kinetic experiment
- broken fake transition-bridge experiment
- old analysis-sheet / synthesis-2d visual experiments

## Verification

### Integration branch before merge

- Vercel Preview: SUCCESS
- TypeScript: SUCCESS
- ESLint: SUCCESS
- Tests: SUCCESS
- Next.js production build: SUCCESS

### `main` after merge

Main commit:

```text
225cf8dd5c412f9fbf45bd9cbfdbb4a249fe225a
```

Checks:

- GitHub Actions Typecheck / Lint / Test / Build: SUCCESS
- Supabase merge check: SUCCESS
- Vercel deployment status: SUCCESS

No browser visual PASS is claimed for the protected integration Preview from the connected automation environment. The product/visual blobs used by the integration came from the previously user-accepted frozen branches rather than being regenerated during integration.

## Supabase migration reconciliation

Production already contained:

```text
20260808144951_daily_synthesis_snapshots
```

Before main merge, repository migration history was aligned to that production version.

The duplicate historical filename:

```text
0016_daily_synthesis_snapshots.sql
```

was not carried into the final main integration.

No database DDL was manually executed as part of this reconciliation.

## Current development rule

New work should follow:

```text
latest main
  ↓
short-lived feature/fix/docs branch
  ↓
Preview + CI
  ↓
PR
  ↓
main
  ↓
Production
```

Do not return to prototype branches as the default development base.

## Remaining repository housekeeping

These tasks are intentionally separate from the integration itself:

- decide whether to close old draft PRs #1 / #2;
- decide which historical prototype branches should be retained or deleted;
- enable appropriate protection/rules for `main` now that collaborators exist;
- update repository homepage URL once the stable Production alias is confirmed;
- optionally add repository description/topics.

These are repository administration tasks and should not change the frozen product experience.
