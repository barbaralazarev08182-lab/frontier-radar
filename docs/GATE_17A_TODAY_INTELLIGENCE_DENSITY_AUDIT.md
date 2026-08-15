# Gate 17A — Today Intelligence Density Audit

Status: AUDIT PASS / implementation not started

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

## Recommended implementation contract for Gate 17B

### 1. Keep the seven signals as the primary physical objects

Do not add a second list, bento grid, or dashboard card wall.

### 2. Add one shared Signal Dossier / inspection layer

When a signal is hovered, focused, or deliberately held, expose a single shared inspection surface containing only real fields:
- `WHY NOW`;
- `WHY YOU`;
- one build/use idea when available;
- source-native metric;
- cross-source confirmation + source count;
- `CODE` / `DEMO` evidence;
- source and content type.

The dossier should update in place as signal identity changes rather than spawning seven separate panels.

### 3. Progressive disclosure, not permanent density

Default state remains cinematic and scannable.

Inspection state may increase density strongly, but only around the selected record. Other signals should remain spatial context rather than becoming duplicated text.

### 4. Motion must carry state meaning

Allowed motion:
- selected signal visibly hands its identity into the dossier;
- dossier copy transitions with fast-in / fast-stop continuity;
- evidence marks may light or trace when they become relevant;
- scroll choreography remains unchanged.

Avoid decorative motion unrelated to inspection.

### 5. Signal Weave remains the synthesis chapter

Do not repeat `7 → directions` upstream in another chart. The dossier answers record-level intelligence; Signal Weave answers cross-record synthesis.

## Acceptance criteria for Gate 17B

Machine:
- Today still selects exactly seven signals where available;
- no ranking or personalization mutation;
- keyboard inspection works;
- no duplicate navigation or accidental click-through while interacting with dossier controls;
- reduced-motion path remains valid;
- current Today browser choreography and Signal Weave integration tests remain green.

Visual:
- user can identify a signal and discover `why now / why you / evidence` without leaving Today;
- default page does not look more cluttered than the accepted version;
- inspection state feels materially richer and more designed, not like a generic tooltip/card;
- one signal’s intelligence is readable in a few seconds;
- Signal Weave still feels like the natural final synthesis chapter.

## Gate result

Gate 17A = PASS.

Next Gate, if continued: **Gate 17B — Today Signal Dossier / Intelligence Density v1**.
