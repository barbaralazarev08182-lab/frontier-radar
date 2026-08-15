# Gate 16B — Personal Radar v1

Status: OWNER VISUAL PASS / FINAL / FROZEN

## Objective

Build a truthful Personal Radar surface that explains the behavioral evidence currently shaping this browser's Frontier Radar profile without claiming semantic proximity, long-term history, or stable personality inference.

The owner-accepted direction is **one profile / one canvas / three views**. Personal Radar must not become a stack of separate chart pages.

## Final acceptance

Owner browser review: **PASS** on 2026-08-15.

Accepted Preview head: `d44e82822861ac961dabb351e9fd2405c4e98815`.

The following Personal Radar composition is now FINAL / FROZEN unless the owner explicitly reopens it:

- single-view desktop research-instrument composition;
- redesigned hero / confidence console;
- dense calibration scale under Profile Confidence;
- Strength / Evidence / Freshness identity-preserving morph;
- F11-style freshness rung treatment;
- left mode rail and fixed control geometry;
- chart ↔ evidence-ledger hover linkage;
- Project-derived pale cyan / cobalt / pink film accents and restrained foil motion;
- single desktop viewport with no page-level horizontal or vertical overflow;
- current typography, structural-line hierarchy, and interaction rhythm.

Do not continue opportunistic visual polish after this acceptance.

## Frozen boundaries

This Gate must not redesign or reopen accepted Explore, Project, Today, Saved, or Idea Lab compositions. It must not merge, deploy to Production, or add the Personal Radar route to the global navigation without explicit owner approval.

## Data contract

- Read-only Personal Radar API.
- Visitor reads are bound to the current browser visitor identity.
- A fresh visitor with no historical events may establish its own cold-start binding.
- Historical visitor data cannot be read by supplying an arbitrary UUID without the matching browser binding.
- The profile is derived from up to 200 feedback events.
- Interest dimensions reuse the same `vectorizeItem()` feature definition used by personalization ranking.
- Per-dimension live signal is derived from event strength × event recency × item feature weight.
- The existing 21 `interest-keyword-v1` dimensions are retained.
- Cold-start prior is kept separate from learned behavior.
- Negative evidence stays negative.
- The Personal Radar read path performs no ranking mutation and no database write.

## Adaptive states

### COLD START

No learned-evidence claim. Show the product starting prior and clearly identify it as a default. Do not fabricate a morph before learned evidence exists.

### FORMING / EVIDENCE-QUALIFIED

Use one integrated Personal Radar instrument. The same learned interest identities remain present while the user changes how they are measured.

No separate full-page F5 section, F8 section, or repeated evidence page is allowed.

## Lieflat contract — one profile, three views

Primary upstream interaction reference: Lieflat Glance G9 Scatter Morph, used because continuous identity-preserving transition is the interaction requirement that Basics does not provide.

Freshness view additionally uses the Lieflat F11 Tick Gauge / small-multiple reading grammar so the third view is visibly distinct without changing freshness semantics.

Core behavior retained:

- one stable series identity;
- stable `groupId` for each interest dimension;
- `universalTransition: true` for the interest entities;
- cubic identity-preserving morph motion;
- automatic view rotation every 3 seconds when reduced motion is not requested;
- axes / guide framework settle independently rather than participating in distracting geometric morphs.

### 01 STRENGTH

- Same interest dimensions.
- X = signed live behavior signal.
- Y = evidence confidence.
- Dot size retains evidence volume.

### 02 EVIDENCE

- Same interest dimensions and same `groupId` identities.
- The entities morph into bars rather than becoming a separate chart page.
- Bar height = count of contributing feedback events.
- No percentage normalization is invented.

### 03 FRESHNESS

- Same interest dimensions and stable identity colors.
- Freshness is read as horizontal gauge / rung position from 0–100%.
- The endpoint remains the interest entity; confidence can remain visible through endpoint sizing where applicable.
- Freshness does not imply preference strength.

### Identity continuity

An interest must keep its semantic identity through all three views. `groupId` and its visual identity color remain stable during the morph. The strongest live-signal interest uses the restrained cobalt research accent; other interests remain on the neutral ink ladder.

### Dense truthful plotting

Axes may use truthful data-dependent ranges when a fixed global range would create large empty regions and harm reading. The range must never alter the underlying value or imply unavailable evidence.

The supporting evidence ledger is compact and subordinate to the main canvas. It shows signed signal, evidence count, and freshness without creating another full-height section.

## Interaction contract

- Selecting Strength / Evidence / Freshness changes the same instrument rather than navigating or replacing the page.
- Manual selection temporarily pauses auto rotation.
- Left-side controls must not move vertically as changing copy reflows.
- Hovering a chart entity highlights the corresponding evidence-ledger row.
- Hovering / focusing a ledger row highlights the matching chart entity and exposes the mini interest dossier.
- Interaction focus may pause the automatic morph while the user inspects an entity.
- The interface must preserve keyboard focus and reduced-motion accessibility.

## Hero / confidence console contract

The accepted hero is part of the same Research Instrument grammar as the main workspace, not a separate marketing card.

- Large title and confidence console are horizontally pulled toward opposite edges to align with the instrument below.
- Profile Confidence remains the dominant right-side readout.
- The calibration meter is long, dense, and uses short minor ticks plus longer major ticks.
- The current confidence position is marked in cobalt.
- The hero may use restrained cyan / cobalt / pink Project-derived film accents, calibration rails, corner guides, and low-frequency foil sweeps.
- Paper remains stable; decorative motion must not animate the page background itself.

## Motion accessibility

- `prefers-reduced-motion` disables automatic cycling and decorative sweeps where appropriate.
- Manual Strength / Evidence / Freshness selection remains available.
- A manual selection temporarily pauses automatic rotation so the user can inspect the chosen view.

## Preview visual-QA mode

`/radar?demo=evidence` may expose a synthetic evidence-qualified profile only in Preview, fixture, or development environments.

Requirements:

- It must be visibly labeled `PREVIEW QA / SYNTHETIC`.
- It must never be presented as the user's real profile.
- Production must ignore the demo parameter.
- Ordinary `/radar` always reads the real current browser profile.
- Synthetic freshness values may be deliberately distributed to test all three geometries; this is visual-QA data only and must remain explicitly synthetic.

This mode exists because Preview integrity policy intentionally prevents Preview interactions from training Production personalization data.

## Visual language

`Frontier Intelligence × Physical Archive × Research Instrument`

- Paper: `#F0EFEB`.
- Mono information hierarchy.
- Restrained cobalt research accent.
- Pale Project-derived cyan / cobalt / pink film accents are allowed only as low-opacity instrumentation layers.
- Structural lines have explicit hierarchy: primary boundaries must read clearly; secondary grid lines remain subordinate.
- No literal radar chart.
- No generic SaaS card dashboard.
- No fabricated historical trend.
- Desktop target is one dominant instrument viewport with minimal vertical continuation, not multiple chart pages.

## Machine acceptance

Final owner-accepted head: `d44e82822861ac961dabb351e9fd2405c4e98815`.

GitHub Actions Integration QA run `31863415612`: **PASS**.

Verified in that run:

- TypeCheck PASS.
- ESLint PASS.
- Unit tests PASS.
- Fixture build PASS.
- App start PASS.
- ECharts canvas load PASS.
- Strength → Evidence → Freshness manual view switching PASS on the same page.
- Chart ↔ Evidence Ledger interaction regression remains covered by the Personal Radar browser gate.
- Left mode controls retain stable vertical positions through view changes.
- Desktop page-level horizontal overflow ≤ 1px.
- Desktop page-level vertical overflow ≤ 1px.
- Browser screenshot artifact generated successfully.

Vercel Preview for the accepted head reached READY before owner acceptance.

## Product status after acceptance

Gate 16B is **FINAL / FROZEN at the product level**.

PR #39 remains open/draft. No merge or Production deployment is implied by visual acceptance. Personal Radar stays out of global navigation until separately approved.
