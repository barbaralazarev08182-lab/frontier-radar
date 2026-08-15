# Gate 17A — Today Intelligence Density Audit

> **SUPERSEDED IMPLEMENTATION NOTE — 2026-08-15**
>
> The data audit in this document remains valid, but the `shared Signal Dossier / inspection layer` implementation recommendation below was tried in Gate 17B v1 and **REJECTED by owner visual review**. Do not revive the floating/overlay dossier direction.
>
> Current design direction is defined in `docs/GATE_17A_R2_TODAY_INTELLIGENCE_RETHINK.md`: **the signal itself must become the deeper inspection state (Signal Cutaway), rather than receiving a separate inspector panel.**

Status: AUDIT PASS / implementation recommendation superseded by R2

## Objective

Deepen Today as a daily frontier-intelligence instrument without reopening the accepted cinematic composition, the seven-signal contract, or the final Signal Weave chapter.

The user question is not “how can Today show more cards?” It is:

> What deserves attention today, why does it matter now, why is it relevant to me, and what evidence makes the signal worth opening?

## Reopened scope

This Gate is a narrow owner-authorized exception to the previously accepted Today surface.

Allowed:
- increase information density and scanability inside the existing seven-signal experience;
- add progressive disclosure / inspection interaction for real signal intelligence;
- improve the connection between a selected signal and its existing evidence;
- strengthen state/motion only when it explains inspection or selection.

Frozen / not reopened:
- Explore;
- Project;
- Personal Radar;
- Today’s seven-signal selection contract;
- the existing scroll-driven tear / compression / deck / overview choreography;
- the final Signal Weave concept and its `7 signals → synthesis directions` role;
- ranking, personalization, discovery-lane, cross-source, and synthesis semantics.

No merge or Production deployment in this Gate.

## Current Today data contract

Today already derives substantially more intelligence than the current visual layer exposes.

For each selected signal, the server currently has:
- rank;
- title;
- summary;
- global/personalized score;
- source;
- content type;
- canonical URL;
- author;
- up to four tags;
- discovery lane: `core | adjacent | wildcard`;
- `whyNow`;
- `whyYou`;
- `buildIdea`;
- source-native metric label when available;
- cross-source confirmation;
- source count;
- code availability;
- demo availability.

The daily synthesis additionally maps the seven selected signals into 1–3 real generated directions with formation type and confidence.

## Current presentation gap

The production Motion Lab currently promotes mainly:
- rank;
- topic/lane label;
- title;
- score;
- source.

This means valuable already-computed fields such as `whyNow`, `whyYou`, build potential, cross-source confirmation, source count, code/demo evidence, and source-native metrics are mostly absent from the primary Today reading experience.

The density problem is therefore **not lack of data**. It is **loss of intelligence during presentation**.

## Lieflat audit

Upstream source of truth reviewed:
- `SKILL.md`;
- `catalog.md`.

### Candidate 1 — L5 Radial Convergence

Data shape: multi-to-one assignment while preserving individual records.

Fit:
- semantically excellent for `7 signals → 1–3 synthesis directions`;
- preserves individual signal identity;
- matches the relationship question honestly.

Decision:
- **do not introduce a second L5 chart**.
- The accepted Signal Weave already occupies this semantic role and adds truthful interaction around the generated synthesis directions.
- L5 therefore validates the current final chapter rather than justifying a replacement.

### Candidate 2 — L12 Type Colonnade

Data shape: multi-to-one grouping plus complete record list.

Fit:
- could show seven signals grouped by synthesis direction;
- would expose labels efficiently.

Rejection:
- converts Today into an audit/governance reading mode rather than a daily discovery experience;
- duplicates Explore’s already-used grammar;
- would repeat information already carried by the accepted Signal Weave;
- does not solve the missing `why now / why you / evidence` record-detail problem.

### Candidate 3 — L13 Hourglass Stream

Data shape: staged decreasing counts.

Fit:
- `candidate pool → 7 selected → 1 daily brief` is a truthful count funnel.

Rejection as main visual:
- useful only as a small macro process indicator;
- does not help inspect why any individual signal deserves attention;
- would add a second visual without solving the primary density gap.

### Candidate 4 — F5 Tick Rows / L2 Dot Cascade

Data shape: ranked comparison with countable units.

Rejection:
- Frontier score is not a countable unit and must not be decomposed into fake ticks/dots;
- source-native metrics are heterogeneous across GitHub, Hugging Face, Show HN, Product Hunt, and arXiv, so they cannot form one common count axis.

### Candidate 5 — F8 Plumb Scatter

Data shape: two honest continuous variables.

Rejection for this Gate:
- the current `EditorialSignal` surface does not expose a second comparable continuous dimension appropriate for all seven records;
- inventing a shared “quality”, “freshness”, or semantic coordinate would violate product truth.

## Lieflat decision

**No new full-size chart is justified for the primary density problem.**

The final relational chapter remains the accepted Signal Weave, whose semantics are validated by L5’s multi-to-one contract. Gate 17B should instead use progressive-disclosure product UI around the existing seven records.

This is a deliberate “no forced chart” result under the standing rule:

> If no honest visualization fits the decision, do not force one.

## Historical implementation recommendation — REJECTED / DO NOT IMPLEMENT

The following section is retained only as design history. Its proposed separate Dossier surface was implemented in Gate 17B v1, visually rejected, and rolled back. The current R2 direction is Signal Cutaway: transform the primary signal object itself.

### 1. Keep the seven signals as the primary physical objects

Do not add a second list, bento grid, or dashboard card wall.

### 2. Add one shared Signal Dossier / inspection layer — REJECTED

This recommendation is superseded. Do not implement a floating, fixed, overlay or sidebar Dossier.

Historical intent was to expose:
- `WHY NOW`;
- `WHY YOU`;
- one build/use idea when available;
- source-native metric;
- cross-source confirmation + source count;
- `CODE` / `DEMO` evidence;
- source and content type.

R2 keeps the data goals but moves them into the transformed signal object itself.

### 3. Progressive disclosure, not permanent density

Default state remains cinematic and scannable.

Inspection state may increase density strongly, but only around the selected record. Other signals should remain spatial context rather than becoming duplicated text.

### 4. Motion must carry state meaning

Allowed motion:
- selected signal visibly carries its identity into the deeper state;
- copy transitions with fast-in / fast-stop continuity;
- evidence marks may reveal only when they represent real evidence;
- scroll choreography remains unchanged.

Avoid decorative motion unrelated to inspection.

### 5. Signal Weave remains the synthesis chapter

Do not repeat `7 → directions` upstream in another chart. The inspection state answers record-level intelligence; Signal Weave answers cross-record synthesis.

## Acceptance criteria — superseded by R2 prototype process

The original machine criteria remain relevant for any later integration:
- Today still selects exactly seven signals where available;
- no ranking or personalization mutation;
- keyboard path works;
- reduced-motion path remains valid;
- current Today browser choreography and Signal Weave integration tests remain green.

Visual acceptance is now governed by R2 and must happen on an isolated visual prototype before `/today` is modified.

## Gate result

Gate 17A data audit = PASS.

Gate 17A Dossier implementation recommendation = **SUPERSEDED / REJECTED**.

Current next Gate if approved: **Gate 17B-R2.1 — Signal Cutaway Visual Prototype**.
