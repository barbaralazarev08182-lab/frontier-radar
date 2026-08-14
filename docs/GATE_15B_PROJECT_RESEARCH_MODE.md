# Gate 15B — Project Research Mode

Status: OWNER VISUAL PASS / FROZEN PENDING EXPLICIT MERGE

## Closure record — 2026-08-14

Owner visual acceptance was explicitly given after reviewing the live Vercel Preview.

This acceptance closes the current desktop visual work for both:

- **Project Research Mode** in Gate 15B
- the owner-approved **narrow Explore surface/readability/motion exception** carried on the same stacked branch

Accepted Explore exception scope:
- Project-matched paper/base surface (`#F0EFEB`)
- existing cobalt/blue perimeter artwork preserved
- larger L12 typography and wider usable field
- helper strips removed from the rendered composition
- Focus Aperture open transition
- wheel / trackpad and keyboard focus-switch transition
- no change to L12 ranking semantics, Global Score semantics, tag-family semantics, Focus Aperture actions, or core data contract

Latest accepted interaction commit in the chain:

```text
bca10c38fac7282f53432e6b19afac5e5d2707b1
Explore: add focus and wheel transition motion
```

Latest accepted branch Preview also contains the subsequent documentation-only commit:

```text
22751a8d868ac72d579aa5f6b1e0251941dbf238
docs: codify Frontier Radar design and Lieflat standard
```

Verification for the accepted motion change:

```text
Integration QA #110
TypeCheck PASS
ESLint PASS
Unit tests PASS
Fixture build PASS
Browser integration gate PASS
Owner Visual PASS
```

Freeze rule:

> Do not continue polishing Explore or Project after this acceptance unless the owner explicitly reopens a new scope.

This closure **does not authorize merge or Production deployment**. PR #36 may remain Open/Draft until the owner explicitly requests merge/release handling.

---

## Objective

Preserve the protected Project Intelligence stage contract while replacing cinematic scroll control with a skimmable research document.

Protected order:

1. `01 CAPTURE`
2. `02 EVIDENCE`
3. `03 INTERROGATION`
4. `04 RESOLUTION`
5. `05 BUILD`

Do not rename, remove, merge, or reorder these stages.

## Current UX obstruction

The prior client controller globally set `html/body` overflow to hidden and captured wheel gestures with `preventDefault()`. One gesture advanced one stage / record. This created cinematic pacing but blocked normal research behavior: skim, jump, select/copy, compare, and ordinary browser scrolling.

Gate thesis:

> Preserve cinematic personality; remove cinematic control.

## Verified production data shape — 2026-08-14

Materialized `project_sources` audit:

- projects: 343
- exactly one evidence item: 341
- two to three evidence items: 2
- four-plus evidence items: 0
- one-source projects: 341
- multi-source projects: 2
- maximum evidence count: 3
- maximum source count: 2

Metric-history coverage:

- items with 2+ daily snapshots: 61
- items with 7+ daily snapshots: 21
- maximum daily snapshots: 8

Score-component coverage:

- items with 4+ score dimensions: 224
- maximum score dimensions: 8

These numbers are current database observations, not permanent contracts.

## Lieflat audit

Primary upstream: `larashero3-dotcom/lieflat-charts`.

### L11 Trend Lineage — reject as default

Data contract: lifecycle event sequence with shipped / reworked / dormant / alive states.

Current Frontier Radar data does not contain a trustworthy long-running lifecycle event history for most Projects. Eight days of snapshots is not a product lineage. Do not imply one.

### L3 Barcode Lollipop — reject as default

Data contract: roughly 90 daily readings with one hairline per calendar day.

Current metric history tops out at eight days. Stretching it into the L3 visual would imply history that does not exist.

### L5 Radial Convergence — reject as default

Data contract: many real records assigned to a few real themes / hubs, without dropping detail.

341 / 343 current Projects are one-source, one-evidence. A convergence network would be decorative rather than informative for almost every Project.

### F2 Hairline Line — selected conditional history visual

Data contract: daily series up to roughly 30 days; every date stays explicit.

This is the honest Lieflat shape for the current 2–8 day metric-history window. Render it only when enough snapshots exist. If only one snapshot exists, say so instead of drawing a fake trend.

### Tick Rows / record grammar — selected score comparison candidate

Current scoring has up to eight normalized dimensions. A compact horizontal record/tick treatment fits the dimensional count if the unit conversion is explicitly stated and does not imply raw observations.

## Project Research Mode interaction contract

- normal browser scrolling; never globally hijack the wheel
- five-stage index is navigation, not a gesture controller
- all five stages exist in one continuous document
- stage headings remain explicit and copyable
- evidence is rendered as evidence records, not tunnel cards
- epistemic labels stay visible: `OBSERVED`, `INFERENCE`, `OPEN QUESTION`
- sparse evidence remains visibly sparse
- Project source link remains a real source handoff
- Project → Idea Lab remains `/idea-lab?from=<id>`
- charts appear only when the actual data shape supports them

## Accepted composition

### 01 CAPTURE
Compact dossier header: title, summary, source/content type, first-seen date, verdict, score, code/demo/source counts, Project / Idea Lab actions.

### 02 EVIDENCE
Evidence ledger. One row per real source item. Where 2+ metric snapshots exist, attach a small F2 Hairline Line for the metric history. One snapshot = explicit point-in-time state, no trend claim.

### 03 INTERROGATION
Editorial question ledger using existing structured analysis fields. Keep observed/inference/open-question distinctions visible.

### 04 RESOLUTION
Compact score-dimension evidence. Show normalized dimensions and rationales. No orbit / fake spatial semantics.

### 05 BUILD
Numbered build directions based only on actual `possibleUses`. Do not imply an experiment engine, autonomous builder, or export system.

## Non-goals / frozen boundaries

- no Project stage rename/reorder
- no schema changes
- no new recommender semantics
- no fake multi-source graph
- no fake long-term trend
- no broad reopening of Explore; the accepted exception above is now frozen
- no mobile work

## Delivery

Stacked branch: `agent/gate-15b-project-research-mode`
Base: `agent/gate-15a-lieflat-explore`

Delivery reached:

```text
Draft → CI PASS → Vercel Preview → owner visual approval
```

Next release actions, if any, require explicit owner instruction. No Production deployment is implied by visual acceptance.
