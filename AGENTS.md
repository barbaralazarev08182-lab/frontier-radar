# Frontier Radar — Agent Handoff

> Read `docs/START-HERE.md` first.
>
> Updated: 2026-08-10  
> Current phase: **experience v1 integrated into `main`; Today + Signal Weave + Project Intelligence are frozen baselines.**

## 1. Source of truth

Default working baseline:

```text
main
```

Main integration commit:

```text
225cf8dd5c412f9fbf45bd9cbfdbb4a249fe225a
```

Do not default to old `proto/*` branches even when they have more commits. They are historical references / failed experiments unless the user explicitly asks to inspect them.

New work should normally start from latest `main` on a short-lived feature/fix/docs branch.

---

## 2. Product identity

Frontier Radar is not a generic AI news site.

Product loop:

```text
Discover → Understand → Get Inspired → Build
```

Principles:

- Discovery > Search
- Rising > Popular
- Idea Spark > raw popularity
- Projects / demos > passive content when quality is comparable
- Preserve Adjacent / Wildcard exploration
- Animation organizes information; it is not decoration
- Build PASS is not Visual PASS

---

## 3. Today contract — frozen

```text
Hero                continuous
  ↓
Compression         locked stable stage
  ↓ one physical gesture
Today’s 7           locked stable stage
  ↓ one physical gesture
Signal Weave        continuous internal scene
```

Requirements:

- one physical wheel/trackpad gesture advances at most one middle stage
- inertia cannot skip a stage
- transition owns input until animation + gesture tail + cooldown finish
- reverse direction is symmetric
- final synthesis chapter remains structurally reachable while synthesis data loads

Accepted visual ownership:

- original LAB-03–06 production chain
- 06 / Adjacent = cobalt blue
- 07 / Wildcard = saturated orange

Retired production layers — do not restore:

- foil renderer
- spectral renderer
- standalone compression artifact renderer
- LAB restore/override layers created only to fight those experiments

Primary files:

```text
src/app/today/
src/components/frontier/today-motion-production.tsx
src/components/frontier/today-stage-scroll-controller.tsx
src/components/frontier/today-signal-weave.tsx
src/components/frontier/motion-lab/
src/app/qa/motion-lab/
```

Do not change scroll + visual + data in one patch unless the root cause demonstrably crosses them.

---

## 4. Signal Weave contract — frozen

Approved model:

```text
7 signal ribbons/threads
  ↓
3 synthesized patterns
  ↓
Final Take in the same scene
```

Do not regress to:

- three ordinary pattern cards
- separate Pattern 01/02/03 pages
- black cyberpunk dashboard
- giant typography replacing relationship structure

Preserve contextual relationships while highlighting active signal/pattern evidence.

---

## 5. Project Intelligence contract — frozen

```text
01 CAPTURE
02 EVIDENCE
03 INTERROGATION
04 RESOLUTION
05 BUILD
```

### Capture

- giant editorial hero
- dossier/evidence stack
- material + scan + parallax response
- idle motion continues without pointer input
- transparent site nav integration

### Evidence

- explain why Radar believes the project
- source traceability > decorative effects

### Interrogation

Protected visual anchor:

- saturated orange field
- giant background type
- continuous analysis sheets
- sheets approximately `rgba(8,8,8,.65)`
- background visible through sheets
- internal scrub + idle motion

Do not casually redesign this stage.

### Resolution

- decision-resolution scene, not a score dashboard
- 7 score dimensions around central verdict
- score labels remain at current enlarged readable size
- convergence / attraction / pressure idle motion

### Build

- move understanding toward action / Idea Lab
- maintain directional idle energy

Primary files:

```text
src/app/project/[id]/page.tsx
src/app/project/[id]/layout.tsx
src/app/project/[id]/project-intelligence.css
src/app/project/[id]/project-intelligence-effects.css
src/app/project/[id]/project-intelligence-capture.css
src/app/project/[id]/project-intelligence-refinements.css
src/components/frontier/project-intelligence-motion.tsx
```

---

## 6. Rejected experiment directions

Historical only:

```text
proto/project-intelligence-spatial-v1
proto/project-intelligence-kinetic-v1
```

Do not copy them back wholesale.

Lessons:

- full R3F world became a technical demo instead of editorial product design
- fake transition bridge became visible intermediate pages
- stacking CSS fixes around bad ownership created regressions

Prefer:

```text
real content
+ shared continuity
+ restrained 2.5D
+ meaningful idle motion
```

---

## 7. Motion/performance rules

All core stages should remain alive while idle, but motion must have semantic purpose.

- Capture → scanning/material tension
- Evidence → inspection/source motion
- Interrogation → field/sheet tension
- Resolution → convergence/pressure
- Build → directional readiness

Performance:

- pause/reduce idle motion during transitions
- avoid simultaneous full-screen blur + clip-path + gradient redraw + WebGL loops
- pointer interaction is additive, not the only animation source
- prefer transform/opacity for frequent motion
- add WebGL only when it expresses something DOM/SVG/CSS cannot

---

## 8. Data / migration boundary

Production migration history includes:

```text
20260808144951_daily_synthesis_snapshots
```

Repository history is aligned to this version.

Do not recreate a second `0016_daily_synthesis_snapshots` migration.

Current discovery sources:

- GitHub
- Hugging Face
- Show HN
- Product Hunt
- arXiv

Today mix:

```text
5 Core + 1 Adjacent + 1 Wildcard
```

Do not alter ranking/scoring/data behavior as a side effect of visual work.

---

## 9. Development workflow

```bash
npm install
npm run dev
```

Before completion:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Preferred delivery:

```text
latest main
  ↓
short-lived feature/fix/docs branch
  ↓
Vercel Preview
  ↓
PR + CI
  ↓
main
  ↓
Production
```

No force-push unless repository owner explicitly requests it.

---

## 10. Browser QA is mandatory for motion/visual changes

For Today where relevant verify:

1. Hero
2. Hero exit
3. Compression stable frame
4. Compression → Today’s 7
5. Today’s 7 stable frame
6. Today’s 7 → Signal Weave
7. Weave internal scroll
8. full reverse path
9. slow precision scrolling
10. fast trackpad fling / inertia

For Project Intelligence verify:

1. 01 Capture stable + idle
2. 01 → 02
3. 02 Evidence stable + idle
4. 02 → 03
5. 03 internal scrub
6. 03 → 04
7. 04 Resolution stable + idle
8. 04 → 05
9. 05 Build stable + idle
10. reverse 05 → 01

If protected Preview or production data prevents testing, report **not verified**. Never convert machine/build success into a visual PASS claim.

---

## 11. Scope discipline

- Understand state ownership before adding code.
- Prefer removing conflicts over adding higher-specificity overrides.
- Do not refactor unrelated stable subsystems.
- Do not expose or modify secrets.
- Do not revive archived experiments without explicit product intent.
- Do not treat old prototype branches as current truth.
- State root cause, changed files, verification and commit SHA at handoff.

Reference:

- `docs/START-HERE.md`
- `docs/checkpoints/2026-08-10-experience-freeze.md`
- `docs/checkpoints/2026-08-10-main-integration.md`
