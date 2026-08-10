# Frontier Radar — Agent Handoff

> Read `docs/START-HERE.md` first.
>
> Updated: 2026-08-10
>
> Current phase: **Today + Project Intelligence experience freeze / integration preparation.**

## 1. Project identity

Frontier Radar is not a generic AI news site.

Product loop:

```text
Discover → Understand → Get Inspired → Build
```

Core behavior:

1. discover unusual/rising frontier projects from multiple sources;
2. rank and personalize without collapsing into a narrow filter bubble;
3. select Today’s 7;
4. synthesize those 7 signals into higher-level patterns;
5. let users inspect individual projects through Project Intelligence;
6. turn understanding into a build/action direction.

Principles:

- Discovery > Search
- Rising > Popular
- Idea Spark > raw popularity
- Projects / demos > passive content when quality is comparable
- Preserve Adjacent / Wildcard exploration
- Animation organizes information; it is not decoration
- Build PASS is not Visual PASS

---

## 2. Current branch reality

Default branch:

```text
main
```

Current frozen experience branches:

```text
proto/today-foil-candy-v4
proto/project-intelligence-rebuild-v1
```

Current accepted Project Intelligence visual code baseline before docs-only updates:

```text
e423b0b0f105b7daa5cc00935e236ea250d6d30e
```

Do not assume the highest commit count means the best/current visual system. The repository contains many failed visual experiments.

Before changing anything:

1. confirm the actual target branch;
2. inspect current code ownership;
3. compare with `main` if the task affects release integration;
4. do not copy an old experiment wholesale because its name sounds newer.

---

## 3. Today contract — frozen baseline

Interaction model:

```text
Hero                continuous
  ↓
Compression         locked stable stage
  ↓ one physical gesture
Today’s 7           locked stable stage
  ↓ one physical gesture
Signal Weave        continuous internal scene
```

Reverse scrolling must be symmetric.

### Today requirements

- Hero remains freely scrubbed.
- Compression and Today’s 7 are stable endpoints.
- One real wheel/trackpad gesture may advance at most one middle stage.
- Trackpad inertia must not skip stages.
- Transition owns input until animation + inertia + cooldown are complete.
- Signal Weave regains continuous scrolling after entry.
- Final synthesis chapter must remain reachable while synthesis data is still loading.

### Today visual ownership

Accepted production identity:

- editorial asymmetric composition
- `06 / Adjacent` = cobalt blue
- `07 / Wildcard` = saturated orange
- LAB-03–06 remain the base visual owner

Do not reintroduce retired production layers:

- foil renderer
- spectral renderer
- standalone compression artifact renderer
- CSS restore layers created only to fight those experiments

These combinations previously caused transparent cards, lost 06/07 colors, reverse-scroll ghosts and CSS ownership conflicts.

Primary Today files:

```text
src/app/today/
src/components/frontier/today-motion-production.tsx
src/components/frontier/today-stage-scroll-controller.tsx
src/components/frontier/today-signal-weave.tsx
src/components/frontier/motion-lab/
src/app/qa/motion-lab/
```

Do not modify scroll and visual systems together unless the root cause clearly crosses both.

---

## 4. Signal Weave contract

Approved direction:

- one interactive synthesis field
- 7 signal ribbons/threads
- 3 synthesized patterns
- Final Take resolves in the same scene
- no black cyberpunk dashboard
- no three-card pattern layout
- no separate Pattern 01 / Pattern 02 / Pattern 03 pages

Interaction:

- threads remain visible enough to preserve 7 → 3 legibility
- hover signal → emphasize relationship
- hover/pin pattern → emphasize cluster
- non-active evidence recedes, does not disappear
- ribbon paths must not destroy destination labels

---

## 5. Project Intelligence contract — frozen baseline

Current sequence:

```text
01 CAPTURE
02 EVIDENCE
03 INTERROGATION
04 RESOLUTION
05 BUILD
```

### 01 Capture

Purpose: create curiosity and make the project feel worth investigating.

Accepted behavior:

- giant editorial headline
- dossier / evidence stack
- subtle foil / paper / cobalt / orange material language
- parallax / cursor / scan response
- strong idle motion even when user stops moving
- transparent site nav integrated into the hero

Do not replace this with a generic 3D world or SaaS hero.

### 02 Evidence

Purpose: answer why the radar believes the project.

- evidence/source objects should remain inspectable
- source traceability matters more than decoration
- not a dashboard or article list

### 03 Interrogation

This is a protected visual anchor.

Accepted identity:

- saturated orange field
- giant background typography
- multiple analysis sheets
- continuous internal scrub
- black sheets approximately `rgba(8,8,8,.65)`
- background remains visible through the sheets
- idle motion continues when input stops

Do not casually redesign this stage.

### 04 Resolution

Purpose: compress evidence + interrogation into a decision.

- 7 score dimensions surround the central verdict
- central `FRONTIER VERDICT`
- score labels must remain clearly readable
- idle attraction / pulse / convergence effects are intentional

This is a decision-resolution scene, not a score dashboard.

### 05 Build

Purpose: move from understanding to action.

- exposes action directions / Idea Lab path
- should feel like a next move, not another explanation page
- maintains idle motion without requiring cursor input

### Current Project Intelligence files

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

## 6. Explicitly rejected Project Intelligence directions

Do not revive these as the default solution:

### Full spatial / R3F world

Branch:

```text
proto/project-intelligence-spatial-v1
```

Why rejected:

- looked like a 3D technical demo
- floating geometry replaced editorial design
- added complexity without improving product meaning

### Kinetic bridge experiment

Branch:

```text
proto/project-intelligence-kinetic-v1
```

Why rejected:

- transition bridges became visible intermediate pages
- large color blocks / fake transition objects broke continuity
- patching the bridge architecture produced CSS complexity

### General lesson

Prefer:

```text
real content + shared continuity + restrained 2.5D + idle motion
```

over:

```text
fake overlay transition page + full-screen effects + complete 3D rewrite
```

---

## 7. Motion design rules

All accepted core scenes should remain alive when idle.

Use motion to express stage semantics:

- Capture → scanning / foil / layered tension
- Evidence → inspection / source motion
- Interrogation → orange field / sheet tension
- Resolution → attraction / convergence / pressure
- Build → directional energy / action readiness

Performance rules:

- pause or reduce idle effects during stage transitions
- avoid simultaneous full-screen blur + clip-path + gradient redraw + WebGL loops
- pointer response should be additive, not the only animation trigger
- prefer transform/opacity for frequent animation
- do not add WebGL unless it explains something that DOM/SVG/CSS cannot

---

## 8. Release / integration discipline

Do **not** directly hard-merge all experimental history into `main`.

Current release problem:

- final experience branches contain long experiment histories
- `main` has moved independently
- Project Intelligence branch is substantially ahead of and also behind `main`

Approved next strategy:

1. create a clean integration branch from latest `main`;
2. inventory final Today + Project Intelligence + synthesis/data changes;
3. bring in only final required files/commits;
4. reconcile docs and migrations intentionally;
5. run full CI;
6. browser QA production-like flows;
7. merge integration branch into `main`;
8. let `main` become the single Production source.

See:

```text
docs/INTEGRATION-PLAN-2026-08-10.md
```

Do not delete historical branches until final tags/checkpoints exist and release integration is complete.

---

## 9. Vercel notes

Known deployment behavior:

- Vercel build success and browser visual success are separate claims.
- Hobby + private repo + collaborator commit author can produce `Deployment Blocked` because of access/identity, even when code is valid.
- Do not change app code to work around a Vercel author-permission block.
- Long-term desired release path is `main → Production`.
- Avoid relying on manually promoted Preview deployments as the permanent source of truth.

---

## 10. Data / recommendation boundaries

Current discovery sources include:

- GitHub
- Hugging Face
- Show HN
- Product Hunt
- arXiv

Today mix:

```text
5 Core + 1 Adjacent + 1 Wildcard
```

Discovery Score concepts:

- Freshness
- Domain Relevance
- Momentum
- Project Health
- Novelty
- Idea Spark
- Tryability

Existing infrastructure includes:

- historical metric snapshots
- behavior events
- Personal Match / semantic profile
- Project Entity / cross-source evidence
- Project Intelligence
- Daily Synthesis

Do not alter scoring/recommendation/data behavior as a side effect of a visual task.

---

## 11. Workflow

Repository uses npm + `package-lock.json`.

```bash
npm install
npm run dev
```

Checks:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Browser QA for motion/visual tasks should include where applicable:

1. forward full path
2. reverse full path
3. slow wheel
4. fast trackpad fling
5. idle 5–10 seconds on each scene
6. resize / target desktop viewport
7. production-data path vs fixture path

If a scenario cannot be tested, report it as **not verified**.

---

## 12. Change discipline

- Understand the owner of a state before adding code.
- Prefer deleting conflicting layers over adding another override.
- Do not refactor unrelated subsystems.
- Do not modify secrets or user environment files.
- Do not force-push unless explicitly requested.
- Do not claim visual PASS from TypeScript/build success.
- Do not claim Production PASS from fixture-only testing.
- State root cause, changed files, verification and commit SHA at handoff.
- Respect frozen stages; fix bugs incrementally instead of reopening design without a product reason.
