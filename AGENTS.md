# Frontier Radar — Agent Handoff

> Read `docs/START-HERE.md` first. This file is the coding-agent-specific contract.
>
> Updated: 2026-08-10

## Project identity

Frontier Radar is not a generic AI news site.

The core product idea is:

1. discover unusual/rising frontier projects from multiple sources;
2. rank and personalize them without collapsing into a narrow filter bubble;
3. select **Today’s 7**;
4. synthesize those 7 signals into higher-level directions/patterns;
5. turn discovery into understanding, inspiration and eventually building.

Product loop:

`Discover → Understand → Get Inspired → Build`

Key principles:

- Discovery > Search
- Rising > Popular
- Idea Spark > raw popularity
- Projects / demos > passive content when quality is comparable
- Preserve Adjacent / Wildcard exploration
- Animation organizes information; it is not decoration
- Build PASS is not Visual PASS

---

## Current active branch

Current Today integration branch:

```text
proto/today-foil-candy-v4
```

Important implementation baselines:

- `c634cd47fc00ea10fad586f6660e3194badf072f`
  - removed later foil/spectral/compression artifact pollution from production
  - restored original LAB-03–06 ownership
  - restored 06 blue / 07 orange
- `e2e036825b2dd0a555cde7d83c180fa5c4d86069`
  - gesture-gated middle-stage scroll state machine
- `d28960ea8a2fa9b478495a15a8399d526edd3f54`
  - empty Vercel preview trigger, no code diff

Docs-only commits after these do not imply app behavior changes.

Before modifying anything, confirm the actual branch/HEAD and inspect the diff rather than assuming HEAD semantics from commit order alone.

---

## Current `/today` chapter contract

Intended interaction model:

```text
Hero                continuous scroll
  ↓
Compression         locked stable stage
  ↓ one physical gesture
Today’s 7           locked stable stage
  ↓ one physical gesture
Signal Weave        continuous internal scroll
```

Reverse scrolling must be symmetric.

### Scroll requirements

- Hero remains freely scrubbed by scroll.
- Compression and Today’s 7 are stable endpoints, not accidental interpolation frames.
- One real wheel/trackpad gesture may advance at most one middle stage.
- Trackpad inertia must not skip a stage.
- A transition owns input until animation + gesture inertia + cooldown are complete.
- Signal Weave regains continuous scrolling after entry.
- Do not implement `one wheel event = one stage`; physical gestures emit many wheel events.

Primary files:

- `src/components/frontier/today-stage-scroll-controller.tsx`
- `src/components/frontier/today-motion-production.tsx`
- `src/components/frontier/motion-lab/motion-lab-direct-handoff.tsx`

Do not modify scroll and visual systems in the same patch unless the root cause demonstrably crosses both.

---

## Current Today visual baseline

Production Today must be driven by the original Motion Lab visual chain, especially LAB-03–06.

The accepted identity includes:

- editorial asymmetric composition
- strong hierarchy rather than generic card-grid layout
- 06 / Adjacent = cobalt blue identity
- 07 / Wildcard = saturated orange identity
- LAB-06 anomaly behavior remains meaningful

### Important cleanup already completed

Later experiments previously loaded at the same time as LAB-03–06:

- foil renderer
- spectral renderer
- standalone compression artifact renderer
- restore/override CSS added to fight those experiments

That combination caused high-specificity CSS conflicts, transparent compression cards, lost 06/07 colors, and foil ghosts during reverse scrolling.

**Do not reintroduce these retired production layers.**

Do not solve a visual conflict by stacking another high-specificity override. Find which renderer/style owns the state and remove the conflicting owner.

---

## Signal Weave direction — approved

The old Analysis Sheet / black dashboard / multi-page pattern experiments were rejected.

The approved analysis direction is **Signal Weave**:

- one luminous interactive analysis field
- 7 signal ribbons/threads form 3 synthesized patterns
- light pearl / ice-silver / restrained cool material language
- no black cyberpunk dashboard
- no three-card pattern layout
- no separate `Pattern 01 → Pattern 02 → Pattern 03` pages
- no giant typography used as a substitute for structure
- final take resolves in the same scene

The purpose is to make the user **see relationships forming** between the 7 signals and the synthesized directions.

### Interaction model

- threads remain continuously visible enough to preserve 7 → 3 legibility
- hover a signal: emphasize its thread / relationship
- hover or pin a pattern: emphasize the cluster
- non-active evidence recedes but does not disappear
- selected ribbon must not become a giant visual highway
- ribbon paths must not cut destructively through destination labels
- final take is the resolution of the same scene, not another page

### Fixture pattern semantics

These originated in the Motion Lab fixture; real production synthesis may replace copy/content while preserving the relationship model.

Pattern 01 — `AGENT INFRASTRUCTURE`

- agents moving toward memory / orchestration / runtimes / infrastructure

Pattern 02 — `LOCAL / NATIVE`

- early formation
- visually sparse / less mature than the other patterns

Pattern 03 — `INTERFACE / INSTRUMENT`

- interaction becoming product structure
- Adjacent retains cold-blue identity
- Wildcard retains orange/anomaly identity

---

## Current known issue: production Weave gate

A production regression is still under investigation.

Current production code may gate all of the following on the Daily Synthesis `snapshot`:

- `canEnterWeave`
- `MotionLabDirectHandoff`
- the `TodaySignalWeave` portal itself

A real local environment has also shown a Supabase query error. Therefore, if the last page is missing, first distinguish:

1. snapshot is null and Weave was never mounted;
2. snapshot exists but scroll/handoff cannot enter;
3. both are involved.

Do **not** blindly fix this by:

- hardcoding `canEnterWeave=true`
- inventing/faking a snapshot
- changing Signal Weave visual CSS
- restoring an old wheel listener without understanding duplicate gesture consumption

Diagnose DOM mount state, synthesis state, `data-scroll-stage`, `data-direct-handoff`, raw progress and handoff variables first.

---

## Product/data context

Current discovery sources include:

- GitHub
- Hugging Face (Spaces-first)
- Show HN
- Product Hunt feed
- arXiv

Today’s default mix:

```text
5 Core + 1 Adjacent + 1 Wildcard
```

Public Discovery Score uses the concepts:

- Freshness
- Domain Relevance
- Momentum
- Project Health
- Novelty
- Idea Spark
- Tryability

There is also existing infrastructure for:

- historical metric snapshots
- behavioral events
- Personal Match / semantic profile
- Project Entity / cross-source evidence
- Project Intelligence detail
- Daily Synthesis

Do not alter scoring/recommendation/data behavior as a side effect of a Today visual task.

---

## Primary implementation areas

Production Today:

- `src/app/today/`
- `src/components/frontier/today-motion-production.tsx`
- `src/components/frontier/today-stage-scroll-controller.tsx`
- `src/components/frontier/today-signal-weave.tsx`

Motion Lab / visual source:

- `src/components/frontier/motion-lab/motion-lab.tsx`
- `src/components/frontier/motion-lab/motion-lab-direct-handoff.tsx`
- `src/app/qa/motion-lab/`

Data / recommendation:

- `src/lib/collectors/`
- `src/lib/scoring/`
- `src/lib/feed/`
- `src/lib/ai/`
- `src/lib/db/repositories/`
- `src/lib/supabase/`

Project context:

- `docs/START-HERE.md`
- `docs/checkpoints/2026-08-08-frontier-radar-checkpoint.md`

---

## Visual design constraints

Avoid reintroducing:

- generic landing-page / SaaS-dashboard aesthetics
- generic glassmorphism
- excessive blur / bloom / fog glows
- black cyberpunk dashboard styling
- decorative particles with no semantic role
- generic card-grid treatment as the main composition
- giant poster typography replacing interaction design
- WebGL solely to make the page feel “premium”

Prefer:

- clear hierarchy
- strong editorial composition
- stable stage endpoints
- meaningful motion
- material effects only when they explain state/identity
- legibility under motion
- continuity between Today’s 7 and Signal Weave

---

## Workflow

This repository uses **npm** and `package-lock.json`.

```bash
npm install
npm run dev
```

Useful routes:

```text
http://localhost:3000/today
http://localhost:3000/qa/motion-lab
```

Before completing a change:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

### Browser QA is mandatory for motion/visual tasks

For Today changes, verify the actual browser sequence where applicable:

1. Hero
2. Hero exit
3. Compression stable frame
4. Compression → Today’s 7
5. Today’s 7 stable frame
6. Today’s 7 → Signal Weave
7. Weave internal scroll
8. full reverse path
9. slow wheel/trackpad
10. fast fling / inertia behavior

If production data prevents a scenario from being tested, report that scenario as **not verified**. QA fixture success is useful evidence but is not equivalent to production-data success.

---

## Change discipline

- Understand the existing owner of a state before adding code.
- Prefer removing conflicting layers over adding another override layer.
- Do not refactor unrelated subsystems.
- Do not modify secrets or user environment files.
- Do not force-push unless the repository owner explicitly requests it.
- Do not claim visual PASS from TypeScript/build success.
- Do not claim production PASS from fixture-only testing.
- State exact root cause, changed files, verification and commit SHA at handoff.

If something cannot be verified, say so explicitly.
