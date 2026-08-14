# Gate 16B — Personal Radar v1

Status: DRAFT / awaiting owner visual acceptance

## Objective

Build a truthful Personal Radar surface that explains the behavioral evidence currently shaping this browser's Frontier Radar profile without claiming semantic proximity, long-term history, or stable personality inference.

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

No learned-evidence claim. Show the product starting prior and clearly identify it as a default.

### FORMING

Show live learned evidence with Lieflat Basics F5 Tick Rows.

### EVIDENCE-QUALIFIED

Show F5 Tick Rows plus Lieflat Basics F8 Plumb Scatter.

The evidence-qualified state requires enough independent evidence before the stronger comparison view is allowed.

## Lieflat semantics

### F5 Tick Rows

- One visible tick represents one contributing behavioral event.
- Every fifth event receives the upstream-style dot marker.
- Row order follows the current signed behavior signal.

### F8 Plumb Scatter

- One dot represents one interest dimension.
- X = signed live behavior signal.
- Y = evidence confidence.
- Plumb line grounds the point to the measurement floor.
- Position does not claim semantic similarity.

G9 Scatter Morph remains out of scope until this v1 surface passes runtime and owner visual acceptance.

## Preview visual-QA mode

`/radar?demo=evidence` may expose a synthetic evidence-qualified profile only in Preview, fixture, or development environments.

Requirements:

- It must be visibly labeled `PREVIEW QA / SYNTHETIC`.
- It must never be presented as the user's real profile.
- Production must ignore the demo parameter.
- Ordinary `/radar` always reads the real current browser profile.

This mode exists because Preview integrity policy intentionally prevents Preview interactions from training Production personalization data.

## Visual language

`Frontier Intelligence × Physical Archive × Research Instrument`

- Paper: `#F0EFEB`.
- Mono information hierarchy.
- Restrained cobalt research accent.
- No literal radar chart.
- No generic SaaS card dashboard.
- No fabricated historical trend.

## Acceptance conditions

Machine acceptance requires:

- TypeCheck PASS.
- ESLint PASS.
- Unit tests PASS.
- Fixture build PASS.
- App start PASS.
- Personal Radar browser QA PASS.
- No horizontal overflow.
- Preview deployment corresponds to the current branch head.

Final visual acceptance requires owner review of the real browser Preview. Until that happens, Gate 16B remains DRAFT and the route stays out of the global navigation.
