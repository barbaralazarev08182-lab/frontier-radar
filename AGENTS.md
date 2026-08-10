# Frontier Radar — Agent / Collaborator Handoff

> Read `docs/START-HERE.md` first. This file is the operational contract for Codex / local coding agents and collaborators.

## Project identity

Frontier Radar is a personalized discovery engine for things being built at the frontier of technology.

It is not a generic AI news site or a GitHub leaderboard.

Core product chain:

```text
Discover → Understand → Get Inspired → Build
```

Current Today experience:

```text
Hero → Compression → Today’s 7 → Signal Weave
```

## Branch discipline

- `main` = repository entry / relatively stable baseline.
- Current Today motion/visual/scroll integration work lives on `proto/today-foil-candy-v4` unless the user explicitly changes scope.
- Before modifying anything, confirm the current branch and HEAD.
- Do not assume the newest docs-only HEAD is the newest functional code baseline.
- Never force-push unless the repository owner explicitly asks.

## Today visual baseline

The accepted baseline is the original Motion Lab / LAB-03–06 visual system.

Important identities:

- Adjacent = strong blue visual identity.
- Wildcard = strong orange visual identity.
- Compression uses the original deck/signal system.
- Today’s 7 uses the LAB-06 editorial composition.

Do not reintroduce the later production experiments that were removed because they polluted the render chain:

- foil renderer
- spectral renderer
- standalone compression artifact renderer
- extra restore/override CSS layers added only to fight those experiments

A previous failure mode was multiple high-specificity CSS systems overriding each other. Do not fix this by stacking more `!important` rules. Find the actual owner of the visual state and remove the conflict at the source.

## Scroll contract

The intended state model is:

```text
Hero = continuous scroll
Compression = locked stage
Today’s 7 = locked stage
Signal Weave = continuous scroll
```

Middle stages are gesture-driven:

- one physical wheel / trackpad gesture → at most one stage transition
- transition owns input while moving
- inertial wheel events must not skip a stage
- reverse direction should be symmetric
- Hero remains freely scrubbed
- Weave remains freely scrubbed once entered

Primary files:

- `src/components/frontier/today-stage-scroll-controller.tsx`
- `src/components/frontier/today-motion-production.tsx`
- `src/components/frontier/motion-lab/motion-lab-direct-handoff.tsx`

Do not modify LAB CSS while solving scroll unless browser evidence proves a visual-state dependency.

## Signal Weave

Signal Weave is the approved analysis direction:

- one unified field
- 7 signal ribbons / threads → 3 synthesized patterns
- hover / pin emphasizes evidence relationships
- inactive context may recede but must remain legible
- Final Take resolves inside the same scene

Avoid:

- three-card analysis layouts
- multi-page Pattern 01/02/03 navigation for basic understanding
- black cyberpunk dashboard styling
- giant poster typography as a substitute for structure
- decorative particles / bloom with no semantic purpose

## Known production issue

There is an unresolved production entry issue around the final Weave scene.

Current code may gate all of these on Daily Synthesis `snapshot`:

- `canEnterWeave`
- `MotionLabDirectHandoff`
- mounting `TodaySignalWeave`

If `snapshot` fails because of the real data/Supabase path, the final scene may structurally disappear.

When investigating, distinguish:

1. snapshot is null and the scene never mounts;
2. snapshot exists but scroll/handoff never enters;
3. both.

Do not hide this by hard-coding `canEnterWeave=true`, fabricating production data, or redesigning Weave.

## Product / ranking context

Today is designed around up to 7 picks with the exploration mix:

```text
5 Core + 1 Adjacent + 1 Wildcard
```

The public Discovery Score emphasizes:

1. Freshness
2. Domain Relevance
3. Momentum
4. Project Health
5. Novelty
6. Idea Spark
7. Tryability

Personal Match is a user-level reranking signal rather than a public score component.

Current sources include GitHub, Hugging Face, Show HN, Product Hunt and arXiv.

## Development workflow

Repository uses npm and `package-lock.json`.

```bash
npm install
npm run dev
```

Useful routes:

```text
http://localhost:3000/today
http://localhost:3000/qa/motion-lab
```

Before declaring a task complete, run when practical:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Do not expose or commit secrets. Never overwrite `.env.local` unless explicitly instructed.

## Browser QA contract

Build success is not visual success.

For Today changes, verify the actual browser path that the change affects. For scroll work, check at minimum:

```text
Hero
↓
Compression stable frame
↓
Today’s 7 stable frame
↓
Signal Weave
↓
reverse all the way back
```

Also test a fast precision-trackpad fling when scroll logic changes.

For visual changes, inspect the whole frame for regressions rather than only the single symptom reported by the user.

## Scope discipline

- Solve the root cause, not the screenshot symptom.
- One task should change one conceptual layer where possible.
- Do not modify recommendation/data logic during visual work.
- Do not modify visual language during scroll work.
- Do not refactor stable modules just because a cleaner architecture is imaginable.
- Do not silently revive archived experiments.
- Do not claim browser PASS when only tests/build passed.

## Required handoff after a change

Report:

1. exact root cause;
2. files changed;
3. what behavior changed;
4. browser verification performed;
5. typecheck/lint/tests/build results;
6. anything not verified and why;
7. commit SHA.

## Important historical checkpoints

- `c634cd47fc00ea10fad586f6660e3194badf072f`
  - removed foil/spectral/compression-artifact pollution from production
  - restored LAB-06 blue/orange visual baseline
- `e2e036825b2dd0a555cde7d83c180fa5c4d86069`
  - introduced the explicit middle-stage gesture scroll state machine

For full product context, read `docs/START-HERE.md` and the latest checkpoint under `docs/checkpoints/`.
