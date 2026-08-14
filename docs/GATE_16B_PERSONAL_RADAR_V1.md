# Gate 16B — Personal Radar v1

Status: DRAFT / awaiting owner visual acceptance

## Objective

Build a truthful Personal Radar surface that explains the behavioral evidence currently shaping this browser's Frontier Radar profile without claiming semantic proximity, long-term history, or stable personality inference.

The accepted direction for visual QA is **one profile / one canvas / three views**. Personal Radar must not become a stack of separate chart pages.

## Frozen boundaries

This Gate must not redesign or reopen accepted Explore, Project, Today, Saved, or Idea Lab compositions. It must not merge, deploy to Production, or add the Personal Radar route to the global navigation before explicit owner approval.

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

No separate full-page F5 section, F8 section, or repeated evidence page is allowed in this Gate.

## Lieflat G9 contract — one profile, three views

Upstream reference: Lieflat Glance G9 Scatter Morph, used because continuous identity-preserving transition is the interaction requirement that Basics does not provide.

Core upstream behavior retained:

- one stable series identity;
- stable `groupId` for each interest dimension;
- `universalTransition: true`;
- `animationDurationUpdate: 1100`;
- `animationEasingUpdate: cubicInOut`;
- `replaceMerge: [xAxis, yAxis, series]`;
- automatic view rotation every 3 seconds when reduced motion is not requested.

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

- Same interest dimensions.
- X = recency freshness.
- Y = evidence confidence.
- Freshness does not imply preference strength.

### Identity continuity

An interest must keep its semantic identity through all three views. `groupId` and its visual identity color remain stable during the morph. The strongest live-signal interest uses the restrained cobalt research accent; other interests remain on the neutral ink ladder.

### Dense truthful plotting

Axes may use truthful data-dependent ranges when a fixed global range would create large empty regions and harm reading. The range must never alter the underlying value or imply unavailable evidence.

The supporting evidence ledger is compact and subordinate to the main canvas. It may show signed signal, evidence count, and freshness without creating another full-height section.

## Motion accessibility

- `prefers-reduced-motion` disables automatic cycling and uses zero-duration chart updates.
- Manual Strength / Evidence / Freshness selection remains available.
- A manual selection temporarily pauses automatic rotation so the user can inspect the chosen view.

## Preview visual-QA mode

`/radar?demo=evidence` may expose a synthetic evidence-qualified profile only in Preview, fixture, or development environments.

Requirements:

- It must be visibly labeled `PREVIEW QA / SYNTHETIC`.
- It must never be presented as the user's real profile.
- Production must ignore the demo parameter.
- Ordinary `/radar` always reads the real current browser profile.
- Synthetic freshness values may be deliberately distributed to test all three G9 geometries; this is visual-QA data only and must remain explicitly synthetic.

This mode exists because Preview integrity policy intentionally prevents Preview interactions from training Production personalization data.

## Visual language

`Frontier Intelligence × Physical Archive × Research Instrument`

- Paper: `#F0EFEB`.
- Mono information hierarchy.
- Restrained cobalt research accent.
- No literal radar chart.
- No generic SaaS card dashboard.
- No fabricated historical trend.
- Desktop target is one dominant instrument viewport with minimal vertical continuation, not multiple chart pages.

## Acceptance conditions

Machine acceptance requires:

- TypeCheck PASS.
- ESLint PASS.
- Unit tests PASS.
- Fixture build PASS.
- App start PASS.
- ECharts canvas loads in the browser QA.
- Strength → Evidence → Freshness manual view switching PASS on the same page.
- No horizontal overflow.
- Preview deployment corresponds to the current branch head.

Final visual acceptance requires owner review of the real browser Preview. Until that happens, Gate 16B remains DRAFT and the route stays out of the global navigation.
